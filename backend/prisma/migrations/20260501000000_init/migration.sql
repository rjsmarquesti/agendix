-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('basico', 'pro', 'premium');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'admin', 'atendente');

-- CreateEnum
CREATE TYPE "StatusLead" AS ENUM ('novo', 'contato', 'qualificado', 'proposta', 'agendado', 'convertido', 'perdido');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('baixa', 'normal', 'alta', 'urgente');

-- CreateEnum
CREATE TYPE "Fonte" AS ENUM ('google_maps', 'manual', 'csv_import', 'api');

-- CreateEnum
CREATE TYPE "StatusAgend" AS ENUM ('marcado', 'confirmado', 'cancelado', 'realizado');

-- CreateEnum
CREATE TYPE "CanalOrigem" AS ENUM ('manual', 'web', 'whatsapp');

-- CreateEnum
CREATE TYPE "EstadoConversa" AS ENUM ('inicio', 'aguardando_data', 'aguardando_slot', 'aguardando_nome', 'aguardando_confirmacao', 'concluida', 'cancelada');

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "cor_primaria" TEXT NOT NULL DEFAULT '#2563eb',
    "plano" "Plano" NOT NULL DEFAULT 'basico',
    "modulos" JSONB NOT NULL DEFAULT '["leads","agendamentos"]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "n8n_webhook_url" TEXT,
    "n8n_api_key" TEXT,
    "api_token" TEXT,
    "nicho_label" TEXT,
    "evolution_instance" TEXT,
    "evolution_api_key" TEXT,
    "evolution_base_url" TEXT,
    "plano_status" TEXT NOT NULL DEFAULT 'trial',
    "plano_vencimento" TIMESTAMP(3),
    "asaas_customer_id" TEXT,
    "n8n_workflow_wa_id" TEXT,
    "n8n_workflow_notif_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'atendente',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "telefone2" TEXT,
    "email" TEXT,
    "origem" TEXT,
    "status" "StatusLead" NOT NULL DEFAULT 'novo',
    "priority" "Priority" NOT NULL DEFAULT 'normal',
    "observacoes" TEXT,
    "fonte" "Fonte" NOT NULL DEFAULT 'manual',
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "nicho" TEXT,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "google_maps_url" TEXT,
    "place_id" TEXT,
    "rating" DOUBLE PRECISION,
    "reviews_count" INTEGER DEFAULT 0,
    "website" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "telegram" TEXT,
    "especialidades" TEXT,
    "disparo" TEXT,
    "mensagem" TEXT,
    "ultimo_contato" TIMESTAMP(3),
    "proximo_contato" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "servico_id" INTEGER,
    "data" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT DEFAULT 'reunião',
    "status" "StatusAgend" NOT NULL DEFAULT 'marcado',
    "observacoes" TEXT,
    "canal_origem" "CanalOrigem" NOT NULL DEFAULT 'manual',
    "cliente_nome" TEXT,
    "cliente_telefone" TEXT,
    "lembrete_enviado" BOOLEAN NOT NULL DEFAULT false,
    "lembrete_3d_enviado" BOOLEAN NOT NULL DEFAULT false,
    "lembrete_1d_enviado" BOOLEAN NOT NULL DEFAULT false,
    "lembrete_dia_enviado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "duracao_min" INTEGER NOT NULL DEFAULT 60,
    "preco" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios_horario" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "hora_inicio" TEXT,
    "hora_fim" TEXT,
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueios_horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_agenda" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "horario_inicio" TEXT NOT NULL DEFAULT '08:00',
    "horario_fim" TEXT NOT NULL DEFAULT '18:00',
    "duracao_slot" INTEGER NOT NULL DEFAULT 60,
    "dias_uteis" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "antecedencia_min" INTEGER NOT NULL DEFAULT 2,
    "antecedencia_max" INTEGER NOT NULL DEFAULT 30,
    "mensagem_confirmacao" TEXT,
    "mensagem_wa_confirmacao" TEXT,
    "mensagem_wa_lembrete" TEXT,
    "mensagem_wa_admin" TEXT,
    "whatsapp_admin" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "configuracoes_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversas_whatsapp" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "telefone" TEXT NOT NULL,
    "estado" "EstadoConversa" NOT NULL DEFAULT 'inicio',
    "dados_json" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversas_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_api_token_key" ON "tenants"("api_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_tenant_id_key" ON "users"("email", "tenant_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leads_nicho_idx" ON "leads"("nicho");

-- CreateIndex
CREATE INDEX "leads_estado_idx" ON "leads"("estado");

-- CreateIndex
CREATE INDEX "leads_municipio_idx" ON "leads"("municipio");

-- CreateIndex
CREATE INDEX "leads_fonte_idx" ON "leads"("fonte");

-- CreateIndex
CREATE UNIQUE INDEX "leads_place_id_tenant_id_key" ON "leads"("place_id", "tenant_id");

-- CreateIndex
CREATE INDEX "agendamentos_tenant_id_data_idx" ON "agendamentos"("tenant_id", "data");

-- CreateIndex
CREATE INDEX "agendamentos_data_status_idx" ON "agendamentos"("data", "status");

-- CreateIndex
CREATE INDEX "agendamentos_lembrete_enviado_status_idx" ON "agendamentos"("lembrete_enviado", "status");

-- CreateIndex
CREATE INDEX "bloqueios_horario_tenant_id_data_idx" ON "bloqueios_horario"("tenant_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_agenda_tenant_id_key" ON "configuracoes_agenda"("tenant_id");

-- CreateIndex
CREATE INDEX "conversas_whatsapp_tenant_id_expires_at_idx" ON "conversas_whatsapp"("tenant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_whatsapp_telefone_tenant_id_key" ON "conversas_whatsapp"("telefone", "tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios_horario" ADD CONSTRAINT "bloqueios_horario_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_agenda" ADD CONSTRAINT "configuracoes_agenda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversas_whatsapp" ADD CONSTRAINT "conversas_whatsapp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

