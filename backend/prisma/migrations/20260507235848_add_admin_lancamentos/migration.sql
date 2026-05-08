-- CreateTable
CREATE TABLE "admin_lancamentos" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TEXT NOT NULL,
    "categoria" TEXT,
    "status" "StatusPagamento" NOT NULL DEFAULT 'pago',
    "tenant_id" INTEGER,
    "referencia" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_lancamentos_data_idx" ON "admin_lancamentos"("data");

-- CreateIndex
CREATE INDEX "admin_lancamentos_tipo_idx" ON "admin_lancamentos"("tipo");

-- AddForeignKey
ALTER TABLE "admin_lancamentos" ADD CONSTRAINT "admin_lancamentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
