/**
 * Fila sequencial por instância Evolution API.
 *
 * Problema que resolve: o loop de lembretes disparava N mensagens em rajada
 * para a mesma instância, padrão identificado como spam pelo WhatsApp.
 *
 * Garantias:
 *  - Uma mensagem por vez por instância (sem paralelismo)
 *  - Delay aleatório de MIN_DELAY a MAX_DELAY ms entre envios
 *  - Rate limit: max RATE_LIMIT_PER_HOUR mensagens/hora por instância
 *  - Integração com circuit breaker do waWatchdogService
 */

const { enviarMensagemWA, isSuspensa } = require('./waWatchdogService');

const MIN_DELAY = 4_000;  // 4s
const MAX_DELAY = 9_000;  // 9s
const RATE_LIMIT_PER_HOUR = 30;

// queues: Map<instanceName, { items: [...], processing: bool, sentThisHour: number, hourReset: number }>
const queues = new Map();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return MIN_DELAY + Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY));
}

function getQueue(instance) {
  if (!queues.has(instance)) {
    queues.set(instance, {
      items: [],
      processing: false,
      sentThisHour: 0,
      hourReset: Date.now() + 3_600_000,
    });
  }
  return queues.get(instance);
}

function resetRateIfNeeded(q) {
  if (Date.now() > q.hourReset) {
    q.sentThisHour = 0;
    q.hourReset = Date.now() + 3_600_000;
  }
}

async function processQueue(instance) {
  const q = getQueue(instance);
  if (q.processing) return;
  q.processing = true;

  while (q.items.length > 0) {
    const { tenant, telefone, mensagem, resolve, reject } = q.items.shift();

    resetRateIfNeeded(q);

    if (q.sentThisHour >= RATE_LIMIT_PER_HOUR) {
      const wait = q.hourReset - Date.now();
      console.warn(`[waQueue] ${instance} atingiu ${RATE_LIMIT_PER_HOUR} msg/h — aguardando ${Math.ceil(wait / 60000)} min`);
      await delay(wait > 0 ? wait : 1000);
      resetRateIfNeeded(q);
    }

    if (isSuspensa(instance)) {
      reject(new Error(`Instância ${instance} suspensa por erros consecutivos`));
      await delay(randomDelay());
      continue;
    }

    try {
      await enviarMensagemWA(tenant, telefone, mensagem);
      q.sentThisHour++;
      resolve();
    } catch (err) {
      reject(err);
    }

    if (q.items.length > 0) {
      await delay(randomDelay());
    }
  }

  q.processing = false;
}

/**
 * Enfileira uma mensagem WA. Retorna Promise que resolve quando enviada.
 */
function enfileirar(tenant, telefone, mensagem) {
  return new Promise((resolve, reject) => {
    const instance = tenant.evolutionInstance;
    if (!instance) return reject(new Error('Tenant sem instância Evolution configurada'));

    const q = getQueue(instance);
    q.items.push({ tenant, telefone, mensagem, resolve, reject });

    // Inicia processamento se não estiver rodando
    processQueue(instance).catch(err =>
      console.error(`[waQueue] erro inesperado na fila ${instance}:`, err.message)
    );
  });
}

module.exports = { enfileirar };
