-- CreateTable
CREATE TABLE "agent_configs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "persona" TEXT NOT NULL DEFAULT 'Assistente',
    "promptBase" TEXT NOT NULL,
    "horario_inicio" TEXT NOT NULL DEFAULT '09:00',
    "horario_fim" TEXT NOT NULL DEFAULT '18:00',
    "dias_uteis" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "msg_fora_horario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "messages_json" JSONB NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_leads" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "primeira_msg" TEXT,
    "sent_checkout" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_configs_tenant_id_key" ON "agent_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_sessions_id_tenant_id_key" ON "agent_sessions"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "agent_leads_tenant_id_idx" ON "agent_leads"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_leads_tenant_id_telefone_key" ON "agent_leads"("tenant_id", "telefone");

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_leads" ADD CONSTRAINT "agent_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
