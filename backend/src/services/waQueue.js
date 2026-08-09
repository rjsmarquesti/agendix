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

// Janela horária em UTC — equivalente a 08h–20h BRT (UTC-3)
const HORA_INICIO = 11;  // 08:00 BRT = 11:00 UTC
const HORA_FIM    = 23;  // 20:00 BRT = 23:00 UTC

// ── Estado em memória ─────────────────────────────────────────────────────────
// Map<instanceName, QueueState>
const queues = new Map();

// Dedup: Map<`${instance}:${telefone}:${hash}`, expiresAt>
const dedupCache = new Map();

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

    // Bloqueia fora da janela horária
    if (!dentroJanela()) {
      const espera = msAteProximaJanela();
      console.warn(
        `[waQueue] ${instance} — fora da janela (${HORA_INICIO}h–${HORA_FIM}h). ` +
        `Aguardando ${Math.ceil(espera / 60000)} min.`
      );
      await delay(espera);
    }

    const { tenant, telefone, mensagem, resolve, reject } = q.items.shift();

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
      registrarDedup(instance, telefone, mensagem);
      rep.registrarSucesso(instance, telefone);
      q.sentThisHour++;
      q.sentToday++;
      resolve();
    } catch (err) {
      if (ehErrodoDestinatario(err)) {
        // Problema no número, não na instância — penaliza reputação do telefone
        const recemBloqueado = rep.registrarFalha(instance, telefone);
        if (recemBloqueado) {
          criarNotificacaoFallback(tenant, telefone); // fire-and-forget
        }
        console.warn(`[waQueue] bounce em ${telefone}: ${err.message}`);
        resolve(); // resolve: a instância está ok, só o destinatário é inválido
      } else {
        // Problema na instância/rede — repassa para o caller e watchdog
        reject(err);
      }
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
 */
function enfileirar(tenant, telefone, mensagem) {
  return new Promise((resolve, reject) => {
    const instance = getProviderKey(tenant);
    if (!instance) return reject(new Error('Tenant sem provider WA configurado'));

    const q = getQueue(instance);
    q.items.push({ tenant, telefone, mensagem, resolve, reject });

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
  reputacao: rep,
};
