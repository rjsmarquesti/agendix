ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "ciclo_bilhagem" VARCHAR(10) NOT NULL DEFAULT 'mensal';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "renovacao_email_enviado_em" TIMESTAMP;
