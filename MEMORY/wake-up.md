# Wake-Up — Agendix

> Claude: leia este arquivo no início de cada sessão antes de qualquer ação.

**Última sessão:** 2026-05-14 18:12
**Último deploy:** 2026-05-12 — backend:20260512a / frontend:20260512a

---

## Estado Atual

### O que está funcionando
- Auth JWT multi-tenant completo (login, roles, reset senha, ativação)
- CRUD Leads, Agendamentos, Serviços, Usuários
- Agendamento público por slug (/agendar/:slug)
- WhatsApp via Evolution API + QR Code polling
- Módulo financeiro tenant (plano pro+)
- Pagamentos Mercado Pago (PreApproval recorrente)
- Painel super admin completo (tenants, financeiro, backups, consumo, logs)
- Landing page dark com toggle

### Em andamento
— (aguardando próxima feature)

### Issues abertas
- (nenhuma)

---

## Contexto Crítico

- **Docker Hub:** rjsmarquesti/agendix-backend:20260512b / agendix-frontend:20260512a
- **Produção:** agendix.divulgabr.com.br (EasyPanel — projeto `desenvolvimento`)
- **Banco:** PostgreSQL 16 — migrations via `prisma migrate deploy` no startup
- **Branch estável:** stable-v1 + tag v1.0-stable (rollback seguro)
- Volumes EasyPanel: `agendix-uploads` (/app/uploads) e `agendix-backups` (/app/backups)

---

## Próximos Passos

- Preencher CNPJ e DPO em /termos e /privacidade
- Bot WhatsApp state machine nativo (hoje via n8n)
