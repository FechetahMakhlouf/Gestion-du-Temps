// Jadwal Service Worker — requis pour l'installation PWA
const CACHE = 'jadwal-v3';
const BASE = '/Gestion-du-Temps';

const STATIC = [
  BASE + '/',
  BASE + '/frontend/styles.css',
  BASE + '/frontend/js/api.js',
  BASE + '/frontend/js/dom.js',
  BASE + '/frontend/js/state.js',
  BASE + '/frontend/js/ui.js',
  BASE + '/frontend/js/modals.js',
  BASE + '/frontend/js/auth.js',
  BASE + '/frontend/js/subjects.js',
  BASE + '/frontend/js/schedule.js',
  BASE + '/frontend/js/tasks.js',
  BASE + '/frontend/img/icon-192.png',
  BASE + '/frontend/img/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => { })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
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