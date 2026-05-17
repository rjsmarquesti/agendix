# Manual Técnico — Módulo Agente IA
> Agendix · Versão 1.0 · Planos Premium e Business

---

## 1. Visão Geral da Arquitetura

O Agente IA é um módulo de atendimento automático via WhatsApp integrado ao Agendix. Cada tenant com plano elegível recebe um agente configurável que responde mensagens usando Claude Haiku (Anthropic).

### Fluxo de uma mensagem

```
WhatsApp do cliente
  ↓
Evolution API (instância do tenant)
  ↓  evento: MESSAGES_UPSERT
POST /api/webhook/agente/:slug
  ↓
webhook.js — extrai phone + text, localiza tenant por slug
  ↓
botAgendamentoService.js — tenta processar como agendamento
  ↓ (retorna false se não for conversa de agendamento)
agentService.js — verifica AgentConfig, horário, sessão
  ↓
POST api.anthropic.com/v1/messages (claude-haiku-4-5-20251001)
  ↓
sendWhatsApp() → Evolution API → cliente
```

---

## 2. Arquivos do Módulo

| Arquivo | Função |
|---|---|
| `backend/src/routes/webhook.js` | Endpoint de entrada da Evolution API; roteia para bot ou agente |
| `backend/src/routes/agenteIa.js` | Rotas REST de configuração do agente por tenant |
| `backend/src/services/agentService.js` | Core: sessão, chamada Claude, envio WA |
| `backend/src/services/botAgendamentoService.js` | State machine de agendamento (tem prioridade sobre o agente) |
| `backend/src/config/planos.js` | Guard de plano: `AGENTE_IA` |
| `backend/prisma/schema.prisma` | Modelos: `AgentConfig`, `AgentSession`, `AgentLead` |
| `backend/prisma/migrations/20260509024406_add_agente_ia` | Migration das 3 tabelas |
| `frontend/src/pages/Settings.jsx` | Aba "Agente IA" no painel do tenant |

---

## 3. Banco de Dados

### AgentConfig
Configuração do agente por tenant (1:1).

| Coluna | Tipo | Descrição |
|---|---|---|
| `tenant_id` | INT (FK) | Tenant dono da config |
| `ativo` | BOOLEAN | Liga/desliga o agente |
| `persona` | TEXT | Nome/persona do agente (ex: "Ana") |
| `promptBase` | TEXT | System prompt completo enviado ao Claude |
| `horario_inicio` | TEXT | Hora de início do atendimento (ex: "09:00") |
| `horario_fim` | TEXT | Hora de fim (ex: "18:00") |
| `dias_uteis` | TEXT | Dias separados por vírgula (ex: "1,2,3,4,5") — 0=Dom, 6=Sáb |
| `msg_fora_horario` | TEXT? | Mensagem enviada fora do horário configurado |

### AgentSession
Histórico de conversa por lead (TTL 30 minutos de inatividade).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | TEXT (PK) | Telefone do lead (ex: "5561999990000") |
| `tenant_id` | INT (FK) | Tenant |
| `messages_json` | JSONB | Array `[{role, content}]` — histórico completo da sessão |
| `last_activity` | TIMESTAMP | Atualizado a cada mensagem; sessão expira após 30 min |

### AgentLead
Lead captado pelo agente (upsert por telefone+tenant).

| Coluna | Tipo | Descrição |
|---|---|---|
| `tenant_id` | INT (FK) | Tenant |
| `telefone` | TEXT | Número do lead |
| `nome` | TEXT? | Nome (quando identificado) |
| `primeira_msg` | TEXT? | Primeira mensagem recebida |
| `sent_checkout` | BOOLEAN | True após envio do link de checkout |

---

## 4. Rotas da API

