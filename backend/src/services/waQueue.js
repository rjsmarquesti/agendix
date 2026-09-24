/**
 * Fila sequencial por instância Evolution API — Sprint 3 (Anti-ban completo)
 *
 * Garantias:
 *  - Uma mensagem por vez por instância (sem paralelismo)
 *  - Delay aleatório 7–20s entre envios
 *  - Janela horária: envios somente entre 08h–20h
 *  - Rate limit por hora: max 30 msg/h por instância
 *  - Hard limit diário: max 200 msg/dia por instância (reset à meia-noite)
 *  - Dedup anti-spam: descarta mensagem idêntica para o mesmo número em 1h
 *  - Circuit breaker por instância (waWatchdogService)
 *  - Score de reputação por destinatário (waReputacao):
 *      · 3 bounces consecutivos → número bloqueado 24h
 *      · Cria notificação interna de fallback para atendimento humano
 *      · Distingue erro do destinatário de erro da instância
 */

const { enviarMensagemWA, isSuspensa } = require('./waWatchdogService');
const { getProviderKey } = require('../lib/wa/index');
const rep = require('./waReputacao');

// ── Configurações anti-ban ────────────────────────────────────────────────────
const MIN_DELAY           = 7_000;    // 7s
const MAX_DELAY           = 20_000;   // 20s
const RATE_LIMIT_PER_HOUR = 30;       // mensagens/hora por instância
const HARD_LIMIT_DAY      = 200;      // mensagens/dia por instância
const DEDUP_WINDOW_MS     = 60 * 60 * 1000; // 1 hora — janela de dedup

// Janela horária — 08h–20h. Depende do container rodar com TZ=America/Sao_Paulo
// (env var no EasyPanel); sem isso, new Date().getHours() volta a ser UTC e a
// janela abre/fecha errado (era exatamente esse o bug antes — AP-011 tapava o
// sintoma com offset manual de +3h aqui, mas outros arquivos como
// agentService.js:isOpen() nunca tiveram o mesmo offset e ficavam errados).
const HORA_INICIO = 8;
const HORA_FIM    = 20;

// ── Estado em memória ─────────────────────────────────────────────────────────
// Map<instanceName, QueueState>
const queues = new Map();

// Dedup: Map<`${instance}:${telefone}:${hash}`, expiresAt>
const dedupCache = new Map();

// Contador incremental de id de item de fila — só precisa ser único dentro do
// processo Node (a fila não sobrevive a restart nem é compartilhada entre processos).
let nextItemId = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));
}

/** Chave de dedup: instância + telefone normalizado + conteúdo da mensagem */
function dedupKey(instance, telefone, mensagem) {
  const tel = telefone.replace(/\D/g, '');
  // Usa os primeiros 80 chars da mensagem como fingerprint (ignora variações de timestamp no final)
  const finger = mensagem.trim().slice(0, 80);
  return `${instance}:${tel}:${finger}`;
}

/** Retorna true se a mensagem for duplicata dentro da janela */
function isDuplicate(instance, telefone, mensagem) {
  const key = dedupKey(instance, telefone, mensagem);
  const exp = dedupCache.get(key);
  if (exp && Date.now() < exp) return true;
  return false;
}

/** Registra envio bem-sucedido no cache de dedup */
function registrarDedup(instance, telefone, mensagem) {
  const key = dedupKey(instance, telefone, mensagem);
  dedupCache.set(key, Date.now() + DEDUP_WINDOW_MS);
}

/** Limpa entradas expiradas do dedupCache (chamado a cada processamento) */
function limparDedupExpirados() {
  const agora = Date.now();
  for (const [k, exp] of dedupCache) {
    if (agora >= exp) dedupCache.delete(k);
  }
}

function getQueue(instance) {
  if (!queues.has(instance)) {
    const agora = Date.now();
    const meiaNuitePróxima = (() => {
      const d = new Date();
      d.setHours(24, 0, 0, 0);
      return d.getTime();
    })();
    queues.set(instance, {
      items:        [],
      processing:   false,
      // Por hora
      sentThisHour: 0,
      hourReset:    agora + 3_600_000,
      // Por dia
      sentToday:    0,
      dayReset:     meiaNuitePróxima,
    });
  }
  return queues.get(instance);
}

