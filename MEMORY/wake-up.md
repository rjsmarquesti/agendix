# Wake-Up — Agendix

> Claude: leia este arquivo no início de cada sessão antes de qualquer ação.

**Última sessão:** 2026-09-19 00:45
**Último deploy:** 2026-09-19 ✅ — backend `20260919a-v1.13.0` — frontend `20260919b-v1.11.0` (EasyPanel `desenvolvimento`)

---

## Estado Atual

### O que está funcionando
- **Auth/Core** — JWT (access 15min + refresh 7d), 2FA TOTP opcional (`admin`/`super_admin`), RBAC granular (`user_permissions`), CRUD Leads/Agendamentos/Serviços/Usuários, agendamento público por slug com recorrência e cancelamento por link
- **Financeiro & Pagamentos** — módulo financeiro (plano Pro+), assinatura Mercado Pago inline (mensal/anual, 20% desconto anual), liberação manual de plano pelo admin
- **WhatsApp** — Evolution API + QR code, 4 provedores (Evolution/Meta/Twilio/Z-API), fila anti-ban de 7 camadas (janela 08–20h BRT, limite diário 200, limite/hora 30, circuit breaker, reputação, dedup, delay 7–20s), Atendimento humano (fila + atendentes), Agente IA (Claude API via fetch direto)
- **Módulos por nicho** — Fichas, Anamnese, Prontuários, Documentos, Orçamentos, Ordem de Serviço, Processos — todos com PDF exportável (exceto Processos), campos dinâmicos por nicho
- **Prospecção** — Kanban 7 colunas, histórico de atividades, follow-up, extrator Google Maps (drawer + webhook)
- **Admin/Plataforma** — painel super admin completo (tenants, financeiro, backups, consumo, logs, usuários, WA anti-ban, mensagens em massa), módulos seletivos por tenant
- **Segurança** — WAF, honeypot, IP block, rate limiters dedicados por rota sensível, SIEM (Loki+Grafana+`security_incidents`), criptografia AES-256 em PII, isolamento multi-tenant cross-check (JWT × header)
- **Infra** — PWA (manifest+SW+ícones), Web Push (VAPID), container roda como usuário não-root

