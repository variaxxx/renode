-- CreateTable
CREATE TABLE "provider" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "account_url" VARCHAR(2048) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_pkey" PRIMARY KEY ("id")
);
