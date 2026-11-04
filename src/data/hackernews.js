/**
 * src/data/hackernews.js
 * Hacker News Firebase adapter.
 *
 * Fetches top 20 stories and normalises each to a small plain object.
 *
 * @typedef {{ title: string, score: number, by: string, descendants: number, urlHost: string }} HNItem
 */

import { fetchWithCache } from './fetcher.js';

const TOP_URL  = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const ITEM_URL = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

const TOP_N = 20;

/**
 * Extract hostname from a URL string, or '' if unavailable.
 * @param {string|undefined} url
 */
function urlHost(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Normalise a raw HN item JSON into our plain object shape.
 * @param {object} raw
 * @returns {HNItem}
 */
export function normaliseItem(raw) {
  return {
    title:       String(raw?.title ?? '(no title)').slice(0, 120),
    score:       Number(raw?.score ?? 0),
    by:          String(raw?.by    ?? ''),
    descendants: Number(raw?.descendants ?? 0),
    urlHost:     urlHost(raw?.url),
  };
}

/**
 * Fetch top 20 HN stories.
 *
 * @returns {Promise<{ items: HNItem[], stale: boolean, cacheTs: number|null }>}
 */
export async function getTopStories() {
  const { data: ids, stale: idStale } = await fetchWithCache(TOP_URL);
  if (!ids || !Array.isArray(ids)) {
    return { items: [], stale: true, cacheTs: null };
  }

  const top = ids.slice(0, TOP_N);

  // Fetch items in parallel, tolerating individual failures.
  const results = await Promise.allSettled(
    top.map((id) => fetchWithCache(ITEM_URL(id)))
  );

  let anyStale = idStale;
  let latestCacheTs = null;

  const items = results
    .map((r, i) => {
      if (r.status === 'rejected' || !r.value.data) {
        anyStale = true;
        return null;
      }
      if (r.value.stale) {
        anyStale = true;
        // Try to get cache timestamp for the list URL as a proxy.
        try {
          const raw = localStorage.getItem(`gfx:${ITEM_URL(top[i])}`);
          if (raw) {
            const ts = JSON.parse(raw).ts;
            if (!latestCacheTs || ts > latestCacheTs) latestCacheTs = ts;
          }
        } catch { /* ignore */ }
      }
      return normaliseItem(r.value.data);
    })
    .filter(Boolean);

  return { items, stale: anyStale, cacheTs: latestCacheTs };
}
