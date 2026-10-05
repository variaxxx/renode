CREATE TABLE "vault" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vault_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "provider_secret" (
    "provider_id" UUID NOT NULL,
    "vault_id" UUID NOT NULL,
    "encrypted" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_secret_pkey" PRIMARY KEY ("provider_id")
);
CREATE UNIQUE INDEX "vault_owner_id_key" ON "vault"("owner_id");
CREATE INDEX "provider_secret_vault_id_idx" ON "provider_secret"("vault_id");
ALTER TABLE "vault" ADD CONSTRAINT "vault_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_secret" ADD CONSTRAINT "provider_secret_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_secret" ADD CONSTRAINT "provider_secret_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
