const BASE = '/api';

function getToken() { return localStorage.getItem('crm_token'); }
function getTenantSlug() {
  try { return JSON.parse(localStorage.getItem('crm_tenant'))?.slug; } catch { return null; }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const slug = getTenantSlug();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(slug ? { 'X-Tenant-Slug': slug } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Erro na requisição');
  return data;
}

export const api = {
  get:    (url, params) => request(url + (params ? '?' + new URLSearchParams(params) : '')),
  post:   (url, body)   => request(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (url, body)   => request(url, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (url)         => request(url, { method: 'DELETE' }),
};
