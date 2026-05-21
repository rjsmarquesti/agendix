# Agendix — Descritivo Técnico e Funcional Completo
> Versão 1.2.3 (backend) · 1.2.4 (frontend) · Última revisão: 2026-05-20

---

## 1. Visão Geral

Agendix é um CRM SaaS multi-tenant para prestadores de serviço. Cada cliente (tenant) opera em ambiente completamente isolado — banco de dados compartilhado com isolamento por `tenantId` em todas as queries, instância WhatsApp própria, configurações independentes e cobrança recorrente via Mercado Pago.

**URL de produção:** `https://agendix.divulgabr.com.br`  
**Infraestrutura:** Docker Hub → EasyPanel (VPS)  
**Banco:** PostgreSQL 16  
**Imagens estáveis:** `rjsmarquesti/agendix-backend:stable` / `rjsmarquesti/agendix-frontend:stable`

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   EasyPanel (VPS)                   │
│                                                     │
│  ┌──────────────┐    ┌──────────────┐               │
│  │   Frontend   │    │   Backend    │               │
│  │  React/Vite  │───▶│  Node/Express│               │
│  │  Nginx :80   │    │  Prisma :3000│               │
│  └──────────────┘    └──────┬───────┘               │
│                             │                       │
│                    ┌────────▼────────┐              │
│                    │  PostgreSQL 16  │              │
│                    └─────────────────┘              │
└─────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  Evolution API          Mercado Pago
  (WhatsApp)            (Pagamentos)
         │
         ▼
       n8n
  (Automações)
```

### Stack completo

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 |
| Backend | Node.js 20 + Express + Prisma ORM |
| Banco | PostgreSQL 16 Alpine |
| Auth | JWT (7d) + bcrypt (salt 10) + TOTP 2FA (otplib) |
| Email | Nodemailer → Hostinger SMTP (smtp.hostinger.com:465 SSL) |
| WhatsApp | Evolution API (`https://api.divulgabr.com.br`) |
| Automação | n8n (workflows por tenant) |
| Pagamentos | Mercado Pago SDK v2 — Preapproval (assinaturas recorrentes) |
| Deploy | Docker Hub → EasyPanel |

---

## 3. Modelo de Negócio

### Planos e Limites

| Plano | Preço | Agend./mês | Usuários | Bot WA | Financeiro | Agente IA |
|-------|-------|-----------|----------|--------|-----------|-----------|
| Trial | grátis 30d | 60 | 1 | ❌ | ❌ | ❌ |
| Básico | R$ 37/mês | 60 | 1 | ❌ | ❌ | ❌ |
| Pro | R$ 57/mês | 300 | 5 | ✅ | básico | ❌ |
| Premium | R$ 97/mês | ∞ | ∞ | ✅ | básico | ✅ |
| Business | R$ 127/mês | ∞ | ∞ | ✅ | completo | ✅ |

**Trial:** 30 dias (código diz `30 * 24 * 60 * 60 * 1000`), conta inativa até confirmação por email/WhatsApp.

### Ciclo de vida do plano

```
register → trial → [assinar MP] → ativo
                → [vencer sem pagar] → expirado → bloqueio 402
                → [inadimplente] → aviso no header X-Plano-Aviso
                → [cancelar] → cancelado → bloqueio 402
```

Downgrade: agendado para fim do ciclo (`planoDowngradePendente`), aplicado automaticamente pelo webhook MP na renovação.

---

## 4. Banco de Dados — Schema Completo

### Modelos tenant

