/**
 * service-worker.js — GHOSTFAX PWA cache strategy
 *
 * Cache name is versioned; bump CACHE_VERSION on any shell-asset change.
 *
 * Strategy:
 *   App-shell assets (HTML, CSS, JS, font, icons, manifest) → Cache-first.
 *   API hosts                                               → Network-first with cache fallback.
 *   Everything else                                         → Network pass-through.
 *
 * On a failed API fetch with no cache entry, a synthetic offline JSON
 * response is returned so the page builder can display "NO SIGNAL".
 */

const CACHE_VERSION = 'ghostfax-v1';

/** App-shell assets to pre-cache on install. */
const SHELL_ASSETS = [
  './',
  './index.html',
  './styles/ghostfax.css',
  './manifest.json',
  './assets/fonts/bedstead.otf',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  // All source JS modules — listed explicitly so the cache is predictable.
  './src/ui/app.js',
  './src/ui/renderer.js',
  './src/ui/clock.js',
  './src/ui/keypad.js',
  './src/ui/accessibility.js',
  './src/ui/speech.js',
  './src/ui/writer-editor.js',
  './src/ui/weather-dialog.js',
  './src/teletext/grid.js',
  './src/teletext/wrap.js',
  './src/teletext/mosaic.js',
  './src/teletext/router.js',
  './src/pages/_builder.js',
  './src/pages/index.js',
  './src/pages/news.js',
  './src/pages/tech.js',
  './src/pages/weather.js',
  './src/pages/history.js',
  './src/pages/markets.js',
  './src/pages/ghost.js',
  './src/pages/writer.js',
  './src/pages/subtitles.js',
  './src/pages/help.js',
  './src/data/fetcher.js',
  './src/data/wikimedia.js',
  './src/data/hackernews.js',
  './src/data/weather.js',
  './src/data/markets.js',
];

/** Hostnames treated as API endpoints → network-first. */
const API_HOSTS = new Set([
  'api.wikimedia.org',
  'hacker-news.firebaseio.com',
  'api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'api.coingecko.com',
  'api.coinbase.com',
]);

/** Synthetic offline response returned when an API fetch fails with no cache. */
function offlineApiResponse() {
  return new Response(
    JSON.stringify({ offline: true, ghostfax: 'NO SIGNAL' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Ghostfax-Offline': 'true',
      },
    }
  );
}

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll fails silently for missing assets in development; use individual
      // add with catch so a missing optional file does not block the install.
      Promise.allSettled(
        SHELL_ASSETS.map((url) => cache.add(url).catch(() => {}))
      )
    ).then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  // ── API hosts: network-first with cache fallback ──────────────────────
  if (API_HOSTS.has(url.hostname)) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // ── App-shell: cache-first ────────────────────────────────────────────
  event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy: return cached response if available, otherwise
 * fetch from the network and cache the result.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Nothing in cache and network failed — return a minimal offline page.
    return new Response('GHOSTFAX — offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Network-first strategy for API requests.
 * On network failure, tries the cache; if nothing cached, returns a
 * synthetic offline JSON so the page builder can show "NO SIGNAL".
 */
async function networkFirstAPI(request) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineApiResponse();
  }
}