Todas as rotas exigem JWT de tenant autenticado (`tenantMiddleware`). Tenants sem plano Premium/Business recebem `402`.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/agente-ia/config` | Retorna a AgentConfig do tenant |
| PUT | `/api/agente-ia/config` | Cria ou atualiza a AgentConfig |
| POST | `/api/agente-ia/toggle` | Alterna `ativo` true/false |
| GET | `/api/agente-ia/leads` | Lista últimos 100 AgentLeads |
| GET | `/api/agente-ia/stats` | Retorna `totalLeads`, `checkouts`, `sessoes` |

### PUT /api/agente-ia/config — body

```json
{
  "persona": "Ana",
  "promptBase": "Você é a Ana, assistente da Clínica X...",
  "horarioInicio": "09:00",
  "horarioFim": "18:00",
  "diasUteis": "1,2,3,4,5",
  "msgForaHorario": "Olá! Atendemos de seg a sex, das 9h às 18h."
}
```

---

## 5. Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Sim | Chave da API Anthropic (console.anthropic.com) |

As demais variáveis de Evolution API são armazenadas por tenant no banco (`evolutionInstance`, `evolutionApiKey`, `evolutionBaseUrl`).

---

## 6. Modelo de IA

- **Modelo:** `claude-haiku-4-5-20251001`
- **Max tokens:** 200 (respostas curtas, adequado para WhatsApp)
- **System prompt:** `config.promptBase` (configurado pelo tenant)
- **Histórico:** Enviado completo a cada chamada (janela de contexto da sessão)
- **Detecção de intenção de compra:** Após 8+ mensagens com palavras-chave (`quero`, `compra`, `valor`, `preço`, `quanto`, `custa`, `funciona`, `começar`, `assinar`, `plano`) → envia link de checkout extraído do `promptBase` e marca `sentCheckout = true`

---

## 7. Integração Evolution API

O webhook da Evolution API deve ser configurado por instância (por tenant):

- **URL:** `https://agendix.divulgabr.com.br/api/webhook/agente/{slug-do-tenant}`
- **Evento:** `MESSAGES_UPSERT`
- **Método:** POST

O backend ignora automaticamente:
- Mensagens enviadas pelo próprio número (`fromMe: true`)
- Mensagens de grupos (`remoteJid` contendo `@g.us`)
- Mensagens sem texto (áudio, imagem, etc.)

---

## 8. Lógica de Prioridade

O webhook tenta o **bot de agendamento primeiro**. O agente IA só é acionado se o bot retornar `false` (quando o cliente não está em fluxo de agendamento ativo).

```js
const handled = await handleBotMessage(tenant, phone, text);
if (!handled) await handleMessage(tenant, phone, text);
```

Isso significa que um tenant pode ter os dois ativos simultaneamente: o bot cuida de agendamentos e o agente responde perguntas gerais/vendas.

---

## 9. Guard de Plano

Definido em `backend/src/config/planos.js`:

```js
AGENTE_IA: { basico: false, pro: false, premium: true, business: true }
```

Tenants dos planos Básico e Pro recebem `HTTP 402` ao acessar qualquer rota `/api/agente-ia/*`.

---

## 10. Deploy

### Imagens atuais (última build)
- `rjsmarquesti/agendix-backend:20260514a`
- `rjsmarquesti/agendix-frontend:20260514a`

### Variável obrigatória no EasyPanel (serviço `agendix-backend`)
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Migration
A migration `20260509024406_add_agente_ia` cria as tabelas automaticamente via `prisma migrate deploy` no startup do container.

---

## 11. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| Agente não responde nenhuma mensagem | `ANTHROPIC_API_KEY` não configurada | Adicionar no EasyPanel e redeployar |
| Agente não responde mesmo com chave configurada | `AgentConfig.ativo = false` ou tenant sem plano elegível | Verificar toggle na aba e plano do tenant |
| Resposta "Desculpe, não consegui responder agora" | Erro na chamada Anthropic (chave inválida, limite atingido) | Verificar logs do container e status da chave |
| Mensagens de agendamento sendo respondidas pelo agente | `botAgendamentoService` retornando `false` indevidamente | Verificar se o tenant tem Evolution API configurada corretamente |
| Checkout enviado mas URL em branco | `promptBase` não contém URL no formato `https://...` | Orientar tenant a incluir o link de checkout no prompt |
| Agente responde fora do horário | `AgentConfig` sem `msgForaHorario` configurada | Campo opcional — se vazio usa mensagem padrão do código |

---

## 12. Custo estimado (Claude Haiku)

- Entrada: ~$0.80/MTok · Saída: ~$4.00/MTok
- Conversa média (10 trocas, ~500 tokens): **~R$ 0,003**
- 1.000 conversas/mês: **~R$ 3,00**
- Margem sobre plano Premium (R$ 97): **>99%**
