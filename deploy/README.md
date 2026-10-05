# Production deployment

## Configuration and first start

Requires Docker Engine with Compose v2, a domain pointing to the server and incoming TCP ports 80/443. Caddy obtains and renews HTTPS certificates and redirects HTTP to HTTPS. Only Caddy publishes ports; PostgreSQL and the API stay on the Compose network. Certificate state and PostgreSQL data use persistent volumes.

From the repository root:

```sh
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
```

Set `DOMAIN` to a hostname without a scheme or path. Replace `POSTGRES_PASSWORD` and the password in `DATABASE_URL`; URL-encode special characters in the URL password. The database host is `db`, port `5432`. Set the Telegram token or leave `TELEGRAM_BOT_TOKEN` empty to disable sending. Never commit `deploy/.env`.

Build and start from a clean checkout:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml build
docker compose --env-file deploy/.env -f compose.production.yaml up -d --wait
docker compose --env-file deploy/.env -f compose.production.yaml ps -a
curl --fail https://renode.example.com/api/health
curl --head https://renode.example.com/
```

The Dockerfile pins Bun 1.4.2, installs with `bun install --frozen-lockfile`, runs lint/format/build checks and generates Prisma Client. API and worker use the same backend image and run as the `bun` user. The one-shot `migrate` service applies committed migrations before either process starts. The web image includes the built frontend and Caddy configuration. Keep the domain and `FRONTEND_ORIGIN` aligned; Compose sets the latter automatically.

CSP permits only same-origin scripts and API connections. `wasm-unsafe-eval` supports the local Argon2 WebAssembly module; JavaScript eval and third-party scripts remain blocked. Inline styles are allowed for UI component positioning, and HTTPS images support provider favicons. The web server also sends HSTS, no-referrer, nosniff and frame restrictions. CSP applies to all screens, including the vault. Store master passwords and recovery keys only with the owner; backups do not replace a missing vault recovery key.

## Owner and Telegram

Create the single owner after the migrations finish. Read the password without placing it in shell history or command arguments (Bash):

```bash
read -r -s -p 'Owner password: ' owner_password
printf '\n'
printf '%s\n' "$owner_password" | docker compose --env-file deploy/.env -f compose.production.yaml run --rm -T --no-deps api bun run owner:create
unset owner_password
```

The password must contain 12–256 characters. A second creation attempt is rejected. Open the HTTPS site and sign in; session cookies require HTTPS. Create the vault separately and save the recovery key before confirming setup.

Create a Telegram bot through BotFather and put its token in `deploy/.env`. For a private chat, send the bot a message first; for a group, add it and grant permission to send. Obtain the destination chat ID from Telegram's Bot API `getUpdates` without exposing the token in shared logs. A forum topic also needs its `message_thread_id`. In **Настройки**, enter the chat ID, optional thread ID, time zone and reminder intervals, save, then send a test message. There is no application `/start` linking flow. Check that the test arrives at the intended destination. The worker sends reminders at 09:00 in the selected time zone and retries temporary failures.

## GHCR and updates

`.github/workflows/images.yaml` builds and publishes two images on each push to `main` (also supports manual dispatch):

- `ghcr.io/<owner>/<repository>-backend:latest` and `:sha-<full-commit-sha>`
- `ghcr.io/<owner>/<repository>-web:latest` and `:sha-<full-commit-sha>`

Names are normalized to lowercase. Publishing uses the workflow's `GITHUB_TOKEN` with `packages: write`; no registry password secret is required. The workflow publishes images and does not connect to a deployment server.

Set `BACKEND_IMAGE` and `WEB_IMAGE` to the same immutable SHA release in `deploy/.env`. For private packages, authenticate the server with a token allowed to read those packages (`read:packages`) through `docker login ghcr.io --password-stdin`. Then:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml pull
docker compose --env-file deploy/.env -f compose.production.yaml stop worker api
# Make the backup described below before applying new migrations.
docker compose --env-file deploy/.env -f compose.production.yaml run --rm --no-deps migrate
docker compose --env-file deploy/.env -f compose.production.yaml up -d --no-build --wait
```

Changing an existing database password in the environment does not change the password inside an initialized PostgreSQL volume; rotate it explicitly in PostgreSQL as well. Do not use `down -v` on the deployment: it removes persistent data and certificates. To restart while preserving data:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml restart db api worker web
```

For an application rollback, stop the worker and API, take a backup, select the previous image pair, then start again. Do not assume migrations are reversible; an incompatible schema requires a planned database restore or corrective migration.

## Backup and restore

Backups contain owner/session data, ordinary inventory and payment metadata, vault wrappers and encrypted provider passwords. Protect them as sensitive files and copy them to encrypted storage outside the server. Schedule regular backups using these commands, retain multiple generations and regularly restore into an isolated database.

Create a consistent custom-format backup (no host PostgreSQL tools required):

```sh
mkdir -p backups
chmod 700 backups
umask 077
docker compose --env-file deploy/.env -f compose.production.yaml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/renode.dump
test -s backups/renode.dump
```

Use a distinct timestamped filename for each real backup and check the command exit status before retaining or uploading it. A failed dump must not replace the last good backup.

Validate recovery into a separate, empty database while leaving the live database untouched:

```sh
docker compose --env-file deploy/.env -f compose.production.yaml exec -T db sh -c 'createdb -U "$POSTGRES_USER" renode_restore_check'
docker compose --env-file deploy/.env -f compose.production.yaml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d renode_restore_check --no-owner --no-acl --exit-on-error' < backups/renode.dump
docker compose --env-file deploy/.env -f compose.production.yaml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d renode_restore_check -c "SELECT count(*) FROM _prisma_migrations;"'
```

Compare table counts and representative providers, servers, payments and vault ciphertexts with the source. For a full recovery drill, run a separate Compose project against the restored data, sign in and unlock a saved secret; keep its worker stopped to avoid duplicate Telegram messages. Remove the disposable restore database only after verification.

For disaster recovery, use a fresh deployment/volume with the original database credentials and matching image pair. Start only `db`, restore the dump into the empty target database with `pg_restore --no-owner --no-acl --exit-on-error`, then apply migrations and start the application. If the target contains application tables, stop and choose a fresh database rather than restoring over existing data. Confirm inventory, payments, login, vault unlock and Telegram settings before starting the worker.

## Verification

See [verification record](verification.md) for the actual checks performed for group 16. A successful workflow run and public certificate issuance must also be checked in the target GitHub repository and deployment environment.
