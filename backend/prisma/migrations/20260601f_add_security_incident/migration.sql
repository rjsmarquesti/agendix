-- Sprint 4 SIEM: tabela de incidentes de segurança
CREATE TABLE IF NOT EXISTS "security_incidents" (
  "id"            SERIAL PRIMARY KEY,
  "tipo"          TEXT NOT NULL,
  "severidade"    TEXT NOT NULL DEFAULT 'medium',
  "ip"            TEXT,
  "tenant_id"     INTEGER,
  "user_id"       INTEGER,
  "detalhes"      JSONB,
  "status"        TEXT NOT NULL DEFAULT 'open',
  "resolvido_por" TEXT,
  "criado_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvido_em"  TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "security_incidents_severidade_idx" ON "security_incidents"("severidade");
CREATE INDEX IF NOT EXISTS "security_incidents_status_idx"     ON "security_incidents"("status");
CREATE INDEX IF NOT EXISTS "security_incidents_criado_em_idx"  ON "security_incidents"("criado_em");
