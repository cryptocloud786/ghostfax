/**
 * src/data/fetcher.js
 * Pure fetch wrapper — timeout, localStorage cache, stale/offline fallback.
 *
 * Runs in both browser and Node (Node 18+ has globalThis.fetch).
 *
 * Cache key:  gfx:{url}
 * Cache value (JSON-stringified): { ts: number, data: any }
 *
 * @param {string} url
 * @param {number} [ttlMs=300_000]   5 min TTL for freshness check.
 * @returns {Promise<{data: any, stale: boolean}>}
 */
export async function fetchWithCache(url, ttlMs = 300_000) {
  const cacheKey = `gfx:${url}`;

  // ── Try network ──────────────────────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();

    // Write to cache.
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // localStorage may be unavailable (Node, private mode quota) — ignore.
    }

    return { data, stale: false };
  } catch {
    // Network error or timeout — fall through to cache.
  }

  // ── Try cache ────────────────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const entry = JSON.parse(raw);
      // Return cached data regardless of TTL (we already tried the network).
      return { data: entry.data, stale: true };
    }
  } catch {
    // localStorage unavailable or parse error.
  }

  // ── Offline — no cache ───────────────────────────────────────────────────
  return { data: null, stale: true };
}

/**
 * Read the cache entry directly (without making a network request).
 * Returns null if no entry exists.
 *
 * @param {string} url
 * @returns {{ ts: number, data: any }|null}
 */
export function readCache(url) {
  try {
    const raw = localStorage.getItem(`gfx:${url}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Format a stale timestamp as HH:MM for the "CACHED HH:MM" tag.
 *
 * @param {number} ts   Date.now() timestamp
 * @returns {string}    "HH:MM"
 */
export function formatCacheTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