| Modelo | Campos relevantes |
|--------|------------------|
| **Tenant** | id, nome, slug, plano, planoStatus, planoVencimento, planoDowngradePendente, evolutionInstance, evolutionApiKey (enc), evolutionBaseUrl, n8nAtivo, n8nWebhookUrl, n8nApiKey (enc), mpSubscriptionId, mpPlanId, modulos (JSON), corPrimaria, logo, nicho, lembretesAtivos, cadastroCompleto, email, telefone, cnpj, razaoSocial, endereço completo |
| **User** | id, nome, email, senha (bcrypt), role, tenantId, ativo, whatsapp, activationToken/Expires, passwordResetToken/Expires, totpSecret (plain), totpAtivo |
| **Lead** | id, nome, telefone, email, status, observacoes, tenantId |
| **Agendamento** | id, clienteNome, clienteTelefone, clienteEmail, data, hora, tipo, status, canal, leadId, servicoId, tenantId, lembrete3dEnviado, lembrete1dEnviado, lembreteDiaEnviado, observacoes |
| **Servico** | id, nome, duracao, preco, ordem, tenantId |
| **ConfiguracaoAgenda** | id, tenantId, horaInicio, horaFim, slotMinutos, diasUteis, antecedenciaHoras, mensagemConfirmacao, mensagemLembrete |
| **BloqueioHorario** | id, tenantId, data, motivo |
| **ConversaWhatsapp** | id, tenantId, telefone, estado, dadosTemp (JSON), ultimaInteracao |
| **LancamentoFinanceiro** | id, tenantId, tipo, valor, descricao, categoria, status, data, leadId, servicoId |
| **Notificacao** | id, tenantId, tipo, titulo, corpo, lida, criadaEm |

### Modelos admin (plataforma SaaS)

| Modelo | Campos relevantes |
|--------|------------------|
| **AdminLancamento** | id, tipo, valor, descricao, categoria, referencia (unique parcial), data |
| **Backup** | id, tipo, nomeArquivo, tamanho, tenantId, criadoEm |
| **AuditLog** | id, acao, entidade, entidadeId, tenantId, userId, ip, detalhes (JSON), criadoEm |
| **AgentConfig** | id, tenantId, evolutionInstance, modelo, systemPrompt, ativo, planosPermitidos |
| **AgentSession** | id, tenantId, leadId, estado, historico (JSON), ultimaInteracao |
| **AgentLead** | id, tenantId, nome, telefone, email, interesse, origem |

### Índices de performance

- `agendamentos.lead_id`
- `agendamentos.data + tenantId`
- `audit_logs.tenantId + criadoEm`
- `admin_lancamentos.(referencia, categoria) WHERE referencia IS NOT NULL` — único parcial (idempotência webhook)

---

## 5. Funcionalidades por Módulo

### 5.1 Auth & Acesso

**Registro (`POST /api/auth/register`)**
- Cria tenant + usuário admin em uma transaction
- Slug gerado automaticamente a partir do nome (normalizado, único, máx. 40 chars)
- Trial de 30 dias, conta inativa até ativação
- Envia email de ativação + WhatsApp de ativação via instância global (Evolution API)
- Link de ativação expira em 24 horas

**Login (`POST /api/auth/login`)**
- Requer header `X-Tenant-Slug` para login de tenant
- Super admin usa `/api/auth/super-login` (sem tenant header)
- Validação: email (express-validator) + bcrypt compare
- 2FA TOTP obrigatório para super_admin se `totpAtivo=true`
- JWT assinado com `{ id, nome, email, role, tenantId }`, TTL 7d
- Audit log gravado em todo login bem-sucedido

**Forgot/Reset Password**
- Resposta genérica (não revela se email existe)
- Token de 32 bytes hex, TTL 1 hora
- Envia email + WhatsApp (fire-and-forget com `.catch()`)
- Reset usa `updateMany` atômico com token no WHERE (previne race condition)
- Token removido do banco após uso

**Ativação de conta (`GET /api/auth/ativar?token=`)**
- Valida token + expiration antes de ativar
- Envia email de boas-vindas com link da página pública + guia de primeiros passos (fire-and-forget)

**2FA TOTP (apenas super_admin)**
- `GET /auth/2fa/setup` — gera secret + QR Code (base64) para Google Authenticator
- `POST /auth/2fa/verify` — confirma primeiro código e ativa o 2FA
- `POST /auth/2fa/disable` — desativa (requer código válido para confirmar)
- Secret armazenado como plaintext no campo `totpSecret` do User

