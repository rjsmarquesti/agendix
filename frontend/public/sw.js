/* Agendix Service Worker — Web Push VAPID + App Shell Cache */

const CACHE_NAME = 'agendix-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/logo-agendix-light.png', '/logo-nav.png'];

// ── Instalação: pré-cache do shell ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

// ── Ativação: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first para API, cache-first para assets estáticos ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e chamadas à API
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Assets estáticos: cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|css|js)$/) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Navegação (HTML): network-first, fallback para shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
  }
});

// ── Web Push: exibe notificação ──
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Agendix', body: event.data.text() };
  }

  const title   = payload.title || 'Agendix';
  const options = {
    body:    payload.body    || '',
    icon:    payload.icon    || '/logo-agendix-light.png',
    badge:   payload.badge   || '/logo-agendix-light.png',
    tag:     payload.tag     || 'agendix-notif',
    data:    payload.data    || {},
    requireInteraction: payload.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Web Push: clique na notificação ──
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
