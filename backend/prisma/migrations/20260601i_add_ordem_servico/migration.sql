-- Módulo Ordem de Serviço (OS) — nichos residencial, automotivo, servicos_profissionais
CREATE TYPE "StatusOrdemServico" AS ENUM ('aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'cancelada');

CREATE TABLE IF NOT EXISTS "ordens_servico" (
  "id"               SERIAL PRIMARY KEY,
  "tenant_id"        INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lead_id"          INTEGER REFERENCES "leads"("id") ON DELETE SET NULL,
  "numero"           TEXT NOT NULL,
  "cliente_nome"     TEXT NOT NULL,
  "cliente_tel"      TEXT,
  "cliente_endereco" TEXT,
  "descricao_servico" TEXT,
  "itens"            JSONB NOT NULL DEFAULT '[]',
  "valor_total"      DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status"           "StatusOrdemServico" NOT NULL DEFAULT 'aberta',
  "data_abertura"    TEXT,
  "data_prevista"    TEXT,
  "data_conclusao"   TEXT,
  "tecnico_nome"     TEXT,
  "garantia_dias"    INTEGER,
  "observacoes"      TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ordens_servico_tenant_id_created_at_idx" ON "ordens_servico"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "ordens_servico_tenant_id_status_idx"     ON "ordens_servico"("tenant_id", "status");

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at_ordens_servico()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ordens_servico_updated_at
BEFORE UPDATE ON "ordens_servico"
FOR EACH ROW EXECUTE FUNCTION set_updated_at_ordens_servico();
