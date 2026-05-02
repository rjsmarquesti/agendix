# Agendix — CRM SaaS Multi-tenant com Agendamento Inteligente

> Plataforma completa para pequenos negócios gerenciarem clientes, agendamentos e automações via WhatsApp.

---

## Visão Geral

O **Agendix** é um sistema SaaS multi-tenant desenvolvido para clínicas, salões, consultórios e prestadores de serviços que precisam gerenciar clientes e agendamentos sem operação manual. Cada empresa cliente (tenant) tem seu próprio ambiente isolado, com painel de gestão, formulário público de agendamento e bot conversacional no WhatsApp.

### O que o sistema entrega

- **Painel admin web** — gestão de leads, agenda, serviços, usuários e configurações
- **Formulário público PWA** — o cliente agenda sozinho pelo celular, instalável na tela inicial
- **Bot WhatsApp** — agendamento, cancelamento e consulta via mensagens com IA
- **Notificações automáticas** — confirmação imediata e lembretes por WhatsApp
- **Multi-tenancy completo** — cada empresa tem seus dados, configurações e workflows isolados
- **Provisionamento automático** — novos tenants recebem workflows n8n exclusivos ao serem criados

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20 + Express 4 + Prisma ORM |
| Banco de dados | PostgreSQL 16 |
| Frontend admin | React 18 + Vite + Tailwind CSS |
| Formulário público | HTML/JS vanilla (PWA, sem build) |
| Automação | n8n self-hosted |
| WhatsApp | Evolution API (1 instância por tenant) |
| IA | Gemini (classificação de intenção do bot) |
| Infraestrutura | Docker + EasyPanel |
| Logging | Pino (estruturado, com correlationId) |
| Validação | Zod |
| Segurança | Helmet + express-rate-limit + JWT |

---

## Estrutura do Projeto

```
agendix/
├── backend/                        # API Node.js
│   ├── prisma/
│   │   ├── schema.prisma           # Schema PostgreSQL
│   │   ├── migrations/             # Migrations versionadas
│   │   └── seed.js                 # Dados iniciais
│   ├── public/
│   │   ├── agendar.html            # Formulário público PWA
│   │   ├── manifest.json           # PWA manifest
│   │   └── sw.js                   # Service Worker
│   ├── n8n/
│   │   ├── agendamento-whatsapp.json     # Workflow bot WA
│   │   └── agendamento-notificacoes.json # Workflow notificações
│   ├── scripts/
│   │   └── migrate-mariadb-to-postgres.js # Migração de dados
│   └── src/
│       ├── config/
│       │   └── planos.js           # Limites por plano
│       ├── controllers/            # Handlers das rotas
│       ├── middlewares/
│       │   ├── auth.js             # JWT + roles
│       │   ├── tenant.js           # Resolução de tenant
│       │   ├── validate.js         # Validação Zod
│       │   ├── rateLimiter.js      # Rate limiting por rota
│       │   ├── requestLogger.js    # Log estruturado por request
│       │   └── errorHandler.js     # Tratamento global de erros
│       ├── routes/                 # Definição de endpoints
│       ├── services/
│       │   ├── agendamentoService.js    # Criação + anti-double-booking
│       │   ├── leadService.js           # Normalização + importação em lote
│       │   ├── disponibilidadeService.js # Algoritmo de slots disponíveis
│       │   ├── n8nProvisioningService.js # Provisioning de workflows n8n
│       │   └── webhook.js               # Dispatch de eventos para n8n
│       ├── validators/
│       │   ├── agendamentoSchema.js
│       │   └── leadSchema.js
│       ├── utils/
│       │   └── response.js         # Helpers de resposta padronizada
│       └── lib/
│           ├── prisma.js           # Singleton Prisma Client
│           └── logger.js           # Instância Pino
├── frontend/                       # Painel admin React
│   └── src/
│       ├── pages/                  # Dashboard, Leads, Agendamentos, etc.
│       ├── components/             # Componentes reutilizáveis
│       ├── context/                # AuthContext, ThemeContext
│       └── services/api.js         # Camada de chamadas à API
├── scripts/                        # Scripts utilitários
└── docker-compose.yml              # Ambiente local completo
```

---

## Banco de Dados

### Modelos principais

| Modelo | Descrição |
|--------|-----------|
| `Tenant` | Empresa cliente — slug, plano, tokens, configurações de integração |
| `User` | Usuários do painel (super_admin / admin / atendente) |
| `Lead` | Clientes/prospects com funil, endereço completo e dados Google Maps |
| `Agendamento` | Agendamentos com status, canal de origem e controle de lembretes |
| `Servico` | Serviços oferecidos por cada tenant (duração, preço, ordem) |
| `BloqueioHorario` | Períodos bloqueados na agenda (feriados, férias, etc.) |
| `ConfiguracaoAgenda` | Regras de horário + templates de mensagem WA por tenant |
| `ConversaWhatsapp` | Estado efêmero das conversas do bot (máquina de estados) |

### Planos disponíveis

| Recurso | Básico | Pro | Premium |
|---------|--------|-----|---------|
| Usuários | 1 | 5 | Ilimitado |
| Agendamentos/mês | 50 | 300 | Ilimitado |
| Bot WhatsApp | ❌ | ✅ | ✅ |

