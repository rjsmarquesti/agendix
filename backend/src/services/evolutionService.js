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
    const err = new Error(data?.message || `Evolution API ${method} ${path} → ${res.status}`);
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
  return evFetch('PUT', `/webhook/set/${slug}`, {
    webhook: {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    },
  }, apiKey);
}

module.exports = { createInstance, getConnectionState, getQRCode, deleteInstance, logoutInstance, setWebhook };
