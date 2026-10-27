// ALFA OS Service Worker - PWA offline fallback and core caching
const CACHE_NAME = 'alfa-os-v2';
const STATIC_ASSETS = [
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('alfa-os-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate for static assets
  if (
    !url.search && (
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/catalog/') ||
      STATIC_ASSETS.includes(url.pathname)
    )
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 &&
                !networkResponse.redirected &&
                !/private|no-store/i.test(networkResponse.headers.get('cache-control') || '')) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
