const CACHE_NAME = 'vsaps-2026-pwa-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/landing.html',
  '/manifest.json',
  '/offline.html',
  '/Global.css',
  '/favicon.ico',
  '/pwa-icon.svg',
  '/splash.svg',
];
const CACHEABLE_PREFIXES = ['/assets/', '/icons/', '/images/', '/static/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text?.() || '' };
  }

  const title = data.title || 'VSAPS 2026';
  const options = {
    body: data.body || 'Bạn có thông báo mới.',
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(self.clients.openWindow(url));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate';
  const isAsset = CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && (isNavigation || isAsset || url.pathname.endsWith('.svg') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (isNavigation) return cache.match('/offline.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
