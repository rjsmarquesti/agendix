-- Novo toggle opt-in por tenant: transforma o lembrete de 1 dia antes numa
-- pergunta de confirmação de presença (sim/não), pra reduzir no-show.
-- Default false — quem não ligar continua recebendo o lembrete de sempre.
ALTER TABLE "configuracoes_agenda" ADD COLUMN "confirmacao_lembrete_ativa" BOOLEAN NOT NULL DEFAULT false;