**Trocar senha / editar perfil**
- `PUT /api/auth/senha` — exige senha atual + nova (mín. 6 chars)
- `PUT /api/auth/perfil` — nome + email; valida unicidade de email

### 5.2 CRM — Leads

- CRUD completo com filtros por status e busca por nome/telefone/email
- Status do funil: `novo → contato_feito → proposta_enviada → fechado → perdido`
- Lead vinculado a agendamentos e lançamentos financeiros

### 5.3 Agendamentos

- CRUD com calendário React (vista mensal + semanal)
- Criação com seletor de lead: auto-preenche nome, telefone e email
- Canais: `manual`, `web`, `whatsapp`
- Status: `marcado`, `confirmado`, `realizado`, `cancelado`, `faltou`
- Limite de agendamentos/mês validado no backend e na página pública
- Lembretes automáticos via cron (WA Queue) — 3 dias, 1 dia e no dia
- Campos de controle de lembrete: `lembrete3dEnviado`, `lembrete1dEnviado`, `lembreteDiaEnviado`

**Agenda Hoje / Agenda do Dia**
- View diária em ordem cronológica
- Export PDF e envio por email (SMTP)

### 5.4 Serviços

- CRUD com duração (minutos), preço e ordem de exibição
- Ordem usada na página pública de agendamento

### 5.5 Usuários (tenant)

- CRUD com limite validado no backend (LIMITE_USUARIOS por plano)
- Roles: `admin` (acesso total) / `atendente` (apenas leads e agendamentos)
- Ativo/inativo sem exclusão de dados
- Ícone de visualizar senha em todos os campos

### 5.6 Configurações — 6 abas

| Aba | Funcionalidades |
|-----|----------------|
| **Empresa** | Nome, logo (upload ≤2MB via multer), cor primária, módulos ativos, nicho, lembretes WA ativados |
| **Agenda** | Horário início/fim, slot em minutos, dias úteis, antecedência mínima, datas bloqueadas, mensagens WA customizadas |
| **Integração** | Status da instância WA (connectado/desconectado), QR Code com polling a cada 5s, badge verde ao conectar |
| **Bot/n8n** | Webhook URL, API token, toggle n8n ativo (provisiona workflows automaticamente) |
| **Plano** | Plano atual, vencimento, status MP; botão Assinar (checkout MP) / Cancelar |
| **Dados** | Exportar backup JSON completo / Importar backup em transaction |

### 5.7 Módulo Financeiro (planos Pro+)

- CRUD `LancamentoFinanceiro` — tipo (receita/despesa), valor, descrição, categoria, status (pago/pendente), data
- Vincula a lead e/ou serviço
- Dashboard: receita total, despesas, saldo, pendências
- Guard: Básico = bloqueado; Pro/Premium = financeiro básico; Business = completo
- Frontend: `PrivateRoute` com prop `planos` redireciona para `/configuracoes` se plano inadequado

### 5.8 Agendamento Público

Página sem login, acessível por slug:

```
https://agendix.divulgabr.com.br/agendar/SEU-SLUG
```

4 etapas: serviço → calendário → horário → dados → confirmação

- Cor do tenant aplicada via CSS var
- Disponibilidade calculada em tempo real (slots livres, bloqueios, antecedência)
- Limite de agendamentos/mês validado na API pública
- Confirmação por WhatsApp se tenant configurado

### 5.9 Pagamentos Mercado Pago

**Assinatura:**
- `POST /api/payments/assinar` — cria PreApproval e retorna `init_point` para redirect
- `MP_PLAN_*_ID` define qual plano MP corresponde a cada plano interno
- `back_url` aponta para `/pagamento/retorno?status=approved`

