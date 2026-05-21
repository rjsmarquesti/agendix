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