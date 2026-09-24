-- Menu inicial de roteamento (Agendar / Atendente / Assistente IA), opt-in por tenant.
ALTER TYPE "EstadoConversa" ADD VALUE 'aguardando_menu_principal';
ALTER TABLE "configuracoes_agenda" ADD COLUMN "menu_inicial_ativo" BOOLEAN NOT NULL DEFAULT false;
