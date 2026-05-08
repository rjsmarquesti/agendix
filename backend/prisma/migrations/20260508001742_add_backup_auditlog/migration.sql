-- CreateTable
CREATE TABLE "backups" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "tenant_id" INTEGER,
    "nome_arquivo" TEXT NOT NULL,
    "tamanho_bytes" INTEGER,
    "descricao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT,
    "entidade_id" TEXT,
    "tenant_id" INTEGER,
    "user_id" INTEGER,
    "ip" TEXT,
    "detalhes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backups_tipo_idx" ON "backups"("tipo");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_acao_idx" ON "audit_logs"("acao");

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
