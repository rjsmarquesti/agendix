ALTER TABLE "agendamentos" ADD COLUMN "recorrencia_id" TEXT;
ALTER TABLE "agendamentos" ADD COLUMN "recorrencia_tipo" TEXT;
CREATE INDEX "agendamentos_recorrencia_id_idx" ON "agendamentos"("recorrencia_id");
