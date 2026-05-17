const EVOLUTION_BASE = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
const GLOBAL_API_KEY = () => process.env.EVOLUTION_GLOBAL_API_KEY || '';

async function evFetch(method, path, body, apiKey) {
  const res = await fetch(`${EVOLUTION_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey || GLOBAL_API_KEY(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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

module.exports = { createInstance, getConnectionState, getQRCode, deleteInstance, logoutInstance };
