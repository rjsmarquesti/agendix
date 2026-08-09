-- Prontuários (histórico clínico evolutivo — Saúde)
CREATE TABLE prontuarios (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id             INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  nome_cliente        TEXT NOT NULL,
  telefone            TEXT,
  email               TEXT,
  data_nascimento     TEXT,
  convenio            TEXT,
  numero_carteirinha  TEXT,
  campos              JSONB NOT NULL DEFAULT '{}',
  evolucoes           JSONB NOT NULL DEFAULT '[]',
  diagnostico         TEXT,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prontuarios_tenant_created ON prontuarios(tenant_id, created_at DESC);
CREATE INDEX idx_prontuarios_tenant_lead    ON prontuarios(tenant_id, lead_id);

CREATE TRIGGER prontuarios_updated_at
  BEFORE UPDATE ON prontuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enum status de documento
CREATE TYPE "StatusDocumento" AS ENUM ('rascunho', 'ativo', 'vencido', 'cancelado');

-- Documentos (contratos, propostas, jurídicos — Serviços Profissionais)
CREATE TABLE documentos (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  titulo          TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'contrato',
  cliente_nome    TEXT NOT NULL,
  cliente_tel     TEXT,
  conteudo        TEXT,
  observacoes     TEXT,
  status          "StatusDocumento" NOT NULL DEFAULT 'rascunho',
  data_vencimento TEXT,
  arquivo         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documentos_tenant_created ON documentos(tenant_id, created_at DESC);
CREATE INDEX idx_documentos_tenant_status  ON documentos(tenant_id, status);

CREATE TRIGGER documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
