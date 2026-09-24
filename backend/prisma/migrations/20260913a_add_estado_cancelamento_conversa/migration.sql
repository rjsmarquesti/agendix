-- Adiciona novo estado ao enum EstadoConversa para o fluxo nativo de
-- cancelamento de agendamento via WhatsApp (bot nativo, gap fechado do n8n).
-- Só adiciona o valor — nenhuma UPDATE usa o valor nesta mesma migration
-- (Postgres proíbe usar um valor de enum recém-criado na mesma transação
-- em que foi adicionado; ver AP-019 na memória do projeto).
ALTER TYPE "EstadoConversa" ADD VALUE 'aguardando_confirmacao_cancelamento';
