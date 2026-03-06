// Jadwal Service Worker — requis pour l'installation PWA
const CACHE = 'jadwal-v1';

// Fichiers à mettre en cache pour fonctionnement hors-ligne basique
const STATIC = [
  '/',
  '/frontend/styles.css',
  '/frontend/script.js',
  '/frontend/config.js',
  '/frontend/img/icon-192.png',
  '/frontend/img/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Supprimer les anciens caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ne pas intercepter les appels API (toujours en ligne)
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Pour le reste : réseau d'abord, cache en fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