**Artifacts entregues (sessões anteriores):**
- [Atlas do Agendix](https://claude.ai/code/artifact/52bfdd8e-4b5a-4b45-9114-05570fac6da1) — mapa visual de recursos
- [Lançamento do Agendix](https://claude.ai/code/artifact/067b1c69-ecbc-4565-ae9a-4f280d10c25d) — roteiro de testes priorizado (checklist interativo)

### Em andamento — Independência do n8n (bot de agendamento via WhatsApp)
Plano completo em `C:\Users\Rogério\.claude\plans\verifique-toda-estrutura-agendix-rosy-stardust.md`. Auditoria confirmou que quase tudo já é 100% nativo (lembretes, agenda do dia, e-mails, webhook MP); só o bot de agendamento via WhatsApp tinha 3 gaps que só existiam no n8n.

- ✅ **Fase 2 concluída e deployada (`20260913a-v1.9.0`):** cancelar via WhatsApp, consultar próximo agendamento via WhatsApp, classificação de intenção em linguagem livre (Claude API), lembrete de 3 dias — tudo com TDD (Postgres+Redis reais).
- ✅ **Fase 3 iniciada — tenant `divulgabr` migrado e testado ao vivo:** webhook da Evolution reapontado pro bot nativo (`AP-026` — a instância real exige POST + corpo aninhado sob `"webhook"`, divergente da doc oficial). Testes ao vivo revelaram e corrigiram 4 bugs, do mais superficial ao mais profundo: (1) concorrência — Evolution reenviando mensagem duplicada → dedup por `messageId` via Redis; (2) fuso horário — fila anti-ban bloqueava resposta de conversa fora de 08h-20h BRT → mensagens de conversa ativa agora são `prioritario: true`; `TZ=America/Sao_Paulo` setado no container; (3) AP-029 — aviso ao admin dentro do try da confirmação/cancelamento fazia falha alheia virar "erro" falso pro cliente (2 ocorrências no mesmo arquivo); (4) **AP-030 (causa raiz real) — `sendWA` fazia `result.ok` numa Promise que `enfileirar` NUNCA resolve com valor** — toda mensagem enviada com sucesso quebrava depois de já entregue, só visível nos 2 fluxos com catch-pro-cliente. Achado instrumentando o catch com log de stack trace depois que os fixes 1-3 não eliminaram o sintoma.
- ✅ **`divulgabr` migrado 100% pro bot nativo (15/09/2026):** checklist completo — agendar ✅, cancelar ✅, consultar próximo agendamento ✅, frase livre ✅ (delay de 7-20s observado no teste é o `randomDelay()` do anti-ban por design, não bug). `n8nAtivo` desligado manualmente pelo Rogério no Admin → Clientes (disparou `desativarWorkflows(tenant)` automaticamente).
- 🔧 **Bug encontrado e corrigido (16/09/2026):** botão "Reconfigurar Webhook" (Admin → Clientes → modal WhatsApp) sempre mostrava toast de erro (`Cannot read properties of undefined`) mesmo quando o webhook era configurado com sucesso — `AdminClientes.jsx` lia `res.data.webhook`, mas `api.post()` já retorna o body direto (não é axios, não tem `.data`). Corrigido pra `res.webhook`. Deployado (`frontend:20260916b-v1.9.1`) — sem isso o botão que o Rogério precisa usar pro `eletricomtec` mentiria "erro" mesmo funcionando.
- ✅ **`eletricomtec` migrado 100% pro bot nativo (16/09/2026):** webhook reconfigurado, mensagem de teste real confirmou o bot respondendo, `n8nAtivo` desligado pelo Rogério (ícone de raio ⚡ na linha do tenant, Admin → Clientes → AÇÕES). Igual ao `divulgabr`.
- 🔴 **`aurifrio`/`oticasrafa` — BLOQUEADOS, dependem do cliente final (16/09/2026):** checados ao vivo no Evolution Manager (`api.divulgabr.com.br`), ambas as instâncias existem mas estão com status **"Connecting"** (desconectadas, precisam escanear QR Code de novo):
  - `oticasrafa` — 0 contatos/chats/mensagens, parece nunca ter sido pareada de fato (ou zerada). Instância + API key visíveis no manager, ainda não copiadas pro Agendix.
  - `aurifrio` — 32 contatos/9 chats/119 mensagens (já teve uso real, sessão caiu — perfil pareado antes: "Refrigeração & Climatizaç..." / 558494571703). Instância + API key também visíveis no manager.
  - **Bloqueio real:** migrar pro bot nativo não resolve nada enquanto a instância não estiver conectada — precisa do dono de cada negócio escanear o QR Code com o celular deles. Isso é ação do cliente final, fora do controle do Rogério/Claude nesta sessão.
  - **Próximos passos quando reconectarem:** copiar instância+API key do Evolution Manager direto pro Agendix (Configurações→WhatsApp do tenant, ou Admin→Clientes→Editar) → reconfigurar webhook → testar → desligar `n8nAtivo`. Mesmo roteiro do `eletricomtec`.
- AP-026 a AP-030 já **deployados** em PsiConnect (`20260914b-v1.2.3`) e LexCRM (`20260914c-v1.0.10`), `TZ=America/Sao_Paulo` setado nos dois.
- Fase 4 (remover código/schema do n8n) só depois de todos os tenants migrados — decisão separada.

### Feature nova — Confirmação de presença 1 dia antes (reduzir no-show)
Toggle opt-in `confirmacaoLembreteAtiva` em Configurações (default off). Ligado, o lembrete de 1 dia vira pergunta sim/não: "sim" confirma (status `confirmado`), "não" cancela e libera o horário (status `cancelado` + aviso ao admin). Sem estado/conversa — identifica a resposta por telefone + agendamento de amanhã com `lembrete1dEnviado: true` (expira sozinho, sem TTL manual). Deployado (`v1.10.0`/`v1.8.0`). **Pendente:** propagar pra PsiConnect/LexCRM depois de validar em produção.

### Testes do menu Comunicação (4 submenus) — em andamento (16/09/2026)
Pipeline único descoberto/confirmado lendo `routes/webhook.js` (`handleInboundMessage`): `handleBotMessage` (bot agendamento) → se não resolver, `handleMessage` (Agente IA) → se não resolver e tenant tiver módulo `wa_atendimento`, cai na fila humana. Os 4 submenus (Mensagens `/mensagens`, Fila Anti-ban `/wa-fila`, WhatsApp atendimento `/wa-atendimento`, Agente IA `/agente-ia`) são a superfície de UI desse funil único.
- **Achado:** a aba "Webhook" de `/agente-ia` mostra `/api/agente-ia/webhook/:slug` — rota legada/separada (`routes/agenteIa.js:135`), redundante pro `divulgabr` (que já usa o webhook único `/api/webhook/agente/:slug`). Não configurar as duas ao mesmo tempo.
- **Mensagens testado (15/09):** envio manual funciona, mas revelou uma lacuna real — envio fora da janela 08h-20h fica preso na fila (não é `prioritario`) e o `mensagemLog` mostra `status: enviado` de forma otimista (setado no enfileiramento, não na entrega real). Motivou a feature abaixo.
- **Confirmado explicitamente (16/09):** Agente IA e WhatsApp atendimento humano nunca foram testados em NENHUM tenant até agora — território 100% novo, sem histórico de uso real em produção.
- ✅ **Fila Anti-ban** — painel novo testado indiretamente (ver feature abaixo). **Agente IA** — ainda não testado. **WhatsApp atendimento humano** — testado pela 1ª vez, achou e corrigiu um bug real (ver seção abaixo).

### Feature nova — Painel de fila detalhada + "Disparar agora" (`/wa-fila`) — deployada 16/09/2026
Pedido do Rogério após o achado acima: ver as mensagens individuais pendentes na fila (não só a contagem) e poder forçar o envio imediato de uma mensagem específica.
- `backend/src/services/waQueue.js`: item da fila ganhou `id` (contador incremental) e `enqueuedAt`; lógica de sucesso/falha de envio extraída em `aplicarSucessoEnvio`/`aplicarFalhaEnvio` (move-only, mesmo comportamento) pra reuso; novas funções `listarFilaDetalhada(instance)` (leitura serializável, nunca vaza `resolve`/`reject`/`tenant`) e `forcarDisparoImediato(instance, itemId)` (escape hatch admin — ignora janela, rate limit, limite diário, circuit breaker, reputação **e** dedup, decisão consciente do Rogério).
- `backend/src/routes/waFila.js`: `GET /fila-detalhada` e `POST /disparar-agora/:id` (admin/super_admin), endpoints novos e separados de `/stats` (evita custo de ETA no polling de 30s existente).
- `frontend/src/pages/WaFila.jsx`: nova seção "Mensagens na fila agora" com telefone, preview, badge prioritário, tempo aguardando, ETA estimado e botão vermelho "Disparar agora" por linha; polling de 5s só enquanto há pendentes.
- TDD: 20 testes novos (`waQueueDisparoForcado.test.js` + `waFilaDisparoForcado.test.js`), suíte completa 72/72 GREEN (zero regressão, `waQueuePriority.test.js` passou sem alteração).
- Plano completo em `C:\Users\Rogério\.claude\plans\verifique-toda-estrutura-agendix-rosy-stardust.md`.

### Bug encontrado e corrigido — Atendimento humano nunca registrava mensagens do cliente (16/09/2026)
Primeiro teste real do módulo WhatsApp — Atendimento humano (`divulgabr`): mandou mensagem fora do escopo do bot ("Fazem manutenção de site?") e ela não apareceu em lugar nenhum — nem notificação, nem em "Ver conversa" do card já existente na fila (aberto 3 dias antes, nunca encerrado).
- **Causa:** `prisma.waConversaLog.create` só existia num endpoint manual (`POST /wa-atendimento/fila/:id/logs`) — o fluxo automático (`handleInboundMessage`, `webhook.js`) criava a `WaFila` só na 1ª mensagem sem sessão aberta e nunca logava o conteúdo; mensagens seguintes (sessão já aberta) não deixavam rastro nenhum.
- **Fix:** `webhook.js` agora sempre chama `waConversaLog.create` (direção `entrada`, fonte `cliente`) tanto na 1ª mensagem quanto nas seguintes de uma sessão já aberta. Precisou de um novo valor no enum `FonteMsg` (`+ cliente`) — migration `20260916a_add_fontemsg_cliente`.
- **Achado de processo:** `git stash` nesse repo é perigoso — o HEAD do git está muito atrás do working tree (deploys sempre feitos direto do working tree via Docker, sem commit). Um `git stash push` reverteu ~40 arquivos de uma vez; `git stash pop` recuperou tudo sem perda, mas o aprendizado é **nunca usar stash pra isolar uma mudança pontual nesse projeto**.
- TDD: `waAtendimentoFallbackLog.test.js` (3 testes). Suíte completa: 74/75 (1 falha = flake conhecida do `n8n.test.js`, não relacionada).
- Deploy: `agendix-backend:20260916b-v1.11.1`.

### 2º bug encontrado e corrigido — "Erro ao carregar logs" ao clicar "Ver conversa" (16/09/2026)
Imediatamente depois do fix acima: clicar "Ver conversa" na Fila Ativa dava toast genérico de erro. Causa: `waAtendimento.js:225` (`GET /fila/:id/logs`) — `waConversaLog.findMany({ where: { filaId: id } })` sem `tenantId`, disparando `TENANT_ISOLATION_VIOLATION` (mesmo guard que já tinha pego no meu próprio teste do fix anterior). Bug pré-existente, nunca detectado porque "Ver conversa" nunca tinha sido clicado com sucesso em produção. Fix de 1 linha (`tenantId: req.tenant.id` no where). Revisado o arquivo inteiro — única ocorrência. TDD: `waAtendimentoLogsRoute.test.js` (2 testes, RED confirmado revertendo via Edit — não `git stash`). Deploy: `agendix-backend:20260916c-v1.11.2`.

**Propagado pro LexCRM (17/09/2026):** mesmo código idêntico, mesmo bug confirmado via grep — `lexcrm-backend:20260917a-v1.0.11`. PsiConnect não tem o módulo `wa_atendimento` (arquivo não existe), nada a propagar lá. LexCRM sem infra de teste local — só `node --check`, sem TDD real contra banco de dados (decisão explícita do Rogério de aceitar o risco, já que o código é idêntico ao já provado no Agendix). Pendência registrada: montar `docker-compose.test.yml` pro LexCRM numa próxima sessão.

### Issues abertas
- Pagamento via MP: liberação automática pós-pagamento (webhook confirma `planoStatus=ativo`) ainda não testada ponta a ponta com dados reais
- Isolamento multi-tenant (fix C1/C2 de 31/07) nunca foi validado com credenciais reais de dois tenants distintos
- `errorHandler.js` mascara 401 de API externa como 502 (AP-025) — decisão de arquitetura pendente, não urgente
- Tenant `mandi`/Amanda está com `ativo: false` — motivo não investigado, fora de escopo até decisão separada
- **`routes/webhook.js:262-264`** — `prisma.lead.upsert({ where: { telefone_tenantId } })` referencia chave composta inexistente no schema (`Lead` só tem `@@unique([placeId, tenantId])`); erro sempre lançado e engolido por `.catch(() => {})` — feature "qualquer contato WA vira lead" está no-op silenciosamente. Achado 14/09, não corrigido.

---

## Decisões Recentes (não esquecer)
— (preencher: `DECIDED:` para decisões tomadas, `BLOCKED:` para o que está travado esperando algo)

---

## Atenção / Cuidados
- `express.raw` para Meta/Mercado Pago fica ANTES do `express.json` no `server.js` — não mover
- Migration `20260523c_reestrutura_planos` não pode ser editada (já aplicada em produção) — qualquer banco novo precisa rodar `backend/prisma/scripts/bootstrap-fresh-db.js` antes de `migrate deploy`, senão trava (AP-019)
- Ao criar rota tenant-scoped nova para módulo "extra": sempre aplicar `requireModulo('nome')` (`backend/src/middlewares/requireModulo.js`), nunca só `auth` — ver AP-018
- `evolutionService.js` → `setWebhook`: a instância real (`api.divulgabr.com.br`, fork "evolution_exchange" v2.3.7) exige POST + corpo aninhado sob `"webhook"` — não confiar na doc oficial genérica pra formato de corpo dessa API sem testar ao vivo primeiro (AP-026)
- Container roda com `TZ=America/Sao_Paulo` (setado 13/09) — qualquer `new Date().getHours()/getDate()/getDay()` novo já reflete BRT direto, **nunca** adicionar offset manual de +3h como o antigo `HORA_INICIO=11/HORA_FIM=23` do `waQueue.js` (isso já foi corrigido pra 8/20, mas se algum código novo copiar o padrão antigo fica errado)
- `waQueue.enfileirar(tenant, tel, msg, { prioritario: true })` pula a janela 08h-20h — usar **só** pra resposta a conversa que o cliente iniciou agora (bot, Agente IA); nunca pra lembrete/disparo em massa
- Testar ambiente local: `docker compose -f backend/docker-compose.test.yml up -d` (Postgres 5433 + Redis 6380) antes de `npm test` — sem isso todos os testes falham com "Can't reach database server"
- `prisma.agendamento.updateMany`/`deleteMany` (e outros models tenant-scoped) **sempre** precisam de `tenantId` explícito no `where` — `prismaMiddleware.js` tem uma checagem de isolamento que lança `TENANT_ISOLATION_VIOLATION` se faltar (pego pelos testes, não em produção, mas fácil esquecer ao copiar um `updateMany` novo)
- Banco de teste local (`agendix-postgres-test`, porta 5433) já tem as migrations marcadas como aplicadas via `bootstrap-fresh-db.js` — pra migration nova, **não** rodar `prisma migrate dev` (usa shadow DB, recria tudo do zero e trava na `20260523c_reestrutura_planos`, ver AP-019); escrever o `migration.sql` à mão e rodar `prisma migrate deploy` direto
- **NUNCA usar `git stash`/`git diff HEAD` neste repo pra isolar uma mudança pontual** — o HEAD do git está muito atrás do working tree (dezenas de arquivos modificados nunca commitados; deploys sempre feitos direto do working tree via Docker, só commita quando pedido explicitamente). Um `git stash push` reverte tudo, não só a mudança que você quer isolar. Pra confirmar RED de um fix, prefira inspeção de código (grep) ou comentar/renomear a função temporariamente.

---

## Contexto Crítico

- **Docker Hub:** `rjsmarquesti/agendix-backend:20260919a-v1.13.0` (produção) / `agendix-frontend:20260919b-v1.11.0` (produção)
- **Rollback backend:** `rjsmarquesti/agendix-backend:20260918a-v1.12.0` (antes do menu inicial)
- **Rollback frontend:** `rjsmarquesti/agendix-frontend:20260918b-v1.10.0` (antes do menu inicial)
- **Produção:** agendix.divulgabr.com.br (EasyPanel — projeto `desenvolvimento`)
- **Banco:** PostgreSQL 16 — 49 migrations, mais recente: `20260919a_add_menu_principal` (`EstadoConversa.aguardando_menu_principal` + `ConfiguracaoAgenda.menuInicialAtivo`).
- **MP:** assinatura inline sem preapproval_plan_id — preços hardcoded no `mercadoPagoService.js`; `MP_ACCESS_TOKEN` começa com `APP_USR-` (produção real)
- Volumes EasyPanel: `agendix-uploads` (/app/uploads) e `agendix-backups` (/app/backups)
- VAPID configurado: chaves em EasyPanel env

---

## Próximos Passos

- **Feature nova (19/09/2026): menu inicial de roteamento (Agendar / Atendente / Assistente IA).** Rogério notou que toda mensagem nova cai direto no agendamento, mesmo quando não é sobre isso. Opt-in por tenant (`ConfiguracaoAgenda.menuInicialAtivo`, desligado por padrão) — em Configurações → Agenda. Quando ligado, a 1ª mensagem de uma conversa nova (sem `ConversaWhatsapp`, sem sessão do Agente IA, sem `WaFila` aberta) mostra um menu numerado só com as opções que o tenant tem ativas. Extraído `waFilaHumanaService.js` (find-or-create fila + notificar + logar) do que antes era só inline em `webhook.js`, reusado tanto pelo fallback quanto pela opção "2" do menu. TDD 9/9 + suíte completa 95/95 GREEN (zero regressão real). Plano completo: `C:\Users\Rogério\.claude\plans\verifique-toda-estrutura-agendix-rosy-stardust.md`.
  - **Pendente de teste ao vivo:** ativar o toggle pro `divulgabr`, mandar "oi" de um número sem sessão ativa em nada, testar as 3 opções do menu.
- **Feature nova (18/09/2026): responder pelo painel no Atendimento humano.** Rogério perguntou como o atendente responde de verdade — descoberto que não existia forma nenhuma (só WhatsApp Web por fora). Implementado `POST /fila/:id/responder` (envia via `waQueue.enfileirar` com `prioritario:true`, fire-and-forget) + textarea no modal "Ver conversa". Vínculo de acesso reaproveita `Role.atendente` (já existia no enum `User`, ocioso) — `WaAtendente.userId` agora liga um atendente da fila a um login real; atendente-role só vê/responde sessões próprias + não atribuídas, admin vê tudo. Sem auto-atribuição ao responder sessão livre (decisão confirmada). TDD 9/9 GREEN, suíte completa 85/86 (1 falha = flake pré-existente do `n8n.test.js`, não relacionada). **Só Agendix — não propagado pro PsiConnect/LexCRM ainda** (módulo de lá é recente/não validado em produção). Plano completo: `C:\Users\Rogério\.claude\plans\verifique-toda-estrutura-agendix-rosy-stardust.md`.
  - **Pendente de teste ao vivo:** criar/usar um usuário `role: atendente`, vincular a um `WaAtendente` (aba Atendentes → dropdown), responder uma sessão real e confirmar que a mensagem chega no WhatsApp do cliente de teste.
- Testar Agente IA ao vivo (nunca testado) — preencher prompt, decidir se ativa
- PsiConnect: módulo Atendimento humano (`wa_atendimento`) ainda sem teste ao vivo com tenant real (código pronto/deployado — ver `project-psiconnect.md`)
- **Bloqueado (ação do cliente final):** `aurifrio`/`oticasrafa` — instâncias desconectadas no Evolution Manager, precisam que o dono de cada negócio escaneie o QR Code de novo antes de qualquer migração
- Propagar a feature "confirmação de presença 1 dia antes" pro PsiConnect/LexCRM (código só existe no Agendix por enquanto)
- Validar o isolamento multi-tenant com tenants reais de produção
- Decidir sobre `TOTP_MANDATORY` (ainda sem 5–10 clientes pagantes confirmados)
