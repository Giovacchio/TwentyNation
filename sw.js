/* Grimorio — service worker v2
   App shell in cache-first con aggiornamento in background: l'app parte
   istantanea e funziona offline. Le richieste verso Firebase/Google
   (autenticazione e dati) passano sempre dalla rete.
   I font di Google vengono messi in cache a parte, così l'aspetto
   resta corretto anche senza connessione.
*/
const CACHE_VERSION = 'grimorio-v4-6';
const FONT_CACHE = 'grimorio-fonts-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './spells-data.js',
  './spells-it.js',
  './pdf-import.js',
  './rules-data.js',
  './monsters-data.js',
  './bestiary.js',
  './gear-data.js',
  './gear.js',
  './magic-items-data.js',
  './magic-items.js',
  './builder.js',
  './levelup.js',
  './journal.js',
  './pdf-export.js',
  './homebrew.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      // addAll fallisce tutto se un solo file manca: meglio uno per uno.
      .then((cache) => Promise.all(CORE_ASSETS.map((url) =>
        cache.add(url).catch((err) => console.warn('Asset non messo in cache:', url, err))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k !== CACHE_VERSION && k !== FONT_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const isSameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/i.test(url.hostname);
  const isFirebase = /firebase|firebaseio|googleapis\.com$|gstatic\.com$|google\.com$/i.test(url.hostname) && !isFont;

  if (isFirebase) return; // autenticazione e dati sempre live

  if (isFont) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) =>
          cached || fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
                              .catch(() => cached)
        )
      )
    );
    return;
  }

  if (!isSameOrigin) return;

  // Navigazioni: rete prima (per prendere gli aggiornamenti), con fallback offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
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
