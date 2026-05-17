# PROJECT: Agendix

CRM SaaS multi-tenant com agendamento, WhatsApp, financeiro e painel admin completo.
Produção: agendix.divulgabr.com.br | Docker Hub: rjsmarquesti/agendix-*

## STACK
```
Backend:  Node.js 20 + Express + Prisma ORM + PostgreSQL 16
Frontend: React 18 + Vite + Tailwind CSS + React Router v6
Auth:     JWT (bcryptjs) + roles: super_admin / admin / atendente
Email:    Nodemailer → SMTP Hostinger smtp.hostinger.com:465
WhatsApp: Evolution API (https://api.divulgabr.com.br)
Pagamentos: Mercado Pago PreApproval (assinaturas recorrentes)
Deploy:   Docker Hub → EasyPanel (projeto `desenvolvimento`)
```

## PROJECT STRUCTURE
```
agendix/
├── backend/
│   ├── src/
│   │   ├── controllers/   ← lógica de request/response
│   │   ├── routes/        ← definição de rotas + middlewares
│   │   ├── lib/           ← audit.js, mailer.js, whatsapp.js
│   │   └── config/        ← planos.js (limites por plano)
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.js
└── frontend/
    └── src/
        ├── pages/         ← uma página por rota
        ├── components/
        └── contexts/      ← AuthContext, ThemeContext
```

## ARCHITECTURE RULES
- Pattern: route → middleware (auth + tenant) → controller → prisma
- NUNCA colocar lógica de negócio diretamente nas rotas
- SEMPRE filtrar queries por `tenantId` em operações de tenant
- Limites de plano (`planos.js`) são verificados no backend, nunca só no frontend
- Migrations Prisma: criar com `prisma migrate dev --name descricao` localmente, aplicar em prod via `prisma migrate deploy`
- Variáveis de ambiente: todas via `.env` — NUNCA hardcodar no código

## ROUTING TABLE

| Trigger | Ação obrigatória |
|---------|-----------------|
| Nova rota de tenant | Verificar `authenticateToken` + `tenantMiddleware` na rota antes de controller |
| Nova rota de admin | Verificar `authenticateToken` + `requireRole('super_admin')` |
| Novo modelo Prisma | Criar migration → testar seed → atualizar migration list em memory |
| Bug reportado | Reproduzir → identificar causa → corrigir → registrar em `MEMORY/decisions.md` |
| Build/deploy solicitado | Identificar serviço(s) alterado(s) → buildar → push → informar tag gerada |
| Migração Prisma nova | `prisma migrate dev` local → testar → incluir na lista de migrations da memória do projeto |
| Nova feature de plano | Atualizar `backend/src/config/planos.js` + guard no controller + guard no frontend |
| WhatsApp/Evolution API | Verificar tenant.evolutionApiUrl e tenant.evolutionApiKey antes de qualquer chamada |

## CURRENT STATE
Leia `MEMORY/wake-up.md` para o estado atual do projeto.
Tasks pendentes: veja `MEMORY/inbox.md`.

## MANDATORY RULES
1. Toda rota de tenant DEVE ter `authenticateToken` + `tenantMiddleware` — sem exceção
2. Toda rota de super_admin DEVE ter `requireRole('super_admin')` explícito
3. Antes de buildar Docker: verificar se há erro com `node --check` nos arquivos alterados
4. Antes de push: confirmar tag com o usuário
5. Ao criar AdminLancamento via webhook MP: verificar `MP_WEBHOOK_SECRET` antes de processar

## FORBIDDEN
- NUNCA hardcodar credenciais, API keys ou connection strings no código
- NUNCA fazer bypass de auth middleware (comentar, remover, condicionar a env)
- NUNCA fazer commit sem confirmação explícita do usuário
- NUNCA fazer push sem confirmação explícita do usuário
- NUNCA usar `prisma.$queryRaw` sem sanitizar inputs (SQL injection)
- NUNCA retornar senha ou token em resposta de API
- NUNCA criar arquivo `.md` de documentação sem ser solicitado

## QUALITY GATES
Antes de declarar qualquer tarefa concluída:
- `node --check backend/src/[arquivo-alterado].js` → zero erros
- Rota nova tem auth guard correto (tenant ou super_admin)
- Nenhuma credencial hardcoded introduzida
- Se mudou frontend: testar no browser o golden path da feature
- Se mudou Docker: buildar e informar tag gerada

## COMMANDS

/status
Leia MEMORY/wake-up.md e MEMORY/inbox.md. Responda:
(1) o que está funcionando, (2) o que está em andamento, (3) issues abertas, (4) próxima prioridade recomendada.

/deploy-check
Execute os Quality Gates para os arquivos alterados na sessão atual.
Liste cada item: PASS ou FAIL. Se FAIL, ofereça correção.

/review
Use o skill em .claude/skills/code-review.md para revisar os arquivos alterados na sessão.
Liste findings por severity: CRITICAL / WARNING / INFO.

/deploy [backend|frontend|ambos]
Use o skill em .claude/skills/deploy.md para buildar e fazer push das imagens indicadas.
