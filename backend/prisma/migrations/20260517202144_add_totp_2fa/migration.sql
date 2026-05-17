-- AlterTable
ALTER TABLE "users" ADD COLUMN     "totp_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totp_secret" TEXT;
