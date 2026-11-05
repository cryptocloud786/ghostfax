/**
 * src/pages/markets.js
 * Page 500 — Crypto Markets (CoinGecko BTC/ETH/SOL).
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext, writeCacheTag,
  noSignalPage,
} from './_builder.js';

export const numbers = [500];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'NEWS',    page: 101 },
  yellow: { label: 'TECH',    page: 110 },
  cyan:   { label: 'WEATHER', page: 300 },
};

/**
 * Format a price number to a short string, e.g. 64321.5 -> "64,321"
 * @param {number} n
 * @param {number} [decimals=0]
 */
function fmtPrice(n, decimals = 0) {
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a 24h change with sign and 2 decimal places, or "--" for null.
 * @param {number|null} pct
 * @returns {{ text: string, fg: string }}
 */
function fmtChange(pct) {
  if (pct == null) return { text: '  --  ', fg: 'white' };
  const sign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    fg:   pct >= 0 ? 'green' : 'red',
  };
}

/**
 * @typedef {{ symbol: string, usd: number, inr: number, usd_24h: number|null, inr_24h: number|null }} CoinPrice
 *
 * @param {{ coins: CoinPrice[], stale: boolean, cacheTs: number|null, source?: string }} data
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(data, ctx = {}) {
  const now = ctx.now ?? new Date();

  if (!data || !data.coins || data.coins.length === 0) {
    if (data?.stale) return noSignalPage(500, now);
    const page = blankPage(500);
    applyHeader(page, now);
    writeText(page, 4, 1, 'NO MARKET DATA AVAILABLE.', { fg: 'white', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  const page = blankPage(500);
  applyHeader(page, now);

  // Row 1: section header.
  writeText(page, 1, 0, 'P500 CRYPTO MARKETS', { fg: 'black', bg: 'green' });
  writeText(page, 1, 19, '                     ', { fg: 'black', bg: 'green' });
  if (data.stale && data.cacheTs) writeCacheTag(page, data.cacheTs);

  // Row 2: tagline.
  writeText(page, 2, 1, 'RISEN FROM THE LEDGER', { fg: 'cyan', bg: 'black' });

  // Row 3: column headers.
  writeText(page, 3, 1, 'COIN  USD PRICE    24H     INR PRICE', { fg: 'yellow', bg: 'black' });
  writeText(page, 4, 1, '----  ----------  ------  ----------', { fg: 'cyan',   bg: 'black' });

  let row = 5;
  for (const coin of data.coins) {
    if (row > 21) break;

    const usdStr        = fmtPrice(coin.usd).slice(0, 10).padStart(10, ' ');
    const inrStr        = fmtPrice(coin.inr).slice(0, 10).padStart(10, ' ');
    const usdChange     = fmtChange(coin.usd_24h);
    const changeStr     = usdChange.text.slice(0, 7).padStart(7, ' ');

    // Symbol.
    writeText(page, row, 1, coin.symbol.padEnd(4, ' '), { fg: 'white', bg: 'black' });
    // USD price.
    writeText(page, row, 6, usdStr, { fg: 'white', bg: 'black' });
    // 24h change (coloured).
    writeText(page, row, 17, changeStr, { fg: usdChange.fg, bg: 'black' });
    // INR price.
    writeText(page, row, 25, inrStr, { fg: 'white', bg: 'black' });

    row++;

    // Second row: INR change.
    const inrChange    = fmtChange(coin.inr_24h);
    const inrChangeStr = inrChange.text.slice(0, 7).padStart(7, ' ');
    writeText(page, row, 6,  '          ', { fg: 'black', bg: 'black' }); // clear
    writeText(page, row, 25, inrChangeStr, { fg: inrChange.fg, bg: 'black' });
    row++;

    // Separator.
    if (row <= 21) {
      writeText(page, row, 1, '-'.repeat(38), { fg: 'cyan', bg: 'black' });
      row++;
    }
  }

  // Row 22: data source note — name the actual source used.
  const sourceLabel = data.source === 'coinbase'
    ? 'DATA: COINBASE'
    : data.source === 'cache'
      ? 'DATA: CACHED COPY'
      : 'DATA: COINGECKO';
  writeText(page, 22, 1, sourceLabel.padEnd(38, ' '), { fg: 'yellow', bg: 'black' });

  applyFastext(page, FASTEXT);

  return [page];
}

/**
 * Sample data for tests / grid-lint.
 */
export const sample = {
  coins: [
    { symbol: 'BTC', usd: 67450,   inr: 5621850,  usd_24h:  2.34,  inr_24h:  2.31  },
    { symbol: 'ETH', usd: 3245,    inr:  270375,   usd_24h: -1.12,  inr_24h: -1.15  },
    { symbol: 'SOL', usd: 185.50,  inr:  15458,    usd_24h:  4.67,  inr_24h:  4.64  },
  ],
  stale:   false,
  cacheTs: null,
  source:  'coingecko',
};

registerPage(500, (data, ctx) => Promise.resolve(build(data ?? sample, ctx)));
