const { decrypt } = require('../lib/encrypt');

const EVOLUTION_BASE = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
const GLOBAL_API_KEY = () => process.env.EVOLUTION_GLOBAL_API_KEY || '';

async function evFetch(method, path, body, apiKey) {
  const resolvedKey = apiKey ? (decrypt(apiKey) || apiKey) : GLOBAL_API_KEY();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let res;
  try {
    res = await fetch(`${EVOLUTION_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': resolvedKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // Evolution API v2.3.7 aninha o motivo real em data.error.message
    // (data.message só existe em respostas de versões antigas) — sem isso,
    // qualquer 400/422 de validação vira um erro genérico sem pista nenhuma.
    const msgBruta = data?.message || data?.error?.message || data?.response?.message;
    const detalhe = Array.isArray(msgBruta) ? msgBruta.join('; ') : msgBruta;
    console.error('[evolutionService] erro na chamada externa', JSON.stringify({ method, path, status: res.status, body: data }));
    const err = new Error(detalhe || `Evolution API ${method} ${path} → ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}

async function createInstance(slug) {
  return evFetch('POST', '/instance/create', {
    instanceName: slug,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  });
}

async function getConnectionState(slug, apiKey) {
  return evFetch('GET', `/instance/connectionState/${slug}`, null, apiKey);
}

async function getQRCode(slug, apiKey) {
  return evFetch('GET', `/instance/connect/${slug}`, null, apiKey);
}

async function deleteInstance(slug, apiKey) {
  try {
    await evFetch('DELETE', `/instance/delete/${slug}`, null, apiKey);
  } catch (_) {
    // ignora se instância não existe
  }
}

async function logoutInstance(slug, apiKey) {
  return evFetch('DELETE', `/instance/logout/${slug}`, null, apiKey);
}

async function setWebhook(slug, apiKey, webhookUrl) {
  // Evolution API v2.3.7 ("evolution_exchange", fork rodando em produção) exige
  // POST (PUT dá 404) mas — ao contrário da doc oficial genérica da 2.3.7, que
  // documenta corpo flat — essa instância real exige o corpo aninhado sob
  // "webhook" (confirmado ao vivo: erro 'instance requires property "webhook"'
  // quando enviado flat). Combinação POST + corpo aninhado é específica desse fork.
  return evFetch('POST', `/webhook/set/${slug}`, {
    webhook: {
      enabled: true,
      url: webhookUrl,
      base64: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    },
  }, apiKey);
}

module.exports = { createInstance, getConnectionState, getQRCode, deleteInstance, logoutInstance, setWebhook };
