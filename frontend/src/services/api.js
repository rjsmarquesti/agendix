const BASE = '/api';

function getToken() { return localStorage.getItem('crm_token'); }
function getTenantSlug() {
  try { return JSON.parse(localStorage.getItem('crm_tenant'))?.slug; } catch { return null; }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const slug = getTenantSlug();

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(slug ? { 'X-Tenant-Slug': slug } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers });
  let data;
  try { data = await res.json(); } catch { data = { error: `Erro ${res.status} — resposta inválida do servidor` }; }

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  if (res.status === 402) {
    window.location.href = '/trial-expirado';
    return;
  }

  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Erro na requisição');
  return data;
}

async function upload(endpoint, formData) {
  const token = getToken();
  const slug  = getTenantSlug();
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(slug  ? { 'X-Tenant-Slug': slug }           : {}),
    },
  });
  let data;
  try { data = await res.json(); } catch { data = { error: `Erro ${res.status}` }; }
  if (!res.ok) throw new Error(data.error || 'Erro no upload');
  return data;
}

export const api = {
  get:    (url, params) => request(url + (params ? '?' + new URLSearchParams(params) : '')),
  post:   (url, body)   => request(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (url, body)   => request(url, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (url)         => request(url, { method: 'DELETE' }),
  upload,
};
