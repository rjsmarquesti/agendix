-- AlterEnum: add 'business' to Plano
ALTER TYPE "Plano" ADD VALUE 'business';

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('receita', 'despesa');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('pago', 'pendente', 'cancelado');

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TEXT NOT NULL,
    "categoria" TEXT,
    "status" "StatusPagamento" NOT NULL DEFAULT 'pendente',
    "lead_id" INTEGER,
    "servico_id" INTEGER,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_tenant_id_data_idx" ON "lancamentos_financeiros"("tenant_id", "data");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_tenant_id_tipo_idx" ON "lancamentos_financeiros"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_tenant_id_status_idx" ON "lancamentos_financeiros"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