function resetContadoresSeNecessario(q) {
  const agora = Date.now();

  if (agora > q.hourReset) {
    q.sentThisHour = 0;
    q.hourReset    = agora + 3_600_000;
  }

  if (agora > q.dayReset) {
    q.sentToday = 0;
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    q.dayReset = d.getTime();
  }
}

/** Verifica se estamos dentro da janela permitida de envio */
function dentroJanela() {
  const h = new Date().getHours();
  return h >= HORA_INICIO && h < HORA_FIM;
}

/** Calcula ms até 08:00 (hoje se ainda não chegou, amanhã se já passou) */
function msAteProximaJanela() {
  const agora = new Date();
  const prox  = new Date(agora);
  prox.setHours(HORA_INICIO, 0, 0, 0);
  if (prox <= agora) prox.setDate(prox.getDate() + 1);
  return prox.getTime() - agora.getTime();
}

// ── Fallback humano ───────────────────────────────────────────────────────────

/**
 * Cria notificação interna para o tenant quando um número é definitivamente
 * bloqueado por reputação — sinaliza que o contato deve ser feito manualmente.
 */
async function criarNotificacaoFallback(tenant, telefone) {
  try {
    const prisma = require('../lib/prisma');
    await prisma.notificacao.create({
      data: {
        tenantId: tenant.id,
        tipo:     'wa_bounce',
        titulo:   `WA indisponível — ${telefone}`,
        corpo:    `O número ${telefone} não recebeu mensagens em 3 tentativas consecutivas. ` +
                  `Recomendado: entrar em contato por outro canal. ` +
                  `O número será desbloqueado automaticamente em 24h.`,
      },
    });
  } catch (err) {
    console.error('[waQueue] falha ao criar notificação de fallback:', err.message);
  }
}

/**
 * Heurística: diferencia erro do destinatário de erro da instância/rede.
 * Erros do destinatário NÃO devem penalizar o circuit breaker da instância.
 */
function ehErrodoDestinatario(err) {
  const msg = (err?.message || '').toLowerCase();
  // Respostas da Evolution API que indicam problema no número, não na instância
  return (
    msg.includes('invalid') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('invalid number') ||
    msg.includes('number not') ||
    (msg.includes('400') && (msg.includes('phone') || msg.includes('number')))
  );
}

// ── Efeitos colaterais de envio (extraído para reuso no disparo forçado) ──────

/** Aplica os efeitos colaterais de um envio bem-sucedido (dedup, reputação, contadores). */
function aplicarSucessoEnvio(q, instance, telefone, mensagem) {
  registrarDedup(instance, telefone, mensagem);
  rep.registrarSucesso(instance, telefone);
  q.sentThisHour++;
  q.sentToday++;
}

/**
 * Aplica os efeitos colaterais de uma falha de envio (reputação/fallback humano se
 * for erro do destinatário). Retorna { deveRejeitar } indicando se a Promise original
 * deve ser rejeitada (erro de instância/rede) ou resolvida sem erro (bounce do número).
 */
function aplicarFalhaEnvio(instance, tenant, telefone, err) {
  if (ehErrodoDestinatario(err)) {
    // Problema no número, não na instância — penaliza reputação do telefone
    const recemBloqueado = rep.registrarFalha(instance, telefone);
    if (recemBloqueado) {
      criarNotificacaoFallback(tenant, telefone); // fire-and-forget
    }
    console.warn(`[waQueue] bounce em ${telefone}: ${err.message}`);
    return { deveRejeitar: false }; // a instância está ok, só o destinatário é inválido
  }
  return { deveRejeitar: true }; // problema na instância/rede — repassa para o caller e watchdog
}

// ── Processamento da fila ─────────────────────────────────────────────────────

