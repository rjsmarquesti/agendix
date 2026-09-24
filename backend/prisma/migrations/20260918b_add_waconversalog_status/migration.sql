-- Visibilidade de falha no envio assíncrono (fire-and-forget) de respostas humanas.
ALTER TABLE "wa_conversa_logs" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'enviado';
