# CRM Simples — Instruções de Uso

## Stack
- **Backend:** Node.js + Express + Prisma
- **Frontend:** React + Vite + Tailwind CSS
- **Banco:** MariaDB 10.11
- **Container:** Docker + Docker Compose

---

## Rodar com Docker Desktop (local)

### Passo 1 — Clonar e configurar variáveis

```bash
cd crm-simples
cp .env.example .env
```

Edite o `.env` com suas senhas:

```env
DB_ROOT_PASSWORD=senha_root_forte
DB_NAME=crm_simples
DB_USER=crm_user
DB_PASSWORD=senha_do_usuario
JWT_SECRET=uma_chave_secreta_muito_longa_e_aleatoria
JWT_EXPIRES_IN=7d
```

### Passo 2 — Subir os containers

```bash
docker-compose up -d --build
```

O Docker irá:
1. Subir o MariaDB e aguardar ele ficar saudável
2. Rodar `prisma migrate deploy` (cria as tabelas)
3. Rodar o seed (cria o admin e dados de exemplo)
4. Iniciar o backend na porta 3000
5. Fazer o build do React e servir com Nginx na porta 80

### Passo 3 — Acessar

| Serviço   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost            |
| Backend   | http://localhost:3000/api   |

**Login padrão:**
- Email: `admin@crm.com`
- Senha: `admin123`

### Comandos úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Parar tudo
docker-compose down

# Parar e apagar o banco (CUIDADO: apaga os dados)
docker-compose down -v

# Rebuild após mudanças no código
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

---

## Rodar no EasyPanel

### Passo 1 — Preparar o repositório

Faça push do projeto para um repositório Git (GitHub, GitLab, etc.).

> Certifique-se que o `.env` **não** está no repositório (está no `.gitignore`).

### Passo 2 — Criar os serviços no EasyPanel

No painel do EasyPanel, crie um novo projeto e adicione **3 serviços**:

---

#### Serviço 1: MariaDB

- Tipo: **MariaDB** (ou App com imagem `mariadb:10.11`)
- Variáveis de ambiente:
  ```
  MYSQL_ROOT_PASSWORD=senha_root_forte
  MYSQL_DATABASE=crm_simples
  MYSQL_USER=crm_user
  MYSQL_PASSWORD=senha_do_usuario
  ```
- Volume: `/var/lib/mysql` → volume persistente

---

#### Serviço 2: Backend (App)

- Tipo: **App**
- Source: Repositório Git → pasta `./backend`
- Dockerfile: `./backend/Dockerfile`
- Porta: `3000`
- Variáveis de ambiente:
  ```
  DATABASE_URL=mysql://crm_user:senha_do_usuario@<nome-servico-mariadb>:3306/crm_simples
  JWT_SECRET=sua_chave_secreta
  JWT_EXPIRES_IN=7d
  PORT=3000
  ```

> Substitua `<nome-servico-mariadb>` pelo nome interno do serviço MariaDB no EasyPanel (geralmente o nome que você deu ao criar).

---

#### Serviço 3: Frontend (App)

- Tipo: **App**
- Source: Repositório Git → pasta `./frontend`
- Dockerfile: `./frontend/Dockerfile`
- Porta: `80`
- Domínio: configure o domínio desejado no EasyPanel

---

### Passo 3 — Deploy

No EasyPanel, clique em **Deploy** em cada serviço na ordem:
1. MariaDB
2. Backend
3. Frontend

### Passo 4 — Acessar

Acesse pelo domínio configurado no EasyPanel.

---

## Desenvolvimento local (sem Docker)

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com DATABASE_URL apontando para MariaDB local
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

O Vite já faz proxy `/api → http://localhost:3000`.

Acesse: http://localhost:5173

---

## Estrutura do projeto

```
crm-simples/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Schema do banco
│   │   ├── seed.js             # Dados iniciais
│   │   └── migrations/         # Migrations do Prisma
│   ├── src/
│   │   ├── controllers/        # Lógica de negócio
│   │   ├── routes/             # Rotas da API
│   │   ├── middlewares/        # Auth + erros
│   │   └── lib/prisma.js       # Cliente Prisma
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/              # Login, Dashboard, Leads, Agendamentos
│   │   ├── components/         # Layout, Modal, Badge
│   │   ├── context/            # AuthContext
│   │   └── services/api.js     # Cliente HTTP
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## API — Rotas disponíveis

| Método | Rota                    | Descrição               |
|--------|-------------------------|-------------------------|
| POST   | /api/auth/login         | Login                   |
| GET    | /api/auth/me            | Usuário autenticado     |
| GET    | /api/dashboard          | Estatísticas            |
| GET    | /api/leads              | Listar leads            |
| POST   | /api/leads              | Criar lead              |
| PUT    | /api/leads/:id          | Editar lead             |
| DELETE | /api/leads/:id          | Remover lead            |
| GET    | /api/agendamentos       | Listar agendamentos     |
| POST   | /api/agendamentos       | Criar agendamento       |
| PUT    | /api/agendamentos/:id   | Editar agendamento      |
| DELETE | /api/agendamentos/:id   | Remover agendamento     |