---

## API — Endpoints principais

### Autenticação
```
POST /api/auth/login          # Login por tenant (header X-Tenant-Slug)
POST /api/auth/super-login    # Login super admin
GET  /api/auth/me             # Usuário atual
```

### Agendamento público (sem auth)
```
GET  /api/public/:slug/config                    # Config + serviços do tenant
GET  /api/public/:slug/disponibilidade?data=     # Slots disponíveis
POST /api/public/:slug/agendar                   # Criar agendamento
```

### Gestão (auth JWT + tenant)
```
GET|POST|PUT|DELETE /api/leads
GET|POST|PUT|DELETE /api/agendamentos
GET|POST|PUT|DELETE /api/servicos
GET|POST|DELETE     /api/bloqueios
GET|PUT             /api/settings
GET|POST|PUT|DELETE /api/users
GET                 /api/dashboard
```

### Integração n8n (auth X-API-Token)
```
GET|POST|PATCH /api/n8n/leads
GET|POST|PATCH /api/n8n/agendamentos
GET            /api/n8n/disponibilidade
GET|PUT|DELETE /api/n8n/conversas/:telefone
GET            /api/n8n/settings
GET            /api/n8n/lembretes-globais     # Master token
GET            /api/n8n/tenant-by-slug/:slug  # Master token
```

### Super admin
```
GET|POST|PUT|DELETE /api/admin/tenants
POST /api/admin/tenants/:id/provision-n8n     # Provisionar workflows n8n
```

---

## Fluxo de Agendamento via WhatsApp

```
Cliente envia mensagem
        ↓
Evolution API → Webhook n8n
        ↓
Resolver tenant pelo slug da instância
        ↓
Gemini classifica intenção (agendar / cancelar / consultar / outros)
        ↓
Máquina de estados (ConversaWhatsapp):
  AGUARDANDO_DATA → AGUARDANDO_SLOT → AGUARDANDO_NOME → AGUARDANDO_CONFIRMACAO
        ↓
POST /api/n8n/agendamentos (cria no banco)
        ↓
Webhook notificações → WhatsApp cliente + alerta admin
        ↓
Cron 30min → lembretes automáticos (3d / 1d / dia)
```

---

## Variáveis de Ambiente

```env
# Banco
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Auth
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=7d

# Servidor
PORT=3000

# Integração n8n
MASTER_API_TOKEN=token_global_para_n8n
N8N_BASE_URL=https://n8n.seudominio.com.br
N8N_API_KEY=sua_api_key_n8n
CRM_BASE_URL=https://crm.seudominio.com.br

# Log
LOG_LEVEL=info   # debug | info | warn | error
```

---

## Deploy

### Imagens Docker (Docker Hub: `rjsmarquesti`)

| Imagem | Descrição |
|--------|-----------|
| `crm-backend:pg-staging` | Backend com PostgreSQL — ambiente de staging |
| `crm-frontend:20260423a` | Frontend React atual |

### Ambiente local

```bash
# Subir tudo (PostgreSQL + backend + frontend)
docker-compose up -d

# Aplicar migrations
cd backend && npx prisma migrate deploy

# Rodar seed
node prisma/seed.js

# Rodar testes (23 testes)
npm test
```

### Staging no EasyPanel

Projeto `desenvolvimento` com serviços:
- `crm-pg-staging` — PostgreSQL 16
- `crm-backend-pg` — Backend Node.js (imagem `pg-staging`)

### Produção no EasyPanel

Projeto `produção` com serviços:
- PostgreSQL 16 (após migração)
- Backend Node.js
- Frontend Nginx

---

## Migração MariaDB → PostgreSQL

Para ambientes que ainda usam MariaDB, execute o script de migração dentro do container backend:

```bash
MARIADB_URL="mysql://user:pass@host:3306/db" \
node scripts/migrate-mariadb-to-postgres.js
```

O script migra em ordem segura (sem violação de FK), faz upsert idempotente e sincroniza as sequences do PostgreSQL ao final.

---

## Onboarding de Novo Tenant

1. **Painel super admin** → criar tenant com `slug` único e `nichoLabel`
2. **Evolution API** → criar instância com nome igual ao `slug` → conectar WhatsApp
3. **Painel super admin** → `POST /api/admin/tenants/:id/provision-n8n` → workflows criados automaticamente
4. **Painel admin do tenant** → configurar agenda, serviços e templates de mensagem
5. **Testar** → enviar "oi" pelo WhatsApp conectado

---

## Testes

```bash
cd backend && npm test
```

**23 testes** cobrindo:
- Disponibilidade de slots
- Agendamento via formulário público
- Double-booking prevention
- Isolamento entre tenants
- Integração n8n (CRUD + lembretes)

---

## Roadmap

- [ ] **Fase 3** — WhatsApp state machine no backend (remover dependência crítica do n8n)
- [ ] **Fase 3** — Adapter Evolution API (`WhatsAppProvider` abstrato)
- [ ] JWT refresh token
- [ ] Painel financeiro (integração Asaas)
- [ ] Relatórios por tenant
- [ ] App mobile (React Native)
