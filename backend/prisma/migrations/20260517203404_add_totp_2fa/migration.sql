-- AlterTable: adiciona colunas de 2FA TOTP para super_admin
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_ativo" BOOLEAN NOT NULL DEFAULT false;
