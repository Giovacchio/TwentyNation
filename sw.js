/* Grimorio — service worker
   Strategia: cache-first con aggiornamento in background ("stale-while-revalidate")
   per l'app shell, così l'app parte istantanea e funziona anche offline.
   Le richieste verso Firebase/Google (autenticazione e dati) passano sempre
   dalla rete: non vanno mai servite dalla cache.
*/
const CACHE_VERSION = 'grimorio-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './spells-data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isFirebaseOrGoogle = /firebase|google|gstatic/i.test(url.hostname);

  if (isFirebaseOrGoogle) return; // sempre in rete: autenticazione e dati live

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && isSameOrigin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
