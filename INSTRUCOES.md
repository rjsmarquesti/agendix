# Agendix — Instruções Técnicas
> Deploy via Docker Hub + EasyPanel · Versão 1.2

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js 20 + Express + Prisma ORM |
| Banco | PostgreSQL 16 (Alpine) |
| Auth | JWT + bcryptjs + TOTP 2FA |
| WhatsApp | Evolution API |
| Automação | n8n |
| Pagamentos | Mercado Pago (Preapproval) |
| Deploy | Docker Hub → EasyPanel |

---

## Imagens Docker

```
rjsmarquesti/agendix-backend:stable
rjsmarquesti/agendix-frontend:stable
```

Tags com data: formato `YYYYMMDD[letra]-v[semver]` (ex: `20260518e-v1.2.1`)

---

## Variáveis de Ambiente (backend)

```env
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DB
JWT_SECRET=chave_longa_e_aleatoria
JWT_EXPIRES_IN=7d
PORT=3000
APP_URL=https://agendix.divulgabr.com.br

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=suporte@divulgabr.com.br
SMTP_PASS=...
SMTP_FROM=suporte@divulgabr.com.br

EVOLUTION_GLOBAL_API_KEY=...

MP_ACCESS_TOKEN=...
MP_PLAN_BASICO_ID=...
MP_PLAN_PRO_ID=...
MP_PLAN_PREMIUM_ID=...
MP_PLAN_BUSINESS_ID=...
MP_WEBHOOK_SECRET=...
```

> O backend valida essas 12 variáveis no boot e encerra com mensagem clara se alguma estiver ausente.

---

## Deploy no EasyPanel

### Serviço 1: PostgreSQL

- Tipo: **PostgreSQL** (serviço nativo do EasyPanel)
- Anote a `DATABASE_URL` gerada

### Serviço 2: Backend

- Tipo: **App** → imagem Docker Hub
- Imagem: `rjsmarquesti/agendix-backend:stable`
- Porta: `3000`
- Volumes:
  - `agendix-uploads` → `/app/uploads` (logos)
  - `agendix-backups` → `/app/backups` (backups JSON)

> **IMPORTANTE:** usar Volume (não Bind Mount) para `backups`. Bind mount com path inexistente causa erro na subida.

### Serviço 3: Frontend

- Tipo: **App** → imagem Docker Hub
- Imagem: `rjsmarquesti/agendix-frontend:stable`
- Porta: `80`
- Domínio: configure o domínio desejado

### Startup do backend

O `CMD` do Dockerfile executa na ordem:

```sh
npx prisma migrate deploy && node prisma/seed.js && node server.js
```

O `entrypoint.sh` remove automaticamente migrations com falha antes do `migrate deploy` (robustez no cold-start).

> Em `NODE_ENV=production`, o seed pula os dados de demonstração.

---

## Workflow de Build e Deploy

```bash
# 1. Bumpar versão no package.json do serviço alterado
# 2. Buildar
docker build -t rjsmarquesti/agendix-backend:YYYYMMDD[letra]-vX.Y.Z ./backend
docker build -t rjsmarquesti/agendix-frontend:YYYYMMDD[letra]-vX.Y.Z ./frontend

# 3. Tag stable (após validar)
docker tag rjsmarquesti/agendix-backend:TAG rjsmarquesti/agendix-backend:stable
docker tag rjsmarquesti/agendix-frontend:TAG rjsmarquesti/agendix-frontend:stable

# 4. Push
docker push rjsmarquesti/agendix-backend:TAG
docker push rjsmarquesti/agendix-backend:stable
docker push rjsmarquesti/agendix-frontend:TAG
docker push rjsmarquesti/agendix-frontend:stable

# 5. No EasyPanel: atualizar tag e fazer Redeploy
```

> Login no Docker Hub em ambiente não-TTY: usar `~/.docker/config.json` com auth pré-configurado (não usar `docker login` interativo).

---

## Migrations Prisma

Rodam automaticamente no boot via `prisma migrate deploy`. Para adicionar nova migration:

```bash
cd backend
npx prisma migrate dev --name descricao_da_migration
```

Testar localmente antes de buildar a imagem.

---

## Desenvolvimento Local

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com DATABASE_URL apontando para PostgreSQL local
npm install
npx prisma migrate deploy
node prisma/seed.js
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O Vite faz proxy `/api → http://localhost:3000` automaticamente.

Acesse: `http://localhost:5173`

---

## Estrutura do Projeto

```
agendix/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── lib/          (prisma.js, audit.js, encrypt.js, mailer.js)
│   │   ├── services/     (mercadoPago, trialEmail, agentIA)
│   │   └── config/       (planos.js)
│   ├── uploads/logos/
│   ├── backups/
│   ├── server.js
│   ├── entrypoint.sh
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/      (AuthContext, ThemeContext)
│   │   └── services/api.js
│   ├── public/
│   │   └── landingpage-agendix-v2.html
│   ├── nginx.conf
│   └── Dockerfile
├── docs/
│   ├── manual-admin.md
│   └── manual-cliente.md
└── INSTRUCOES.md
```

---

## nginx.conf — Roteamento

```
location = /      → landingpage-agendix-v2.html
location /        → SPA React (try_files $uri $uri/ /index.html)
location /api/    → proxy backend:3000
```

---

## Credenciais Padrão (seed)

| Papel | Email | Observação |
|-------|-------|-----------|
| super_admin | suporte@divulgabr.com.br | Alterar senha após primeiro acesso |
| admin demo | admin@crm.com / admin123 | Criado apenas em `NODE_ENV != production` |

---

*Agendix · Docker Hub: rjsmarquesti · EasyPanel: projeto `desenvolvimento`*
