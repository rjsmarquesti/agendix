CREATE TYPE "StatusOrcamento" AS ENUM ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado');

CREATE TABLE orcamentos (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  numero        TEXT NOT NULL,
  cliente_nome  TEXT NOT NULL,
  cliente_tel   TEXT,
  descricao     TEXT,
  itens         JSONB NOT NULL DEFAULT '[]',
  valor_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        "StatusOrcamento" NOT NULL DEFAULT 'rascunho',
  validade_ate  TEXT,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orcamentos_tenant_created ON orcamentos(tenant_id, created_at);
CREATE INDEX idx_orcamentos_tenant_status  ON orcamentos(tenant_id, status);

CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
