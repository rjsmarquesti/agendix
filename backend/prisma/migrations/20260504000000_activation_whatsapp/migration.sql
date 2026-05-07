-- AddColumn: activation token no User
ALTER TABLE "users" ADD COLUMN "activation_token"   TEXT;
ALTER TABLE "users" ADD COLUMN "activation_expires" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "whatsapp"           TEXT;

-- AddColumn: whatsapp do responsável no Tenant
ALTER TABLE "tenants" ADD COLUMN "whatsapp_responsavel" TEXT;
