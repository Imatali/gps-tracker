
 // Кадамжай ЖДПБ: негизги PWA, v424
const CACHE_NAME = 'kadamjay-pwa-main-v424';

const APP_FILES = [
  './worker.html',
  './manifest.webmanifest',
  './pwa-icon-192.png',
  './pwa-icon-512.png'
];

const APP_PATHS = new Set(
  APP_FILES.map(path => new URL(path, self.location.href).pathname)
);

const WORKER_PATH = new URL('./worker.html', self.location.href).pathname;

const OLD_CACHE_PREFIXES = [
  'kadamjay-pwa-integration-v1116-',
  'kadamjay-pwa-main-'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key =>
          key !== CACHE_NAME &&
          OLD_CACHE_PREFIXES.some(prefix => key.startsWith(prefix))
        )
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (
    request.method !== 'GET' ||
    (request.mode === 'navigate' &&
      new URL(request.url).pathname !== WORKER_PATH)
  ) return;

  const url = new URL(request.url);

  if (
    url.origin !== self.location.origin ||
    !APP_PATHS.has(url.pathname)
  ) return;

  if (url.pathname === WORKER_PATH) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache =>
              cache.put(request, copy)
            )
          );
        }

        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw error;
      }
    })());

    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