async function processQueue(instance) {
  const q = getQueue(instance);
  if (q.processing) return;
  q.processing = true;

  limparDedupExpirados();

  while (q.items.length > 0) {
    resetContadoresSeNecessario(q);

    // Bloqueia se atingiu hard limit diário
    if (q.sentToday >= HARD_LIMIT_DAY) {
      const espera = q.dayReset - Date.now();
      console.warn(
        `[waQueue] ${instance} — hard limit diário (${HARD_LIMIT_DAY} msg). ` +
        `Aguardando reset em ${Math.ceil(espera / 60000)} min.`
      );
      await delay(espera > 0 ? espera : 1000);
      resetContadoresSeNecessario(q);
    }

    // Bloqueia se atingiu rate limit por hora
    if (q.sentThisHour >= RATE_LIMIT_PER_HOUR) {
      const espera = q.hourReset - Date.now();
      console.warn(
        `[waQueue] ${instance} — rate limit/hora (${RATE_LIMIT_PER_HOUR} msg). ` +
        `Aguardando ${Math.ceil(espera / 60000)} min.`
      );
      await delay(espera > 0 ? espera : 1000);
      resetContadoresSeNecessario(q);
    }

    // Bloqueia fora da janela horária — EXCETO mensagens prioritárias (resposta a
    // conversa que o próprio cliente iniciou agora: bot de agendamento, Agente IA).
    // A janela existe pra proteger contra disparo em massa não solicitado (lembretes),
    // que é o vetor real de ban — responder quem acabou de mandar mensagem não é.
    // Sem essa distinção, um cliente que escreve às 21h só recebia resposta no dia
    // seguinte (achado ao vivo no tenant divulgabr, 13/09/2026).
    let idx = 0;
    if (!dentroJanela()) {
      idx = q.items.findIndex(it => it.prioritario);
      if (idx === -1) {
        const espera = Math.min(msAteProximaJanela(), 60_000);
        console.warn(
          `[waQueue] ${instance} — fora da janela (${HORA_INICIO}h–${HORA_FIM}h), sem mensagens prioritárias pendentes. ` +
          `Checando de novo em ${Math.ceil(espera / 1000)}s.`
        );
        await delay(espera);
        continue;
      }
    }

    const { tenant, telefone, mensagem, resolve, reject } = q.items.splice(idx, 1)[0];

    // Instância suspensa pelo circuit breaker
    if (isSuspensa(instance)) {
      reject(new Error(`Instância ${instance} suspensa por erros consecutivos`));
      await delay(randomDelay());
      continue;
    }

    // Reputação: número bloqueado por bounces consecutivos → fallback humano
    if (rep.estaBloqueado(instance, telefone)) {
      console.warn(`[waQueue] ${instance}:${telefone} bloqueado por reputação — descartado (fallback humano)`);
      resolve(); // não é falha da instância; resolve sem propagar erro
      continue;
    }

    // Dedup anti-spam
    if (isDuplicate(instance, telefone, mensagem)) {
      console.warn(
        `[waQueue] dedup: mensagem idêntica para ${telefone} nos últimos ` +
        `${DEDUP_WINDOW_MS / 60000} min — descartada`
      );
      resolve();
      continue;
    }

    try {
      await enviarMensagemWA(tenant, telefone, mensagem);
      aplicarSucessoEnvio(q, instance, telefone, mensagem);
      resolve();
    } catch (err) {
      const { deveRejeitar } = aplicarFalhaEnvio(instance, tenant, telefone, err);
      if (deveRejeitar) reject(err); else resolve();
    }

    if (q.items.length > 0) {
      await delay(randomDelay());
    }
  }

  q.processing = false;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Enfileira uma mensagem WA. Retorna Promise que resolve quando enviada (ou descartada por dedup).
 * opts.prioritario: true pula a janela horária (08h–20h) — usar só para resposta a
 * conversa que o cliente iniciou agora (bot de agendamento, Agente IA), nunca para
 * disparo em massa (lembretes, mensagens administrativas).
 */
function enfileirar(tenant, telefone, mensagem, opts = {}) {
  return new Promise((resolve, reject) => {
    const instance = getProviderKey(tenant);
    if (!instance) return reject(new Error('Tenant sem provider WA configurado'));

    const q = getQueue(instance);
    q.items.push({
      id: nextItemId++,
      tenant, telefone, mensagem, resolve, reject,
      prioritario: !!opts.prioritario,
      enqueuedAt: Date.now(),
    });

    processQueue(instance).catch(err =>
      console.error(`[waQueue] erro inesperado na fila ${instance}:`, err.message)
    );
  });
}

/**
 * Retorna estatísticas da fila de uma instância (para diagnóstico/admin).
 */
function statsInstancia(instance) {
  if (!queues.has(instance)) return null;
  const q = queues.get(instance);
  resetContadoresSeNecessario(q);
  return {
    instance,
    pendentes:      q.items.length,
    sentThisHour:   q.sentThisHour,
    sentToday:      q.sentToday,
    limiteHora:     RATE_LIMIT_PER_HOUR,
    limiteDia:      HARD_LIMIT_DAY,
    processing:     q.processing,
    dentroJanela:   dentroJanela(),
    horaInicio:     HORA_INICIO,
    horaFim:        HORA_FIM,
    minDelay:       MIN_DELAY,
    maxDelay:       MAX_DELAY,
    numBloqueados:  rep.listarInstancia(instance).filter(n => n.bloqueado).length,
    numBaixoScore:  rep.listarInstancia(instance, 70).length,
  };
}

/** Retorna stats completas de uma instância incluindo lista de números problemáticos. */
function statsInstanciaCompleto(instance, threshold = 70) {
  const base    = statsInstancia(instance);
  const numeros = rep.listarInstancia(instance, threshold);
  return { ...base, numeros };
}

// ── Painel de fila detalhada + disparo forçado (admin) ─────────────────────────

const AVG_DELAY = (MIN_DELAY + MAX_DELAY) / 2; // 13.5s — só para estimativa de ETA

/**
 * Estima o ETA (ms) de um item da fila. É uma ESTIMATIVA: não simula reputação/dedup
 * de itens à frente, e não encadeia múltiplos resets de hora/dia se a fila for maior
 * que os limites — nesses casos o ETA fica subestimado. Suficiente para dar noção de
 * "daqui a quanto tempo", não para SLA.
 */
function estimarEta(instance, q, item, indexNaFila) {
  if (isSuspensa(instance)) {
    return { etaMs: null, etaStatus: 'suspensa' }; // circuit breaker travou tudo
  }

  const agora = Date.now();
  let esperaJanelaMs = 0;
  let posicaoEfetiva;

  if (dentroJanela() || item.prioritario) {
    // Dentro da janela: FIFO estrito (índice do array). Fora da janela mas
    // prioritário: só compete com outros prioritários que vieram antes dele.
    posicaoEfetiva = (!dentroJanela() && item.prioritario)
      ? q.items.filter((it, i) => it.prioritario && i < indexNaFila).length
      : indexNaFila;
  } else {
    // Fora da janela e não-prioritário: só será pego depois que a janela abrir.
    esperaJanelaMs = msAteProximaJanela();
    posicaoEfetiva = q.items.filter((it, i) => !it.prioritario && i < indexNaFila).length;
  }

  let etaMs = esperaJanelaMs + posicaoEfetiva * AVG_DELAY;

  // Ajuste grosseiro por rate limit — soma o tempo até o próximo reset se a posição
  // ultrapassar o que ainda cabe na hora/dia correntes (não encadeia múltiplos resets).
  if (posicaoEfetiva >= RATE_LIMIT_PER_HOUR - q.sentThisHour) {
    etaMs += Math.max(0, q.hourReset - agora);
  }
  if (posicaoEfetiva >= HARD_LIMIT_DAY - q.sentToday) {
    etaMs += Math.max(0, q.dayReset - agora);
  }

  return { etaMs: Math.round(etaMs), etaStatus: 'estimado' };
}

/**
 * Lista as mensagens pendentes de uma instância de forma serializável para a API —
 * NUNCA inclui `resolve`/`reject`/objeto `tenant` completo (que carrega
 * evolutionApiKey em texto plano) nem o corpo integral da mensagem, só um preview.
 * Usa `queues.get` (não `getQueue`) para não criar entrada nova no Map ao consultar
 * uma instância que nunca enfileirou nada.
 */
function listarFilaDetalhada(instance) {
  const q = queues.get(instance);
  if (!q) return [];
  resetContadoresSeNecessario(q);
  const agora = Date.now();

  return q.items.map((item, idx) => {
    const { etaMs, etaStatus } = estimarEta(instance, q, item, idx);
    return {
      id:           item.id,
      telefone:     item.telefone,
      preview:      item.mensagem.length > 80 ? item.mensagem.slice(0, 80) + '…' : item.mensagem,
      prioritario:  !!item.prioritario,
      enqueuedAt:   new Date(item.enqueuedAt).toISOString(),
      aguardandoMs: agora - item.enqueuedAt,
      etaMs,
      etaStatus, // 'estimado' | 'suspensa'
    };
  });
}

/**
 * Força o envio IMEDIATO de um item específico da fila, ignorando janela horária,
 * rate limit/hora, hard limit/dia, circuit breaker, bloqueio por reputação e dedup.
 *
 * Escape hatch administrativo — uso pontual e consciente (ex.: destravar teste ou
 * mensagem manual importante presa). Remove o item de `q.items` de forma SÍNCRONA
 * (sem `await` entre localizar e dar splice) antes de qualquer chamada assíncrona —
 * como JS é single-threaded, isso garante que o loop normal de `processQueue` nunca
 * pegue o mesmo item depois (um item só existe em `q.items` OU está "em voo" dentro
 * de um `enviarMensagemWA`, nunca as duas coisas ao mesmo tempo).
 */
async function forcarDisparoImediato(instance, itemId) {
  const q = queues.get(instance);
  if (!q) return { ok: false, motivo: 'fila_nao_encontrada' };

  const idx = q.items.findIndex(it => it.id === itemId);
  if (idx === -1) return { ok: false, motivo: 'item_nao_encontrado' };

  resetContadoresSeNecessario(q);
  const { tenant, telefone, mensagem, resolve, reject } = q.items.splice(idx, 1)[0];

  console.warn(
    `[waQueue] ${instance} — DISPARO FORÇADO (admin) item #${itemId} para ${telefone}, ` +
    `ignorando janela/rate-limit/circuit-breaker/reputação/dedup`
  );

  try {
    await enviarMensagemWA(tenant, telefone, mensagem);
    aplicarSucessoEnvio(q, instance, telefone, mensagem);
    resolve();
    return { ok: true, id: itemId };
  } catch (err) {
    const { deveRejeitar } = aplicarFalhaEnvio(instance, tenant, telefone, err);
    if (deveRejeitar) {
      reject(err);
      return { ok: false, motivo: 'erro_instancia', erro: err.message };
    }
    resolve(); // erro do destinatário — mesma semântica do fluxo normal
    return { ok: true, id: itemId, aviso: 'bounce_destinatario', erro: err.message };
  }
}

/**
 * Registra um envio direto (sendList, sendMedia) nos contadores da fila,
 * garantindo que bypasses necessários ainda respeitem hard limit e rate limit.
 * Retorna false se o limite foi atingido, true se registrou com sucesso.
 */
function registrarEnvioDireto(instance) {
  const q = getQueue(instance);
  resetContadoresSeNecessario(q);
  if (q.sentToday >= HARD_LIMIT_DAY) return false;
  if (q.sentThisHour >= RATE_LIMIT_PER_HOUR) return false;
  q.sentToday++;
  q.sentThisHour++;
  return true;
}

module.exports = {
  enfileirar,
  statsInstancia,
  statsInstanciaCompleto,
  registrarEnvioDireto,
  listarFilaDetalhada,
  forcarDisparoImediato,
  reputacao: rep,
};
