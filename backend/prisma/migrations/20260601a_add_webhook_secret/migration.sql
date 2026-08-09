-- Sprint 1 Segurança: campo webhook_secret no Tenant (criptografado AES-256 via encrypt.js)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "webhook_secret" TEXT;
