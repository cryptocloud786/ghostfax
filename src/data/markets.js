/**
 * src/data/markets.js
 * CoinGecko simple-price adapter.
 *
 * Fetches BTC, ETH, SOL prices in USD and INR with 24 h change.
 *
 * @typedef {{
 *   symbol: string,
 *   usd:        number,
 *   inr:        number,
 *   usd_24h:    number,
 *   inr_24h:    number,
 * }} CoinPrice
 */

import { fetchWithCache } from './fetcher.js';

const COINS  = ['bitcoin', 'ethereum', 'solana'];
const SYMS   = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };
const VS     = 'usd,inr';
const URL    = `https://api.coingecko.com/api/v3/simple/price?ids=${COINS.join(',')}&vs_currencies=${VS}&include_24hr_change=true`;

/**
 * Normalise raw CoinGecko response to an array of CoinPrice objects.
 * @param {object} raw
 * @returns {CoinPrice[]}
 */
export function normaliseMarkets(raw) {
  return COINS.map((id) => {
    const entry = raw?.[id] ?? {};
    return {
      symbol:  SYMS[id],
      usd:     Number(entry.usd     ?? 0),
      inr:     Number(entry.inr     ?? 0),
      usd_24h: Number(entry.usd_24h_change ?? 0),
      inr_24h: Number(entry.inr_24h_change ?? 0),
    };
  });
}

/**
 * Fetch current crypto prices.
 *
 * @returns {Promise<{ coins: CoinPrice[], stale: boolean, cacheTs: number|null }>}
 */
export async function getMarkets() {
  const { data, stale } = await fetchWithCache(URL, 60_000); // 1-min TTL

  let cacheTs = null;
  if (stale) {
    try {
      const raw = localStorage.getItem(`gfx:${URL}`);
      if (raw) cacheTs = JSON.parse(raw).ts;
    } catch { /* ignore */ }
  }

  if (!data) return { coins: [], stale: true, cacheTs };

  return { coins: normaliseMarkets(data), stale, cacheTs };
}
