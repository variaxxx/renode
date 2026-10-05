CREATE TABLE "notification_settings" (
 "owner_id" UUID NOT NULL,
 "chat_id" VARCHAR(20),
 "thread_id" INTEGER,
 "timezone" VARCHAR(100) NOT NULL DEFAULT 'Europe/Moscow',
 "payment_intervals" INTEGER[] NOT NULL DEFAULT ARRAY[7,3,1,0]::INTEGER[],
 "rental_end_intervals" INTEGER[] NOT NULL DEFAULT ARRAY[7,3,1,0]::INTEGER[],
 "cancellation_intervals" INTEGER[] NOT NULL DEFAULT ARRAY[7,3,1,0]::INTEGER[],
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("owner_id"),
 CONSTRAINT "notification_settings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
