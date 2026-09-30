-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "server" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "purpose" VARCHAR(500) NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "tariff" VARCHAR(160) NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "billing_period_months" INTEGER NOT NULL,
    "next_payment_date" DATE,
    "rental_end_date" DATE,
    "cancellation_deadline" DATE,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR(45),
    "domain" VARCHAR(253),
    "project" VARCHAR(160),
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "server_provider_id_idx" ON "server"("provider_id");
CREATE INDEX "server_status_next_payment_date_idx" ON "server"("status", "next_payment_date");
CREATE INDEX "server_project_idx" ON "server"("project");

-- AddForeignKey
ALTER TABLE "server" ADD CONSTRAINT "server_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
