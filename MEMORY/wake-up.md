# Wake-Up — Agendix

> Claude: leia este arquivo no início de cada sessão antes de qualquer ação.

**Última sessão:** 2026-05-23 22:08
**Último deploy:** 2026-05-23 ✅ — backend:20260523b-v1.4.1 / frontend:20260523b-v1.3.1 (EasyPanel `desenvolvimento`)

---

## Estado Atual

### O que está funcionando
- Auth JWT multi-tenant completo (login, roles, reset senha, ativação, 2FA TOTP)
- CRUD Leads, Agendamentos, Serviços, Usuários
- Agendamento público por slug (/agendar/:slug)
- WhatsApp via Evolution API + QR Code polling
- WA Queue anti-ban (delay 2-5s, teto 20 msgs/hora)
- WA Watchdog (email de alerta ao admin se desconectar)
- WA Circuit Breaker (suspende instância após 5 erros consecutivos)
- Módulo Atendimento WhatsApp (fila, atendentes, auditoria jurídica)
- Web Push Notifications (VAPID)
- Módulo financeiro tenant (plano pro+)
- Pagamentos Mercado Pago (PreApproval recorrente)
- Painel super admin completo (tenants, financeiro, backups, consumo, logs)
- Design system completo (dark mode, tokens CSS, paleta verde esmeralda)
- Landing page dark com toggle

### Em andamento
— (aguardando próxima feature)

### Issues abertas
- (nenhuma)

---

## Contexto Crítico

- **Docker Hub:** rjsmarquesti/agendix-backend:20260523a-v1.4.0 / agendix-frontend:20260523a-v1.3.0
- **Produção:** agendix.divulgabr.com.br (EasyPanel — projeto `desenvolvimento`)
- **Banco:** PostgreSQL 16 — migrations via `prisma migrate deploy` no startup
- **Branch estável:** stable-v1 + tag v1.0-stable (rollback seguro)
- Volumes EasyPanel: `agendix-uploads` (/app/uploads) e `agendix-backups` (/app/backups)

---

## Próximos Passos

- Preencher CNPJ e DPO em /termos e /privacidade
- Bot WhatsApp state machine nativo (hoje via n8n)
