/**
 * src/data/markets.js
 * Crypto price adapter.
 *
 * Primary source: CoinGecko simple-price (free, keyless).
 * Fallback source: Coinbase exchange-rates (free, keyless) — used when
 *   CoinGecko returns a non-200 status (e.g. 429 Too Many Requests) or no
 *   usable data.  Coinbase does not supply 24 h change, so usd_24h / inr_24h
 *   are null in that case.
 *
 * @typedef {{
 *   symbol:   string,
 *   usd:      number,
 *   inr:      number,
 *   usd_24h:  number|null,
 *   inr_24h:  number|null,
 * }} CoinPrice
 *
 * @typedef {{
 *   coins:    CoinPrice[],
 *   stale:    boolean,
 *   cacheTs:  number|null,
 *   source:   'coingecko'|'coinbase'|'cache',
 * }} MarketsData
 */

import { fetchWithCache } from './fetcher.js';

const COINS = ['bitcoin', 'ethereum', 'solana'];
const SYMS  = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };
// Coinbase symbols for the exchange-rates API.
const COINBASE_IDS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' };

const VS = 'usd,inr';
const COINGECKO_URL =
  `https://api.coingecko.com/api/v3/simple/price?ids=${COINS.join(',')}&vs_currencies=${VS}&include_24hr_change=true`;

// Coinbase exchange-rates base URL — one request per coin.
const COINBASE_BASE = 'https://api.coinbase.com/v2/exchange-rates';

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
      usd:     Number(entry.usd              ?? 0),
      inr:     Number(entry.inr              ?? 0),
      usd_24h: entry.usd_24h_change != null ? Number(entry.usd_24h_change) : null,
      inr_24h: entry.inr_24h_change != null ? Number(entry.inr_24h_change) : null,
    };
  });
}

/**
 * Normalise raw Coinbase exchange-rates responses (one object per coin) to
 * CoinPrice objects.  Coinbase gives 1 BTC = X USD; we need USD price of 1
 * BTC, which is rates.USD directly.  INR is rates.INR.  No 24 h change.
 *
 * @param {Record<string, { rates: { USD: string, INR: string } }>} rawByCoin
 *   Keys are CoinGecko ids ("bitcoin" etc.), values are the /data objects from
 *   Coinbase (i.e. already the inner `data` field of the API response).
 * @returns {CoinPrice[]}
 */
export function normaliseCoinbase(rawByCoin) {
  return COINS.map((id) => {
    const rates = rawByCoin?.[id]?.rates ?? {};
    return {
      symbol:  SYMS[id],
      usd:     Number(rates.USD ?? 0),
      inr:     Number(rates.INR ?? 0),
      usd_24h: null,
      inr_24h: null,
    };
  });
}

/**
 * Attempt to fetch all three coins from Coinbase exchange-rates.
 * Returns null if any request fails.
 *
 * @returns {Promise<CoinPrice[]|null>}
 */
async function fetchFromCoinbase() {
  try {
    const results = await Promise.all(
      COINS.map(async (id) => {
        const ticker = COINBASE_IDS[id];
        const url    = `${COINBASE_BASE}?currency=${ticker}`;
        const { data } = await fetchWithCache(url, 60_000);
        return [id, data?.data ?? null];
      })
    );

    // If any coin returned null data, bail.
    if (results.some(([, d]) => d === null)) return null;

    const rawByCoin = Object.fromEntries(results);
    const coins     = normaliseCoinbase(rawByCoin);

    // Sanity check: at least BTC price should be > 0.
    if (coins[0].usd <= 0) return null;

    return coins;
  } catch {
    return null;
  }
}

/**
 * Fetch current crypto prices.
 * Tries CoinGecko first; falls back to Coinbase on failure or empty data.
 *
 * @returns {Promise<MarketsData>}
 */
export async function getMarkets() {
  // ── Try CoinGecko ─────────────────────────────────────────────────────
  const { data: cgData, stale: cgStale } = await fetchWithCache(COINGECKO_URL, 60_000);

  let cacheTs = null;
  if (cgStale) {
    try {
      const raw = localStorage.getItem(`gfx:${COINGECKO_URL}`);
      if (raw) cacheTs = JSON.parse(raw).ts;
    } catch { /* ignore */ }
  }

  if (cgData && !cgStale) {
    const coins = normaliseMarkets(cgData);
    // Check the data has real prices (guard against empty 200 responses).
    if (coins.some((c) => c.usd > 0)) {
      return { coins, stale: false, cacheTs: null, source: 'coingecko' };
    }
  }

  // ── CoinGecko stale / failed / empty — try Coinbase ──────────────────
  const cbCoins = await fetchFromCoinbase();
  if (cbCoins) {
    return { coins: cbCoins, stale: false, cacheTs: null, source: 'coinbase' };
  }

  // ── Both live sources failed — return stale cache or empty ────────────
  if (cgData) {
    const coins = normaliseMarkets(cgData);
    return { coins, stale: true, cacheTs, source: 'cache' };
  }

  return { coins: [], stale: true, cacheTs, source: 'cache' };
}
