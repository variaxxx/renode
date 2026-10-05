-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('RUB', 'USD', 'EUR');

-- AlterTable
ALTER TABLE "server" ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
