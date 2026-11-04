/**
 * src/data/wikimedia.js
 * Wikimedia featured feed adapter.
 *
 * API: https://api.wikimedia.org/feed/v1/wikipedia/en/featured/YYYY/MM/DD
 *
 * Normalised outputs:
 *
 *   NewsItem  { title: string, extract: string }
 *   OtdItem   { year: number, text: string }
 */

import { fetchWithCache } from './fetcher.js';

/**
 * @typedef {{ title: string, extract: string }} NewsItem
 * @typedef {{ year: number, text: string }}     OtdItem
 */

const BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/featured';

/** Strip HTML tags from a string. Works in both Node and browser. */
function stripTags(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build the featured-feed URL for a given date.
 * @param {Date} date
 */
function feedUrl(date) {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  return `${BASE}/${yyyy}/${mm}/${dd}`;
}

/**
 * Parse "In the news" items from a raw featured-feed response.
 * @param {object} raw
 * @returns {NewsItem[]}
 */
function parseNews(raw) {
  const items = raw?.news ?? [];
  return items.map((item) => {
    // Each news item has `links` (array of article objects) and `story` HTML.
    const story = stripTags(item?.story ?? '');
    // Title: first linked article title, or first sentence of story.
    const firstLink = item?.links?.[0];
    const title = firstLink?.titles?.normalized
               ?? firstLink?.title
               ?? story.split(/[.!?]/)[0]
               ?? 'NEWS';
    return {
      title: title.slice(0, 80),
      extract: story.slice(0, 400),
    };
  }).filter(n => n.extract.length > 0);
}

/**
 * Parse "On this day" items from a raw featured-feed response.
 * @param {object} raw
 * @returns {OtdItem[]}
 */
function parseOtd(raw) {
  const items = raw?.onthisday ?? [];
  return items.map((item) => ({
    year: Number(item?.year ?? 0),
    text: stripTags(item?.text ?? '').slice(0, 300),
  })).filter(o => o.text.length > 0);
}

/**
 * Fetch and return "In the news" items for a given date.
 *
 * @param {Date} [date=new Date()]
 * @returns {Promise<{ items: NewsItem[], stale: boolean, cacheTs: number|null }>}
 */
export async function getInTheNews(date = new Date()) {
  const url = feedUrl(date);
  const { data, stale } = await fetchWithCache(url);
  if (!data) return { items: [], stale: true, cacheTs: null };

  // Check if we got a cached timestamp.
  let cacheTs = null;
  if (stale) {
    try {
      const raw = localStorage.getItem(`gfx:${url}`);
      if (raw) cacheTs = JSON.parse(raw).ts;
    } catch { /* ignore */ }
  }

  return { items: parseNews(data), stale, cacheTs };
}

/**
 * Fetch and return "On this day" items for a given date.
 *
 * @param {Date} [date=new Date()]
 * @returns {Promise<{ items: OtdItem[], stale: boolean, cacheTs: number|null }>}
 */
export async function getOnThisDay(date = new Date()) {
  const url = feedUrl(date);
  const { data, stale } = await fetchWithCache(url);
  if (!data) return { items: [], stale: true, cacheTs: null };

  let cacheTs = null;
  if (stale) {
    try {
      const raw = localStorage.getItem(`gfx:${url}`);
      if (raw) cacheTs = JSON.parse(raw).ts;
    } catch { /* ignore */ }
  }

  return { items: parseOtd(data), stale, cacheTs };
}

// ── Normaliser exports for tests ───────────────────────────────────────────
export { parseNews, parseOtd, stripTags };
