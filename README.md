# Renode

Личная веб-панель для учёта арендованных серверов и расходов на инфраструктуру.

- Каталог провайдеров и серверов: тарифы, сроки аренды, проекты и теги.
- История платежей, прогноз расходов и CSV-импорт/экспорт.
- Telegram-напоминания об оплате, окончании аренды и сроке отмены.
- Хранилище паролей провайдеров с шифрованием в браузере и отдельным мастер-паролем.

Приложение рассчитано на одного владельца, публичной регистрации нет.
Стек: React, NestJS, Prisma, PostgreSQL и Bun. Напоминания обрабатывает отдельный worker.

## Локальный запуск

Нужны **Bun 1.4.2** и **Docker с Compose v2**. Команды выполняются из корня проекта.

### 1. Зависимости и настройки

```sh
bun install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
```

В `apps/backend/.env` замените пароль в `POSTGRES_PASSWORD` и `DATABASE_URL` на одинаковое значение. Спецсимволы в пароле внутри URL должны быть URL-кодированы. Для стандартного запуска оставьте `FRONTEND_ORIGIN=http://127.0.0.1:5173`.

### 2. База данных

```sh
docker compose --env-file apps/backend/.env up -d --wait db
bun run --cwd apps/backend db:generate
(cd apps/backend && bun --env-file=.env run db:migrate:deploy)
```

PostgreSQL доступен на `127.0.0.1:55432`; данные сохраняются в Docker volume.

### 3. Создание владельца

Выполните один раз в **Bash**. Пароль должен содержать 12–256 символов.

```bash
read -r -s -p 'Пароль владельца: ' owner_password
printf '\n'
printf '%s\n' "$owner_password" | bun run --cwd apps/backend owner:create
unset owner_password
```

### 4. Запуск приложения

В отдельных терминалах:

```sh
bun run --cwd apps/backend dev:api
```

```sh
bun run --cwd apps/backend dev:worker
```

```sh
bun run --cwd apps/frontend dev
```

Откройте **http://127.0.0.1:5173** и войдите с паролем владельца. Frontend проксирует API на порт `3000`.

Для Telegram задайте `TELEGRAM_BOT_TOKEN` в backend `.env`, перезапустите worker и API, затем укажите chat ID и интервалы в **Настройках**. Без токена отправка отключена.

Хранилище паролей создаётся отдельно в интерфейсе. Сохраните ключ восстановления: при потере и мастер-пароля, и ключа расшифровать секреты невозможно.

Остановка базы с сохранением данных:

```sh
docker compose --env-file apps/backend/.env stop db
```

## Проверки

```sh
bun run lint
bun run format:check
bun run build
```

Развёртывание на сервере: [инструкция по деплою](deploy/README.md).
