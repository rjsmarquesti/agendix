-- CreateEnum
CREATE TYPE "StatusFila" AS ENUM ('aguardando', 'em_atendimento', 'encerrado', 'abandonado');

-- CreateEnum
CREATE TYPE "DirecaoMsg" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "FonteMsg" AS ENUM ('bot', 'humano', 'gemini');

-- CreateTable
CREATE TABLE "wa_atendentes" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "carga_atual" INTEGER NOT NULL DEFAULT 0,
    "carga_maxima" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_atendentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_filas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "cliente_telefone" TEXT NOT NULL,
    "cliente_nome" TEXT,
    "atendente_id" INTEGER,
    "status" "StatusFila" NOT NULL DEFAULT 'aguardando',
    "aberta_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechada_em" TIMESTAMP(3),

    CONSTRAINT "wa_filas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_conversa_logs" (
    "id" SERIAL NOT NULL,
    "fila_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "direcao" "DirecaoMsg" NOT NULL,
    "de_telefone" TEXT NOT NULL,
    "para_telefone" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "atendente_id" INTEGER,
    "fonte" "FonteMsg" NOT NULL DEFAULT 'bot',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_conversa_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wa_atendentes_tenant_id_ativo_idx" ON "wa_atendentes"("tenant_id", "ativo");

-- CreateIndex
CREATE INDEX "wa_filas_tenant_id_status_idx" ON "wa_filas"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "wa_filas_tenant_id_aberta_em_idx" ON "wa_filas"("tenant_id", "aberta_em");

-- CreateIndex
CREATE INDEX "wa_conversa_logs_fila_id_idx" ON "wa_conversa_logs"("fila_id");

-- CreateIndex
CREATE INDEX "wa_conversa_logs_tenant_id_criado_em_idx" ON "wa_conversa_logs"("tenant_id", "criado_em");

-- AddForeignKey
ALTER TABLE "wa_atendentes" ADD CONSTRAINT "wa_atendentes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_filas" ADD CONSTRAINT "wa_filas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_filas" ADD CONSTRAINT "wa_filas_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "wa_atendentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_conversa_logs" ADD CONSTRAINT "wa_conversa_logs_fila_id_fkey" FOREIGN KEY ("fila_id") REFERENCES "wa_filas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
