-- Vincula um WaAtendente a um User de login (role atendente), pra permitir
-- responder pelo painel sem depender do WhatsApp pessoal do atendente.
ALTER TABLE "wa_atendentes" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "wa_atendentes" ADD CONSTRAINT "wa_atendentes_user_id_key" UNIQUE ("user_id");
ALTER TABLE "wa_atendentes" ADD CONSTRAINT "wa_atendentes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
