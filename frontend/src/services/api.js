const BASE = '/api';

function getToken() { return localStorage.getItem('crm_token'); }
function getTenantSlug() {
  try { return JSON.parse(localStorage.getItem('crm_tenant'))?.slug; } catch { return null; }
}

let isLoggingOut = false;
let isRefreshing = false;
let pendingRequests = [];

function doLogout() {
  if (!isLoggingOut) {
    isLoggingOut = true;
    localStorage.clear();
    window.location.href = '/login';
  }
}

async function refreshAccessToken() {
  const slug = getTenantSlug();
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...(slug ? { 'X-Tenant-Slug': slug } : {}) },
  });
  if (!res.ok) throw new Error('refresh failed');
  const { accessToken } = await res.json();
  localStorage.setItem('crm_token', accessToken);
  return accessToken;
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
    // TOKEN_EXPIRED → tenta refresh silencioso; outras causas de 401 → logout
    if (data?.code === 'TOKEN_EXPIRED' && !options._retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          pendingRequests.forEach(cb => cb(newToken));
          pendingRequests = [];
          return request(endpoint, { ...options, _retry: true });
        } catch {
          isRefreshing = false;
          pendingRequests.forEach(cb => cb(null));
          pendingRequests = [];
          doLogout();
          return;
        }
      } else {
        // Outro request já está refreshing — aguarda na fila
        return new Promise((resolve, reject) => {
          pendingRequests.push(async (token) => {
            if (token) {
              try { resolve(await request(endpoint, { ...options, _retry: true })); }
              catch (err) { reject(err); }
            } else {
              resolve(undefined);
            }
          });
        });
      }
    }

    doLogout();
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

async function download(endpoint) {
  const token = getToken();
  const slug  = getTenantSlug();
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(slug  ? { 'X-Tenant-Slug': slug }           : {}),
    },
  });
  if (!res.ok) throw new Error('Erro ao gerar backup');
  return res.blob();
}

export const api = {
  get:      (url, params) => request(url + (params ? '?' + new URLSearchParams(params) : '')),
  post:     (url, body)   => request(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:      (url, body)   => request(url, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:    (url, body)   => request(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:   (url, body)   => request(url, { method: 'DELETE', ...(body ? { body: JSON.stringify(body) } : {}) }),
  upload,
  download,
};
