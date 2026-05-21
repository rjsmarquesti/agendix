-- Índice para lookup de agendamentos por lead (histórico do cliente)
CREATE INDEX IF NOT EXISTS "agendamentos_lead_id_idx" ON "agendamentos"("lead_id");
