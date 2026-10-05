# renode

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