**Webhook (`POST /api/payments/webhook`):**
- Recebe body raw para validação HMAC-SHA256 (`x-signature: ts=...,v1=...`)
- `MP_WEBHOOK_SECRET` obrigatório em produção (boot falha sem ele)
- Dedup por `x-request-id` em memória com TTL 10 min
- Índice único parcial `(referencia, categoria)` + try-catch P2002 para idempotência persistente
- Atualiza `planoStatus`, `planoVencimento`, `plano` do tenant
- Cria `AdminLancamento` de receita automaticamente
- Envia emails de onboarding (pagante) e notificação ao admin
- Audit logs: `assinatura_ativa`, `assinatura_cancelada`, `assinatura_inadimplente`
- Upgrade inline no painel admin: abre checkout MP em nova aba
- Downgrade agendado (`planoDowngradePendente`), aplicado na renovação via webhook

### 5.10 Notificações In-App

- Modelo `Notificacao` por tenant
- Criadas automaticamente por eventos (lembrete enviado, etc.)
- `GET /api/notificacoes` — lista não lidas
- `PUT /api/notificacoes/:id` — marca como lida

### 5.11 WhatsApp & Automação

**Evolution API por tenant:**
- Instância automática ao criar tenant (provisionada pelo admin)
- QR Code com polling 5s no painel de configurações
- `evolutionApiKey` armazenada criptografada (AES-256-GCM)

**WA Queue anti-ban (`src/lib/waQueue.js`):**
- Fila serializada por instância
- Delay aleatório **2–5 segundos** entre envios
- Teto de **20 mensagens/hora** por número (janela deslizante de 1h)
- 3 tentativas com backoff (500ms × tentativa) para falhas 5xx/429
- Não retenta erros 4xx (exceto 429) — evita loops em payload inválido
- Timeout de 10s por request (AbortSignal)
- Usado pelos crons de lembretes para evitar ban em disparos em lote

**WA Watchdog (`src/services/watchdogService.js`):**
- Cron a cada **15 minutos** (`*/15 * * * *`)
- Consulta estado de conexão de todas as instâncias ativas via `getConnectionState`
- Se state ≠ `open` → envia email de alerta ao admin
- **Cooldown de 1 hora** por tenant para evitar spam de alertas
- Limpa cooldown se tenant reconectar

**WA Circuit Breaker (`src/services/waWatchdogService.js`):**
- Monitoramento por instância dentro do próprio fluxo de envio
- Após **5 erros consecutivos** → suspende a instância por **2 horas**
- Suspensão: impede novos envios, registra `suspendedUntil` em memória
- Após cooldown: libera automaticamente, reseta contador
- Notifica admin por email com detalhes da instância e tenant
- Email traz orientação: verificar ban + link para reconectar no painel

**n8n por tenant:**
- Provisioning automático ao ativar `n8nAtivo` no painel admin
- Cria workflows na pasta "Agendix" (Projects API do n8n)
- Fallback silencioso para Community Edition sem Projects
- Autenticação por API token (`/api/n8n/*`)

### 5.12 Agente IA (planos Premium/Business)

- Atendimento automático WhatsApp
- Config por tenant: `AgentConfig` (instância, modelo, system prompt, planos habilitados)
- Sessões: `AgentSession` (estado, histórico JSON, lead vinculado)
- Leads capturados: `AgentLead`
- Rota: `/api/agente-ia` (tenantMiddleware)

### 5.13 Web Push Notifications *(implementado, não commitado)*

- `src/lib/pushService.js` — `enviarPushParaTenant(tenantId, payload)` via `web-push` (VAPID)
- `src/routes/push.js` — endpoints de subscribe/unsubscribe + envio
- `frontend/src/hooks/usePushNotifications.js` — solicita permissão + subscribe no Service Worker
- **Variáveis necessárias:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- ⚠️ Modelo `PushSubscription` ainda não existe no schema Prisma — migration pendente antes de produção

---

## 6. Painel Super Admin

### Clientes (`/admin/clientes`)

