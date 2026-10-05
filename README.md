# renode

## Production deployment

See [deployment instructions](deploy/README.md) for HTTPS, Docker/GHCR images,
owner and Telegram setup, migrations, PostgreSQL backups and recovery.

## Local development

1. Run `bun install --frozen-lockfile`.
2. Copy `apps/backend/.env.example` to `apps/backend/.env` and replace the password placeholder with a unique local password in both `POSTGRES_PASSWORD` and `DATABASE_URL`. Set `FRONTEND_ORIGIN` to the frontend's exact origin when it runs on a separate port or host.
3. Start PostgreSQL with `docker compose --env-file apps/backend/.env up -d --wait db`.
4. Generate the client with `bun run --cwd apps/backend db:generate`. Apply migrations from `apps/backend` with `bun --env-file=.env run db:migrate:deploy`.
5. Start the API and worker separately with `bun run --cwd apps/backend start:api` and `bun run --cwd apps/backend start:worker`.

The local PostgreSQL data lives in the `renode-local_postgres_data` Docker volume. The database is exposed only on `127.0.0.1`, port `55432` by default. Run `bun run lint`, `bun run format:check`, and `bun run build` from the repository root for checks.

## Owner setup

Run `bun run --cwd apps/backend owner:create` and enter a password through stdin to create the single owner. The password must contain 12–256 characters. Sign in at `POST /auth/login`; the response sets a secure session cookie and returns a CSRF token. Send that token in `X-CSRF-Token` for authenticated write requests. `GET /auth/session` returns the current CSRF token, and `POST /auth/logout` ends the session.

## Vault API

All vault routes require the owner session, return `Cache-Control: no-store`, and require `X-CSRF-Token` on writes:

- `GET /vault` returns encrypted metadata, or JSON `null` before setup.
- `POST /vault` creates the vault once using the versioned `VaultMetadata` format from `apps/frontend/src/features/vault/lib/crypto.ts`.
- `PATCH /vault/master` accepts `{ "master": <new master wrapper> }` after a client-side password change or recovery. It preserves the recovery wrapper and provider ciphertexts.
- `GET /vault/providers/:providerId/secret` returns the versioned `Ciphertext` envelope, or JSON `null` when no password is stored.
- `PUT /vault/providers/:providerId/secret` accepts that ciphertext envelope and returns `204`.

Nested DTO validation rejects unknown fields, unsupported formats, malformed base64url, and invalid nonce, salt or DEK-wrapper lengths. Never send master passwords, recovery keys, unwrapped DEKs or provider plaintext passwords. Vault setup conflicts return `VAULT_ALREADY_EXISTS`; secret operations before setup return `VAULT_NOT_FOUND`. Deleting an eligible provider also deletes its encrypted password.

Group 10 was manually verified against local PostgreSQL and the API: metadata and ciphertext round trips, foreign-key relations, session/CSRF protection, plaintext-field rejection, password change and recovery with unchanged provider ciphertext, and provider deletion cascade. Temporary verification data was removed.

## Vault interface

Open **Хранилище** to create a separate master password. Setup sends encrypted metadata only after you confirm saving the recovery key; the key is shown only during this setup step. Unlocking is separate from owner sign-in and applies only to the current tab. Reloading, leaving the document, signing out or an expired session removes its open key.

In **Провайдеры**, use **Сохранить новый пароль**, **Показать пароль** and **Скрыть** for the account password. Locking the vault removes visible passwords and secret inputs. Provider notes remain unencrypted. Password changes and recovery use **Хранилище** and preserve existing encrypted provider passwords and the recovery wrapper.

Group 11 was manually checked in Chrome with an isolated local fixture API: setup confirmation and one-time key display, invalid master-password rejection, unlock/lock, provider save/reveal/hide, reload while signed in, logout and repeated sign-in with the vault locked, master-password changes and recovery with access to an old provider password. Recorded vault requests contained encrypted envelopes only; provider ciphertext was saved once and remained unchanged during rewrapping. The interface was visually checked in the dark theme.

## Payments API

Payment routes require an owner session, return `Cache-Control: no-store`, and require `X-CSRF-Token` on writes:

- `POST /servers/:id/payments` accepts `{ "paymentDate": "2026-10-05", "amount": "123.45", "currency": "USD", "nextPaymentDate": "2026-11-05" }`. Amounts are nonnegative decimal strings with at most two fractional digits; currencies are `RUB`, `USD` or `EUR`. Dates are valid `YYYY-MM-DD` calendar dates. The payment snapshot and next payment date are committed atomically; rental expiry is unchanged.
- `GET /servers/:id/payments` returns immutable snapshots ordered by payment date, creation time and ID, newest first. Changing the server's tariff, cost or currency does not change recorded payments. A server with history cannot be deleted (`SERVER_HAS_PAYMENTS`); archive it instead.
- `GET /payments/overview` returns `asOfDate`, `overdue`, `upcoming7Days`, `upcoming30Days` and `expected`. Each group contains server summaries and exact decimal `totals` per currency. Upcoming windows include today and the date 7/30 days ahead; overdue means before today. The current calendar date uses UTC. `expected` sums each active server's current period price once, without converting currencies or normalizing billing periods. Archived servers are excluded from every overview group.

Group 12 was manually verified against local PostgreSQL and a temporary API instance: migration, exact fractional amounts, atomic rollback after a failed payment insertion, updated payment deadline with unchanged rental expiry, historical amounts and currencies after tariff changes, deletion restriction, session/CSRF protection, DTO rejection, missing servers, 7/30-day boundaries, overdue dates, per-currency totals and archive exclusion. Temporary verification records were removed.

## Payments interface

Use **Оплачено** in a server card to record the actual payment date, decimal amount, currency and next payment date. The suggested date advances the current payment deadline by the server's billing period and clamps to the last day of the target month. All fields remain editable; confirm them with the checkbox before submitting. Changing a field clears confirmation. Recording a payment refreshes the card and its history while preserving rental expiry. History uses each payment's stored amount and currency, independently of the current tariff.

The **Обзор** home page shows overdue deadlines, payments within 7/30 days and expected expenses separately for each currency, with links to server cards. It includes loading, retry and empty states and displays the UTC calendar date used by the API.

Group 13 was manually checked in Chrome using the production frontend build and an isolated local fixture API: empty history, disabled submission before confirmation, decimal input normalization, January 31 to February 28 suggestion, saved payment and refreshed deadline, historical amount retained after changing the tariff, and filled/empty overview states with separate currency totals. The populated overview was visually checked in the dark theme. No production records were changed.
