# Decisions — Agendix

Registro de decisões arquiteturais relevantes (formato ADR leve).

---

## 2026-05-01 — Stack multi-tenant com Prisma

**Contexto:** Precisávamos de um CRM SaaS com isolamento entre clientes.
**Decisão:** PostgreSQL + Prisma com `tenantId` em todos os modelos de tenant.
**Consequência:** Toda query de tenant filtra por `tenantId`; seed cria tenant `demo` com slug `demo`.

---

## 2026-05-03 — Auth JWT stateless

**Contexto:** Sistema multi-tenant com roles diferentes por tenant.
**Decisão:** JWT com payload `{ userId, tenantId, role }` — sem sessão server-side.
**Consequência:** `tenantMiddleware` extrai tenantId do token; super_admin tem tenantId nulo.

---

## 2026-05-03 — Pagamentos via Mercado Pago PreApproval

**Contexto:** Precisávamos de assinaturas recorrentes.
**Decisão:** PreApproval API do Mercado Pago; webhook atualiza `planoStatus` e cria `AdminLancamento`.
**Consequência:** `MP_WEBHOOK_SECRET` deve ser verificado antes de processar qualquer webhook.

---

## 2026-05-08 — Deploy via Docker Hub → EasyPanel

**Contexto:** Infraestrutura gerenciada via EasyPanel.
**Decisão:** Images buildadas localmente, pushed para Docker Hub (rjsmarquesti), atualizadas no EasyPanel.
**Consequência:** Tags no formato `YYYYMMDD[letra]`; branch `stable-v1` = rollback seguro pré-admin.

---

## 2026-05-08 — Volumes EasyPanel para uploads e backups

**Contexto:** Bind mount com path do host inexistente causava erro de deploy.
**Decisão:** Usar Volume (não Bind Mount) para `agendix-uploads` e `agendix-backups`.
**Consequência:** Dados persistem entre redeploys sem depender de path do host.