- CRUD completo de tenants
- Troca de plano inline (upgrade → MP checkout; downgrade → agendado)
- Badge amarelo de downgrade pendente com cancelamento inline
- Edição de usuários: nome, email, WhatsApp, role, ativo/inativo
- Criar usuário por tenant (valida limite do plano)
- Enviar link de reset de senha para usuário
- Botões de WhatsApp: QR Code + Status da instância
- Botão de provisioning n8n por tenant

### Financeiro Admin

- **Dashboard** `/admin/financeiro`: MRR estimado, distribuição de planos, tabela de pagamentos por tenant
- **Lançamentos** `/admin/financeiro/lancamentos`: CRUD `AdminLancamento`, filtros por tipo/categoria/período
- **Fluxo de Caixa** `/admin/financeiro/fluxo-caixa`: gráfico barras 12 meses + tabela acumulada

### Backups (`/admin/backups`)

- Criar backup (tipo: admin = plataforma inteira, ou tenant específico)
- Download: fetch autenticado com JWT, retorna arquivo JSON
- Restaurar: transaction completa com rollback em erro
- Excluir: remove arquivo do volume `agendix-backups`
- Histórico listado com tipo, tamanho e data

### Consumo de Recursos (`/admin/consumo`)

- Busca todos os tenants com contagem de agendamentos do mês e usuários
- Exibe barras de progresso vs. limite do plano
- Identifica rapidamente tenants próximos do limite

### Logs de Auditoria (`/admin/logs`)

- Filtros: ação, tenant, período (data início/fim)
- Paginação
- Expande linha para ver `detalhes` JSON completo

**Ações auditadas:**

| Ação | Quando |
|------|--------|
| `login` | Todo login bem-sucedido |
| `tenant_criado` | Ao criar tenant |
| `tenant_deletado` | Ao deletar tenant |
| `backup_criado` | Ao criar backup |
| `backup_restaurado` | Ao restaurar backup |
| `plano_alterado` | Ao mudar plano no painel admin |
| `senha_resetada_admin` | Ao resetar senha de usuário pelo admin |
| `assinatura_ativa` | Webhook MP — pagamento aprovado |
| `assinatura_cancelada` | Webhook MP — cancelamento |
| `assinatura_inadimplente` | Webhook MP — inadimplência |

---

## 7. Segurança — Camadas em Detalhe

### 7.1 Autenticação e Autorização

| Mecanismo | Implementação |
|-----------|--------------|
| JWT | `jsonwebtoken` — payload: `{ id, nome, email, role, tenantId }` — TTL 7d |
| Senha | `bcryptjs` com salt 10 |
| 2FA TOTP | `otplib` — apenas super_admin; QR Code via `qrcode` lib |
| Multi-tenant isolation | Todo acesso ao banco filtra por `tenantId` do JWT |
| Slug validation | Regex `^[a-z0-9-]+$` no tenantMiddleware — rejeita slugs malformados |

### 7.2 Rate Limiting

| Rota | Janela | Limite |
|------|--------|--------|
| `/api/auth/login` | 1 min | 10 req |
| `/api/auth/forgot-password` | 15 min | 5 req |
| `/api/public/:slug/agendar` | 1 min | 20 req |
| `/api/n8n/*` | 1 min | 200 req |
| `/api/*` (geral) | 1 min | 300 req |

Trust proxy configurado (`app.set('trust proxy', 1)`) para leitura correta de IP atrás do Traefik/EasyPanel.

### 7.3 CORS

- Lista de origens via `ALLOWED_ORIGINS` (env var, vírgula-separada)
- `credentials: true`
- Headers expostos: `X-Tenant-Slug`, `X-Correlation-Id`
- Requisições sem `origin` (webhooks server-to-server, mobile, curl) são permitidas

### 7.4 Helmet (HTTP Headers)

- CSP ativo em todas as rotas
- Exceção explícita para `/agendar.html`, `/sw.js`, `/manifest.json` (scripts inline)

### 7.5 Criptografia AES-256-GCM

