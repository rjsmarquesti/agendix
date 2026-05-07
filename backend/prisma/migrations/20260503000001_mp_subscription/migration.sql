-- Substituir campo asaas_customer_id por campos Mercado Pago
ALTER TABLE "tenants" RENAME COLUMN "asaas_customer_id" TO "mp_customer_id";

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "mp_subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "mp_plan_id" TEXT;
