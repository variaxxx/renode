ALTER TABLE "payment" ADD COLUMN "request_key" UUID,
 ADD COLUMN "previous_payment_date" DATE,
 ADD COLUMN "cancelled_at" TIMESTAMP(3),
 ADD COLUMN "cancellation_reason" VARCHAR(500);
CREATE UNIQUE INDEX "payment_request_key_key" ON "payment"("request_key");
CREATE TABLE "worker_heartbeat" (
 "id" TEXT PRIMARY KEY, "last_cycle_at" TIMESTAMPTZ(3) NOT NULL,
 "last_success_at" TIMESTAMPTZ(3), "last_error" VARCHAR(500)
);
