# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
6. **REGRA DE IMPACTO — obrigatória antes de qualquer alteração (correção, melhoria, refatoração ou nova funcionalidade):**

**OBJETIVO:** Nunca quebrar funcionalidades existentes. Preservar compatibilidade e comportamento atual, exceto quando explicitamente solicitado.

**ANÁLISE PRÉ-IMPLEMENTAÇÃO**
- Analise dependências diretas e indiretas do código a ser alterado
- Identifique funções, arquivos, rotas, APIs, componentes, banco e integrações potencialmente afetadas
- Avalie impactos colaterais antes de modificar qualquer código

**IMPLEMENTAÇÃO SEGURA**
- Faça alterações minimamente invasivas
- Preserve interfaces existentes sempre que possível
- Evite alterar comportamento global sem necessidade

**VERIFICAÇÃO PRÉ-ENTREGA**
- Confirme: sem erros de compilação, sem imports quebrados, sem dependências ausentes
- Verifique que fluxos existentes continuam funcionando

**AUTO-CHECK obrigatório antes de finalizar:**
> ✓ O que foi alterado? ✓ O que poderia quebrar? ✓ O que foi verificado? ✓ Existe regressão possível? ✓ Há impacto em outras funções?

**REGRA FINAL:** Se existir risco significativo de quebrar outra funcionalidade, avisar antes de aplicar.

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

## DEV COMMANDS

```bash
# Backend
cd backend && npm run dev          # nodemon — hot reload
cd backend && npm test             # jest --runInBand --forceExit
cd backend && npm run db:migrate   # prisma migrate deploy (produção)
cd backend && npm run db:studio    # Prisma Studio na porta 5555
node --check src/arquivo.js        # syntax check sem executar

# Frontend
cd frontend && npm run dev         # Vite dev server
cd frontend && npm run build       # build de produção

# Prisma — nova migration
cd backend && npx prisma migrate dev --name descricao_curta

# Docker — build obrigatório com --no-cache (cache ignora arquivos estáticos)
docker build --no-cache -t rjsmarquesti/agendix-backend:TAG  -f backend/Dockerfile  backend
docker build --no-cache -t rjsmarquesti/agendix-frontend:TAG -f frontend/Dockerfile frontend
docker push rjsmarquesti/agendix-backend:TAG
docker push rjsmarquesti/agendix-frontend:TAG
```

**Tag Docker obrigatória:** `YYYYMMDD[letra]-v[semver]` (ex: `20260624c-v1.5.87`).
Bumpar `version` no `package.json` do serviço antes de buildar.

---

## CRITICAL PATTERNS (descobertos em produção)

### 1. Middleware order em server.js — ordem importa
`/api/public/cancelar` **deve** ser montado antes de `/api/public/:slug` — caso contrário o Express captura "cancelar" como slug.
`/api/agente-ia` é montado **antes** do `tenantMiddleware` global porque tem webhook público (`POST /webhook/:slug`). Rotas protegidas dentro dele aplicam `[tenantMiddleware, auth]` inline.

### 2. `enfileirar()` — nunca `await` em handler HTTP
A fila WA tem delay 7–20s e bloqueia fora da janela horária (11h–23h UTC = 08h–20h BRT). `await enfileirar()` dentro de rota HTTP causa timeout 504 e UI travada.
```js
// CORRETO — fire-and-forget
const log = await prisma.mensagemLog.create({ data: { ...status: 'enviado' } });
enfileirar(tenant, telefone, corpo).catch(e =>
  prisma.mensagemLog.update({ where: { id: log.id }, data: { status: 'erro', erroMsg: e.message } }).catch(() => {})
);
return res.json({ ok: true });
```

### 3. `decryptTenant()` antes de qualquer chamada Evolution API
`evolutionApiKey` é salvo criptografado via `encrypt()`. Usar `tenant.evolutionApiKey` diretamente envia o ciphertext como header `apikey` — Evolution API aceita HTTP 200 mas a mensagem nunca chega.
```js
const { decrypt } = require('../lib/encrypt');
const apikey = decrypt(tenant.evolutionApiKey) || tenant.evolutionApiKey; // fallback para tenants antigos
```

### 4. Prisma + JSONB — nunca serializar manualmente
Campo `Json` do Prisma retorna/salva JS arrays/objects diretamente.
```js
// ERRADO
JSON.parse(tenant.modulos)        // Prisma já parseou
JSON.stringify(newModulos)        // Prisma serializa sozinho

// CORRETO
const mods = normalizarModulos(tenant.modulos); // lib/encrypt.js
await prisma.tenant.update({ data: { modulos: newArray } });
```
`normalizarModulos(m)` em `lib/encrypt.js` é a única função autorizada para normalizar o campo `modulos` — não reescrever inline.

