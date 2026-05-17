# Journal — Agendix

## 2026-05-09
- Configurado pipeline Claude Code Elite completo: hooks globais + projeto, MEMORY, skills, CLAUDE.md
- Estrutura criada: .claude/hooks/, .claude/skills/, MEMORY/{wake-up,journal,decisions,inbox}.md
- Preenchido CNPJ (50.406.025/0001-68) em Termos.jsx e DPO (Rogério) em Privacidade.jsx
- Implementado bot de agendamento WhatsApp nativo: backend/src/services/botAgendamentoService.js
  - State machine: inicio → aguardando_data → aguardando_slot → aguardando_nome → aguardando_confirmacao → concluida/cancelada
  - Bot tem prioridade no webhook; cai no agente IA se não for intenção de agendamento
  - Notifica admin via WA ao confirmar agendamento (se whatsappAdmin configurado)
