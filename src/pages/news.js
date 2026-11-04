/**
 * src/pages/news.js
 * Pages 101–104 — In the News (Wikimedia featured feed).
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { wrapText } from '../teletext/wrap.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext, writeCacheTag, writeDoubleHeight,
  noSignalPage, BODY_START, BODY_END, BODY_WIDTH, BODY_COL,
} from './_builder.js';

export const numbers = [101, 102, 103, 104];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'TECH',    page: 110 },
  yellow: { label: 'HISTORY', page: 400 },
  cyan:   { label: 'MARKETS', page: 500 },
};

/** Max body rows per subpage (rows 4–21). */
const MAX_ROWS = BODY_END - BODY_START + 1; // 18

/**
 * @typedef {{ title: string, extract: string }} NewsItem
 *
 * @param {{ items: NewsItem[], stale: boolean, cacheTs: number|null }} data
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(data, ctx = {}) {
  const now = ctx.now ?? new Date();

  if (!data || !data.items || data.items.length === 0) {
    if (data?.stale) return noSignalPage(101, now);
    // Empty but not stale — show placeholder.
    const page = blankPage(101);
    applyHeader(page, now);
    writeText(page, 4, 1, 'NO NEWS ITEMS AVAILABLE.', { fg: 'white', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  // Split items across subpages.  Each item uses:
  //   1 row: title (cyan, truncated to 38)
  //   N rows: extract wrapped at 38
  //   1 blank row separator
  const pages = [];
  let currentPage = null;
  let currentRow  = BODY_START;

  function newPage() {
    const sp   = pages.length + 1;
    const page = blankPage(101, sp, 1);
    applyHeader(page, now);
    // Row 1: section header
    writeText(page, 1, 0, 'P101 IN THE NEWS', { fg: 'white', bg: 'blue' });
    writeText(page, 1, 16, '                        ', { fg: 'white', bg: 'blue' });
    if (data.stale && data.cacheTs) writeCacheTag(page, data.cacheTs);
    applyFastext(page, FASTEXT);
    pages.push(page);
    currentPage = page;
    currentRow  = BODY_START;
  }

  newPage();

  for (const item of data.items) {
    const titleLines   = wrapText(item.title.toUpperCase(), BODY_WIDTH);
    const extractLines = wrapText(item.extract, BODY_WIDTH);
    const totalLines   = titleLines.length + extractLines.length + 1; // +1 blank

    // If it won't fit, start a new page (unless we're already at the top).
    if (currentRow > BODY_START && currentRow + totalLines > BODY_END + 1) {
      newPage();
    }

    // Write title lines in cyan.
    for (const line of titleLines) {
      if (currentRow > BODY_END) { newPage(); }
      writeText(currentPage, currentRow, BODY_COL, line.slice(0, BODY_WIDTH), { fg: 'cyan', bg: 'black' });
      currentRow++;
    }

    // Write extract lines in white.
    for (const line of extractLines) {
      if (currentRow > BODY_END) { newPage(); }
      writeText(currentPage, currentRow, BODY_COL, line.slice(0, BODY_WIDTH), { fg: 'white', bg: 'black' });
      currentRow++;
    }

    // Blank separator.
    if (currentRow <= BODY_END) {
      currentRow++;
    }
  }

  // Patch subpageTotal.
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    pages[i].subpage      = i + 1;
    pages[i].subpageTotal = total;
  }

  return pages;
}

/**
 * Sample data for tests / grid-lint.
 * Synthetic — not real news.
 */
export const sample = {
  items: [
    {
      title:   'Scientists announce new discovery',
      extract: 'Researchers have confirmed findings that may change understanding of the field.',
    },
    {
      title:   'Global summit reaches agreement',
      extract: 'World leaders signed a new accord on Tuesday after days of negotiation.',
    },
    {
      title:   'Technology firm reports record results',
      extract: 'A major technology company posted its highest ever quarterly revenue figures.',
    },
  ],
  stale:   false,
  cacheTs: null,
};

// Self-register for pages 101–104 (all use the same builder + data).
for (const n of numbers) {
  registerPage(n, (data, ctx) => Promise.resolve(build(data ?? sample, ctx)));
}