### 5. Janela horária da fila WA é em UTC
Container Docker roda em UTC. `HORA_INICIO=11, HORA_FIM=23` corresponde a 08h–20h BRT (UTC-3). Nunca alterar para horas "locais" sem converter.

### 6. Telefone para Evolution API — sempre com código do país
Números no banco podem estar sem `55`. Normalizar antes de enviar:
```js
const digits = (tel || '').replace(/\D/g, '');
const phone  = digits.startsWith('55') ? digits : '55' + digits;
```

### 7. Rate limiters — cada endpoint público precisa do seu
O `apiGeralLimiter` (300 req/min) é o fallback global. Endpoints públicos que acionam serviço externo pago (Claude API, SMS) ou aceitam dados em lote precisam de limiter próprio mais restrito, aplicado **antes** da rota:
```js
app.use('/api/public/cancelar', cancelarLimiter);      // 10/15min
// routes/agenteIa.js:
router.post('/webhook/:slug', agenteIaWebhookLimiter, handler); // 30/min
```

### 8. PowerShell — encoding de arquivos
`Set-Content -Encoding UTF8` no PS 5.1 grava UTF-16 LE com BOM, quebrando `prisma generate` no Docker. Usar:
```powershell
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding $false))
```

### 9. Migrations com enum — não usar `prisma migrate dev` em prod
Se houver enum changes anteriores, `prisma migrate dev` falha com P3006 (shadow DB). Criar o SQL manualmente em `prisma/migrations/YYYYMMDD_nome/migration.sql`. O `entrypoint.sh` roda `prisma migrate deploy` automaticamente no boot.

### 10. `lib/waQueue.js` está deprecated
O arquivo `lib/waQueue.js` ainda existe mas não deve ser importado em código novo. Usar sempre `services/waQueue.js` (Sprint 3, com todas as 7 camadas de proteção anti-ban).

---

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

---

## DESIGN SYSTEM

> Estas regras se aplicam a TODO trabalho de frontend. São tão obrigatórias quanto as regras de segurança acima.

### Identidade Visual

**Produto**: SaaS de agendamento para pequenos negócios brasileiros (salões, clínicas, autônomos).
**Posicionamento**: Tecnologia premium acessível — deve parecer de nível internacional sem intimidar.
**Palavra-chave**: *Confiança elegante.* Cada pixel comunica que foi feito com cuidado.
**Referências**: Linear.app (escuro, técnico, espaçamento generoso) + Stripe (tipografia forte, hierarquia clara).

---

### Paleta de Cores

```css
:root {
  /* Fundos */
  --bg-primary:    #0C0C0F;
  --bg-secondary:  #111116;
  --bg-tertiary:   #18181F;
  --bg-elevated:   #1E1E28;

  /* Bordas */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong:  rgba(255,255,255,0.18);

  /* Acento principal — Verde-esmeralda aquecido */
  --accent-primary: #00C97A;
  --accent-hover:   #00E589;
  --accent-muted:   rgba(0,201,122,0.12);
  --accent-glow:    rgba(0,201,122,0.20);

  /* Acento secundário — Âmbar (WhatsApp / notificações) */
  --accent-amber:       #F5A623;
  --accent-amber-muted: rgba(245,166,35,0.12);

  /* Texto */
  --text-primary:   #F0F0F5;
  --text-secondary: #9090A8;
  --text-tertiary:  #5A5A72;
  --text-inverse:   #0C0C0F;

  /* Status */
  --success: #00C97A;
  --warning: #F5A623;
  --error:   #FF4757;
  --info:    #4A9EFF;

  /* Gradientes */
  --gradient-card: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, transparent 100%);
  --gradient-glow: radial-gradient(ellipse at top, rgba(0,201,122,0.15) 0%, transparent 60%);
}
```

**PROIBIDO**: `#6366f1`, `#8b5cf6`, `#a855f7` (roxo genérico), `#2563eb`, `#3b82f6` (corporate blue), fundo branco puro.

---

### Tipografia

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

