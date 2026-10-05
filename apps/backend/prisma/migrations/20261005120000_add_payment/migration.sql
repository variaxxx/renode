CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "server_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "next_payment_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_amount_nonnegative" CHECK ("amount" >= 0)
);
CREATE INDEX "payment_server_id_payment_date_idx" ON "payment"("server_id", "payment_date");
ALTER TABLE "payment" ADD CONSTRAINT "payment_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
