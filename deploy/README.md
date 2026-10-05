# Деплой Renode

Нужны **Docker Engine с Compose v2** и Traefik перед приложением. Nginx раздаёт frontend и проксирует `/api/` в backend по HTTP; HTTPS и сертификаты настраиваются в Traefik. Все команды выполняются из корня проекта.

## Настройки

```sh
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
```

Заполните `deploy/.env`:

| Переменная | Значение |
| --- | --- |
| `DOMAIN` | Домен без протокола и пути, например `renode.example.com` |
| `HTTP_BIND`, `HTTP_PORT` | HTTP upstream для Traefik, по умолчанию `127.0.0.1:8080` |
| `POSTGRES_USER`, `POSTGRES_DB` | Пользователь и имя базы |
| `POSTGRES_PASSWORD` | Уникальный пароль базы |
| `DATABASE_URL` | Подключение с тем же паролем, хостом `db` и портом `5432` |
| `TELEGRAM_BOT_TOKEN` | Токен бота или пустое значение для отключения отправки |
| `BACKEND_IMAGE`, `WEB_IMAGE` | Обязательно: пара готовых образов — локальных или из GHCR; для GHCR используйте одинаковый тег `sha-<полный SHA коммита>` |

Спецсимволы пароля в `DATABASE_URL` должны быть URL-кодированы. Не коммитьте `.env`. `FRONTEND_ORIGIN` задаётся Compose автоматически по домену.

Направьте HTTPS-роутер Traefik для `DOMAIN` на `http://127.0.0.1:8080`, если Traefik работает на хосте. Если Traefik работает в Docker, подключите его к общей сети с сервисом `web` и используйте `http://web:80`: `127.0.0.1` внутри контейнера указывает на сам контейнер. Traefik должен передавать исходный `Host` и `X-Forwarded-Proto: https`.

## Локальная сборка образов

Соберите оба образа из корня проекта:

```sh
docker build --target backend -t renode-backend:local .
docker build --target web -t renode-web:local .
```

В `deploy/.env` укажите полученные теги:

```dotenv
BACKEND_IMAGE=renode-backend:local
WEB_IMAGE=renode-web:local
```

Запустите приложение на том же Docker Engine без загрузки образов приложения из реестра:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml up -d --wait
```

При обновлении локальных образов повторите обе команды `docker build`, затем выполните команды остановки сервисов, миграции и запуска из раздела «Обновление», пропустив `pull`.

## Первый запуск

Production Compose использует только готовые образы. Для образов из GHCR укажите `BACKEND_IMAGE` и `WEB_IMAGE` и выполните:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml pull
docker compose --env-file deploy/.env -f compose.production.yaml up -d --wait
```

Образы публикуются в GHCR при push в `main`: `ghcr.io/<owner>/<repository>-backend` и `ghcr.io/<owner>/<repository>-web` (имена в нижнем регистре). Для закрытых пакетов предварительно выполните `docker login ghcr.io` с токеном `read:packages`.

Миграции выполняются сервисом `migrate` перед запуском API и worker.

Создайте единственного владельца один раз, в **Bash** (пароль 12–256 символов):

```bash
read -r -s -p 'Пароль владельца: ' owner_password
printf '\n'
printf '%s\n' "$owner_password" | docker compose --env-file deploy/.env -f compose.production.yaml run --rm -T --no-deps api bun run owner:create
unset owner_password
```

Откройте `https://<DOMAIN>` и войдите. Для Telegram укажите chat ID, необязательный thread ID, часовой пояс и интервалы в **Настройках**, затем отправьте тестовое сообщение. Бот должен иметь доступ к выбранному чату.

## Проверка

```sh
docker compose --env-file deploy/.env -f compose.production.yaml ps -a
docker compose --env-file deploy/.env -f compose.production.yaml logs --tail=100 api worker web
curl --fail https://renode.example.com/api/health
```

В команде `curl` подставьте свой домен. `migrate` должен завершиться с кодом `0`, остальные сервисы — работать.

## Обновление

Перед обновлением сохраните резервную копию. Backend и frontend обновляйте вместе.

Для GHCR выберите новую пару SHA-тегов в `.env` и загрузите образы:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml pull
```

Затем:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml stop worker api
docker compose --env-file deploy/.env -f compose.production.yaml run --rm --no-deps migrate
docker compose --env-file deploy/.env -f compose.production.yaml up -d --wait
```

Если миграция завершилась с ошибкой, устраните причину до запуска приложения. Откат образов допустим только при совместимой схеме базы.

## Резервная копия

```sh
mkdir -p backups
chmod 700 backups
umask 077
backup_file="backups/renode-$(date +%Y%m%d-%H%M%S).dump"
docker compose --env-file deploy/.env -f compose.production.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_file"
test -s "$backup_file"
```

Проверьте успешное завершение `pg_dump`. Храните копии вне сервера и периодически проверяйте восстановление. Копия базы не заменяет мастер-пароль или ключ восстановления хранилища.

Для восстановления запустите только `db` в новом окружении с пустой базой и восстановите выбранный dump:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml up -d --wait db
docker compose --env-file deploy/.env -f compose.production.yaml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error' < backups/renode-YYYYMMDD-HHMMSS.dump
```

После успешного восстановления примените миграции и запустите приложение. Не восстанавливайте dump поверх рабочей базы.

**Не выполняйте `down -v` на сервере:** команда удаляет данные PostgreSQL. Изменение пароля в `.env` не меняет пароль в уже созданной базе — его нужно менять также в PostgreSQL.