:root {
  --font-display: 'Instrument Serif', Georgia, serif; /* Títulos hero, KPIs grandes */
  --font-body:    'DM Sans', sans-serif;              /* Interface, labels, body */
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;
}
```

**PROIBIDO**: Inter, Roboto, Poppins, Montserrat, Space Grotesk, Open Sans.

Hierarquia:
- **Display** (hero/KPI): `Instrument Serif`, 400 weight, `letter-spacing: -0.02em`
- **H1** (títulos de página): `DM Sans`, 600, `letter-spacing: -0.025em`
- **Label** (categorias): `DM Sans`, 500, `font-size: 11px`, `letter-spacing: 0.08em`, `text-transform: uppercase`
- **Body**: `DM Sans`, 400, `font-size: 15px`, `line-height: 1.6`

---

### Componentes Obrigatórios

**Cards**
```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
  background-image: var(--gradient-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  border-color: var(--border-default);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
```

**Botão Primário**
```css
.btn-primary {
  background: var(--accent-primary);
  color: var(--text-inverse);
  font-size: 0.875rem; font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px; border: none;
}
.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px var(--accent-glow);
  transform: translateY(-1px);
}
```

**Botão Secundário (Ghost)**
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  padding: 10px 20px; border-radius: 8px;
}
.btn-secondary:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-strong);
}
```

**Inputs**
```css
.input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9375rem;
  padding: 10px 14px;
}
.input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-muted);
  outline: none;
}
```

**Badges de Status**
```
Confirmado → fundo rgba(0,201,122,0.12)  · texto #00C97A
Pendente   → fundo rgba(245,166,35,0.12) · texto #F5A623
Cancelado  → fundo rgba(255,71,87,0.12)  · texto #FF4757
Neutro     → fundo var(--bg-tertiary)    · texto var(--text-secondary)
border-radius: 9999px · padding: 3px 10px · font-size: 11.5px
```

---

### Efeitos Visuais

```css
/* Noise texture — aplicar no body */
body::after {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 9999; opacity: 0.4;
}

/* Card destaque com acento no topo */
.card-featured {
  border-top: 1px solid var(--accent-primary);
  box-shadow: inset 0 1px 0 0 var(--accent-muted);
}

/* Glow em CTAs e métricas principais */
.glow-accent {
  box-shadow: 0 0 40px var(--accent-glow), 0 0 80px rgba(0,201,122,0.08);
}
```

---

### Animações

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Entrada escalonada de listas */
.animate-in { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.10s; }
.delay-3 { animation-delay: 0.15s; }
.delay-4 { animation-delay: 0.20s; }
.delay-5 { animation-delay: 0.25s; }
```

---

### Iconografia

- **Biblioteca**: Lucide React — NUNCA Font Awesome, Material Icons ou emojis como ícone de UI
- **Stroke width**: `1.5` em todos os ícones
- **Tamanhos**: 16px (inline), 20px (botões/nav), 24px (destaque)

---

### Contexto do Produto

**WhatsApp**: usar `--accent-amber` (#F5A623) em tudo relacionado ao WhatsApp — nunca o verde do acento principal.

**Status de agendamento**:
- Confirmado → badge-success + ícone `<Check>`
- Pendente   → badge-warning + ícone `<Clock>`
- Cancelado  → badge-error + ícone `<X>`
- Concluído  → badge-neutral + ícone `<CheckCheck>`

**KPIs / métricas**: número grande em `--font-display` (Instrument Serif), label em caps pequeno abaixo.

---

### O Que NUNCA Fazer no Frontend

```
❌ border-radius > 16px em cards
❌ Gradiente roxo, azul-roxo ou qualquer gradiente "tech genérico"
❌ Fundo branco com texto cinza simples
❌ Inter, Roboto, Poppins, Montserrat, Space Grotesk
❌ Ícones Font Awesome ou Material Icons
❌ Animações bounce/elastic em UI de negócios
❌ Mais de 3 cores em uma única tela
❌ Botões com padding vertical < 10px
❌ Cards sem border
❌ --accent-primary em textos longos (só destaques pontuais)
```

---

### Checklist de Qualidade Frontend

Antes de declarar qualquer página de frontend concluída:
- [ ] Fontes corretas? (Instrument Serif display + DM Sans interface)
- [ ] Paleta respeitada? Sem roxo, sem branco puro, sem corporate blue
- [ ] Padding mínimo 24px em cards
- [ ] Todos os elementos interativos têm hover state
- [ ] Hierarquia visual clara (olho sabe onde ir primeiro)
- [ ] Animações de entrada escalonadas
- [ ] Ícones Lucide com stroke 1.5
- [ ] Noise texture aplicada no body
- [ ] Responsivo (mobile: sidebar → bottom nav ou drawer)