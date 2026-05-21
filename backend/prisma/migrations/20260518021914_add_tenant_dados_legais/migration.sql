-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cadastro_completo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "razao_social" TEXT,
ADD COLUMN     "telefone" TEXT;
