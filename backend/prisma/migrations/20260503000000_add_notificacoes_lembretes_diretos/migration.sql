-- AlterTable: adiciona campo lembretes_diretos_ativo no tenant
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "lembretes_diretos_ativo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: notificacoes
CREATE TABLE IF NOT EXISTS "notificacoes" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notificacoes_tenant_id_lida_idx" ON "notificacoes"("tenant_id", "lida");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
