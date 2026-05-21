// Fila serializada por instância Evolution API.
// Garante: delay aleatório 2-5s entre envios + teto de MAX_PER_HOUR msg/hora por número.
// Motivação: disparos em lote (lembretes) sem delay são o principal vetor de ban no WhatsApp Baileys.

const queues = new Map(); // slug → { items, processing, sentAt[] }

const MAX_PER_HOUR = 20;
const MIN_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5_000;

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

function getQ(slug) {
  if (!queues.has(slug)) queues.set(slug, { items: [], processing: false, sentAt: [] });
  return queues.get(slug);
}

function pruneWindow(q) {
  const cutoff = Date.now() - 3_600_000;
  q.sentAt = q.sentAt.filter(t => t > cutoff);
}

async function rawSend(tenant, phone, text) {
  const base = tenant.evolutionBaseUrl || 'https://api.divulgabr.com.br';
  const url  = `${base}/message/sendText/${tenant.evolutionInstance}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', apikey: tenant.evolutionApiKey },
        body:    JSON.stringify({ number: phone, text }),
        signal:  AbortSignal.timeout(10_000),
      });
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 500 * attempt));
      continue;
    }

    if (res.ok) return;

    // Não retentar erros de payload
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      const body = await res.text().catch(() => '');
      throw new Error(`Evolution ${res.status}: ${body}`);
    }

    if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
  }
}

async function drainQueue(slug) {
  const q = getQ(slug);
  if (q.processing) return;
  q.processing = true;

  while (q.items.length > 0) {
    pruneWindow(q);

    if (q.sentAt.length >= MAX_PER_HOUR) {
      const waitMs = q.sentAt[0] + 3_600_000 - Date.now() + 500;
      console.warn(`[waQueue:${slug}] Limite ${MAX_PER_HOUR} msg/h atingido — aguardando ${Math.ceil(waitMs / 1000)}s`);
      await new Promise(r => setTimeout(r, Math.min(waitMs, 60_000)));
      continue;
    }

    const { tenant, phone, text, resolve } = q.items.shift();
    try {
      await rawSend(tenant, phone, text);
      q.sentAt.push(Date.now());
      resolve({ ok: true });
    } catch (e) {
      console.error(`[waQueue:${slug}] Falha ao enviar para ${phone}:`, e.message);
      resolve({ ok: false, error: e.message });
    }

    if (q.items.length > 0) {
      await new Promise(r => setTimeout(r, randomDelay()));
    }
  }

  q.processing = false;
}

/**
 * Enfileira envio de texto WA com rate limit e delay anti-ban.
 * Retorna Promise<{ ok: boolean, error?: string }>.
 */
function enqueueSend(tenant, phone, text) {
  const slug = tenant.evolutionInstance;
  if (!slug || !tenant.evolutionApiKey) {
    return Promise.resolve({ ok: false, error: 'instancia_nao_configurada' });
  }

  return new Promise(resolve => {
    const q = getQ(slug);
    q.items.push({ tenant, phone, text, resolve });
    drainQueue(slug).catch(e => console.error('[waQueue] drain error:', e.message));
  });
}

/** Retorna quantas mensagens foram enviadas no último 1h para o slug informado. */
function getSentLastHour(slug) {
  const q = queues.get(slug);
  if (!q) return 0;
  pruneWindow(q);
  return q.sentAt.length;
}

module.exports = { enqueueSend, getSentLastHour };
