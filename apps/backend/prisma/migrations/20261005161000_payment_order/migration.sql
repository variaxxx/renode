ALTER TABLE "payment" ADD COLUMN "ledger_sequence" SERIAL NOT NULL,
 ADD COLUMN "previous_payment_id" UUID;
CREATE UNIQUE INDEX "payment_ledger_sequence_key" ON "payment"("ledger_sequence");