Campos criptografados no banco: `evolutionApiKey`, `n8nApiKey`, `smtpPass`

```
Formato: enc:iv_hex:authTag_hex:ciphertext_hex
Algoritmo: AES-256-GCM
IV: 96 bits aleatórios por operação
Auth tag: 128 bits (autenticação + integridade)
Chave: ENCRYPTION_KEY (64 chars hex = 32 bytes)
```

- Prefixo `enc:` diferencia valores criptografados de plaintext legado
- Fallback para chave dev determinística se `ENCRYPTION_KEY` não configurada (não seguro para produção)
- Erro de descriptografia retorna `null` (não propaga exceção)

### 7.6 Webhook Mercado Pago — HMAC-SHA256

```
Header: x-signature: ts=TIMESTAMP,v1=HASH
Template: id:{dataId};request-id:{xRequestId};ts:{ts};
Validação: crypto.timingSafeEqual (timing-safe comparison)
```

- `MP_WEBHOOK_SECRET` obrigatório em produção (boot falha sem ele)
- Body recebido como `raw` (`express.raw`) para garantir integridade do payload na validação

### 7.7 Idempotência de Webhook

Camada 1 (memória): dedup por `x-request-id` com TTL 10 minutos  
Camada 2 (banco): índice único parcial `(referencia, categoria) WHERE referencia IS NOT NULL` + try-catch `P2002`

### 7.8 Reset de Senha — Race Condition

```javascript
// Atômico: apenas um request concorrente terá count=1
const resultado = await prisma.user.updateMany({
  where: { id: user.id, passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
  data: { senha: hash, passwordResetToken: null, passwordResetExpires: null },
});
if (resultado.count === 0) return res.status(400).json({ error: 'Token inválido ou expirado' });
```

### 7.9 Guard de Boot

Em `NODE_ENV=production`, o servidor valida 12 variáveis obrigatórias na inicialização:

```
DATABASE_URL, JWT_SECRET, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET,
MP_PLAN_BASICO_ID, MP_PLAN_PRO_ID, MP_PLAN_PREMIUM_ID, MP_PLAN_BUSINESS_ID,
SMTP_USER, SMTP_PASS, ENCRYPTION_KEY, APP_URL
```

Se alguma estiver ausente: `process.exit(1)` com mensagem clara listando as faltantes.

### 7.10 Prevenção de Enumeração de Usuários

`POST /api/auth/forgot-password` retorna sempre a mesma resposta genérica, independente de o email existir ou não:

```json
{ "message": "Se o email estiver cadastrado, você receberá um link em instantes." }
```

### 7.11 Token de Ativação/Reset não exposto em Email

Templates de email em `mailer.js` não incluem o token em texto plaintext. O link é uma URL completa que não expõe o token diretamente legível no corpo do email.

### 7.12 Status de Tenant — Middleware

Verificações em sequência no `tenantMiddleware`:
1. Slug presente e válido (`^[a-z0-9-]+$`)
2. Tenant existe no banco
3. `ativo = true`
4. `planoStatus ≠ expirado`
5. Trial não vencido (`planoVencimento > now`)
6. `planoStatus ≠ cancelado`
7. Inadimplente: deixa passar mas adiciona `X-Plano-Aviso` no header

### 7.13 Erros de API Externa → Não viram 401

O `errorHandler` mapeia `err.status === 401` → `502` para evitar que erros de APIs externas (Evolution API, MP) façam o frontend deslogar o usuário indevidamente.

### 7.14 Logging Estruturado

- Middleware `requestLogger` com `correlationId` (UUID v4) por requisição
- Header de resposta `X-Correlation-Id` para rastreamento
- Log por nível: `info` (2xx/3xx), `warn` (4xx), `error` (5xx)
- Campos: método, URL, status, duração em ms, tenantId

### 7.15 Anti-ban WhatsApp (WA Queue)

