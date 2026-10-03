/* Jadwal Service Worker
 * ----------------------------------------------------------------------
 * Strategies:
 *   App shell (index.html / navigations) -> stale-while-revalidate
 *   Static assets (CSS, JS, icons, images, fonts) -> cache-first
 *   API GET (user data)                  -> network-first, short TTL fallback
 *   API mutations (POST/PUT/PATCH/DELETE)-> network only, never cached
 *   Auth / sensitive endpoints           -> network only, never cached
 *
 * Bump VERSION on every deploy: asset filenames are not hashed, so the
 * version change is what invalidates cache-first entries.
 */
const VERSION = 'v8';
const BASE = '/Gestion-du-Temps';

const SHELL_CACHE = `jadwal-shell-${VERSION}`;
const STATIC_CACHE = `jadwal-static-${VERSION}`;
const FONT_CACHE = 'jadwal-fonts-v1';          // fonts are immutable, survive deploys
const API_CACHE = 'jadwal-api-v1';

const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, FONT_CACHE, API_CACHE];

// Only the essential app shell. Lazy chunks (export, guide, emoji, autogen,
// productivity, focus-mode) are cached at runtime on first use.
const PRECACHE = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/frontend/dist/app.min.css',
  BASE + '/frontend/dist/app.min.js',
  BASE + '/frontend/img/icon-192.png',
  BASE + '/frontend/img/favicon.webp',
  BASE + '/manifest.json',
];

const LIMITS = { [STATIC_CACHE]: 60, [FONT_CACHE]: 30, [API_CACHE]: 50 };
const API_MAX_AGE_MS = 24 * 60 * 60 * 1000;  // stale user data older than 24h is ignored
const API_TIMEOUT_MS = 4000;                 // fall back to cache if network is slower

// Never cache these, even for GET.
const API_NO_CACHE = [/\/api\/auth\//, /\/api\/contact/, /\/api\/bootstrap/];

const STATIC_EXT = /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|json)$/i;

/* ── Install / activate ─────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Add one by one so a single missing file doesn't abort the install.
      Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('jadwal-') && !CURRENT_CACHES.includes(k))
          .map((k) => caches.delete(k))
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }
      await self.clients.claim();
    })()
  );
});

/* Page -> SW messages: clear user data on logout. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_USER_DATA') {
    event.waitUntil(caches.delete(API_CACHE));
  }
});

/* ── Routing ────────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // API (backend lives on another origin): handle before the GET check.
  if (url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET' || API_NO_CACHE.some((r) => r.test(url.pathname))) {
      return; // network only — browser handles it, nothing stored
    }
    event.respondWith(networkFirstApi(req));
    return;
  }

  if (req.method !== 'GET') return;

  // Google Fonts (stylesheet + font files)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // HTML navigations -> instant from cache, refreshed in background
  if (req.mode === 'navigate') {
    event.respondWith(appShell(event));
    return;
  }

  // Same-origin static assets
  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  }
});

/* ── Strategies ─────────────────────────────────────────────────────── */
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') {
      const cache = await caches.open(cacheName);
      await cache.put(req, res.clone());
      trimCache(cacheName);
    }
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function appShell(event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached =
    (await cache.match(event.request, { ignoreSearch: true })) ||
    (await cache.match(BASE + '/'));

  const network = (async () => {
    const res = (await event.preloadResponse) || (await fetch(event.request));
    if (res && res.ok) await cache.put(BASE + '/', res.clone());
    return res;
  })();

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  try {
    return await network;
  } catch {
    return new Response('<h1>Hors ligne</h1><p>Reconnectez-vous pour charger Jadwal.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function networkFirstApi(req) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await withTimeout(fetch(req), API_TIMEOUT_MS);
    if (res.ok) {
      // Store with a timestamp so stale data can be rejected later.
      const body = await res.clone().blob();
      const headers = new Headers(res.headers);
      headers.set('sw-cached-at', String(Date.now()));
      await cache.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers }));
      trimCache(API_CACHE);
    }
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) {
      const age = Date.now() - Number(cached.headers.get('sw-cached-at') || 0);
      if (age < API_MAX_AGE_MS) return cached;
      await cache.delete(req);
    }
    throw err; // let the app show its own offline/error state
  }
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function trimCache(cacheName) {
  const max = LIMITS[cacheName];
  if (!max) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
