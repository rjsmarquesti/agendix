-- CreateEnum
CREATE TYPE "StatusProcesso" AS ENUM ('ativo', 'suspenso', 'encerrado', 'arquivado');

-- CreateTable
CREATE TABLE "processos" (
  "id"                   SERIAL       NOT NULL,
  "tenant_id"            INTEGER      NOT NULL,
  "lead_id"              INTEGER,
  "numero"               TEXT         NOT NULL,
  "titulo"               TEXT         NOT NULL,
  "tipo"                 TEXT         NOT NULL DEFAULT 'outro',
  "status"               "StatusProcesso" NOT NULL DEFAULT 'ativo',
  "vara"                 TEXT,
  "comarca"              TEXT,
  "cliente_nome"         TEXT         NOT NULL,
  "cliente_tel"          TEXT,
  "parte_contraria"      TEXT,
  "advogado"             TEXT,
  "data_abertura"        TEXT,
  "prazo_proximo"        TEXT,
  "data_encerramento"    TEXT,
  "valor_causa"          DOUBLE PRECISION,
  "honorarios"           DOUBLE PRECISION,
  "observacoes"          TEXT,
  "movimentacoes"        JSONB        NOT NULL DEFAULT '[]',
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "processos_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "processos_tenant_id_created_at_idx" ON "processos"("tenant_id", "created_at");
CREATE INDEX "processos_tenant_id_status_idx"     ON "processos"("tenant_id", "status");

-- ForeignKeys
ALTER TABLE "processos" ADD CONSTRAINT "processos_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "processos" ADD CONSTRAINT "processos_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER processos_updated_at
  BEFORE UPDATE ON "processos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