- Delay aleatório 2–5s entre mensagens (evita padrão detectável)
- Teto de 20 msg/hora por instância (janela deslizante)
- Retry com backoff exponencial para erros transitórios
- Circuit breaker: 5 erros consecutivos → suspensão de 2h da instância
- Watchdog a cada 15 min: detecta desconexão e alerta admin por email

---

## 8. Crons Ativos (em produção)

| Serviço | Frequência | Função |
|---------|-----------|--------|
| `notificacaoService.agendarCron()` | Definida no serviço | Lembrete WA 3d/1d/dia dos agendamentos; envia via waQueue |
| `trialEmailService.agendarCronTrial()` | Diário | Marca trials vencidos como `expirado` (updateMany); envia emails de aviso |
| `watchdogService.agendarWatchdog()` | Cada 15 min | Verifica estado das instâncias WA; alerta admin por email se desconectado |

---

## 9. Deploy e Infraestrutura

### Docker

**Backend Dockerfile:**
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache openssl
ENV NODE_ENV=production
RUN npm install --omit=dev --ignore-scripts
RUN npx prisma generate
RUN mkdir -p uploads/logos backups
CMD ["/entrypoint.sh"]
```

**entrypoint.sh:**
```sh
#!/bin/sh
set -e
npx prisma migrate deploy
node prisma/seed.js
node server.js
```

Migrations rodam automaticamente. Seed pula dados demo em `NODE_ENV=production`.

**Volumes (EasyPanel):**

| Volume | Container | Conteúdo |
|--------|-----------|---------|
| `agendix-uploads` | `/app/uploads` | Logos dos tenants |
| `agendix-backups` | `/app/backups` | Backups JSON |

> Usar Volume (não Bind Mount) — bind mount com path inexistente no host causa erro na subida.

**nginx.conf (frontend):**
- `location = /` → `landingpage-agendix-v2.html` (landing page)
- `location /` → SPA React (`try_files $uri $uri/ /index.html`)
- `location /api/` → proxy `backend:3000`

### Convenção de tags Docker

```
YYYYMMDD[letra]-v[semver]
Exemplos: 20260519a-v1.2.3, 20260520b-v1.2.4
```

Regra: bumpar `package.json` antes de buildar. Letra sequencial no mesmo dia (a, b, c...).

### Imagens (estado atual — 2026-05-20)

| Serviço | Versão local mais recente | Tag `:stable` em produção |
|---------|--------------------------|--------------------------|
| Backend | `20260519a-v1.2.3` | `20260518e-v1.2.1` |
| Frontend | `20260520a-v1.2.4` | `20260518d-v1.2.2` |

> `:stable` desatualizado. Versões 1.2.3/1.2.4 estão locais mas não promovidas nem commitadas.

---

## 10. Pendências Técnicas

| Item | Descrição | Risco |
|------|-----------|-------|
| **Commit pendente** | ~40 arquivos modificados não commitados incluindo funcionalidades novas | Alto — perda de código se máquina falhar |
| **PushSubscription** | Modelo não existe no schema Prisma; `pushService.js` já usa o modelo | Crítico — não buildar sem a migration |
| **`:stable` desatualizado** | EasyPanel em produção usa `20260518e-v1.2.1` (backend); local já está em `v1.2.3` | Médio — produção não tem WA Queue/Watchdog |
| **totpSecret plaintext** | `totpSecret` armazenado sem criptografia no campo User | Baixo-médio — campo sensível deveria usar `encrypt()` |
| **VAPID vars** | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` não documentadas nas vars de ambiente obrigatórias | Baixo — Push só funciona se configuradas |

---

## 11. Credenciais de Acesso (Padrão Seed)

| Papel | Email | Senha |
|-------|-------|-------|
| super_admin | suporte@divulgabr.com.br | *(seed — trocar imediatamente)* |
| admin demo | admin@crm.com | admin123 |

> Seed demo só cria em `NODE_ENV != production`.

---

*Agendix · Operado pela DivulgaBR · suporte@divulgabr.com.br*
