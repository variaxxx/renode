CREATE TYPE "NotificationEventType" AS ENUM ('PAYMENT', 'RENTAL_END', 'CANCELLATION');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'RETRY', 'SENT', 'FAILED');
CREATE TABLE "notification_delivery" (
  "id" UUID NOT NULL,
  "server_id" UUID NOT NULL,
  "event_type" "NotificationEventType" NOT NULL,
  "event_date" DATE NOT NULL,
  "interval" INTEGER NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMPTZ(3),
  "last_error" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_delivery_interval_check" CHECK ("interval" BETWEEN 0 AND 365),
  CONSTRAINT "notification_delivery_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "server"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notification_delivery_server_id_event_type_event_date_interval_key" ON "notification_delivery"("server_id", "event_type", "event_date", "interval");
CREATE INDEX "notification_delivery_status_next_attempt_at_idx" ON "notification_delivery"("status", "next_attempt_at");
