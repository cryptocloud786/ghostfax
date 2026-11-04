/**
 * src/pages/history.js
 * Page 400 — On This Day (Wikimedia featured feed).
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { wrapText } from '../teletext/wrap.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext, writeCacheTag,
  noSignalPage, BODY_START, BODY_END, BODY_WIDTH, BODY_COL,
} from './_builder.js';

export const numbers = [400];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'NEWS',    page: 101 },
  yellow: { label: 'MARKETS', page: 500 },
  cyan:   { label: 'GHOST',   page: 666 },
};

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/**
 * @typedef {{ year: number, text: string }} OtdItem
 *
 * @param {{ items: OtdItem[], stale: boolean, cacheTs: number|null }} data
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(data, ctx = {}) {
  const now = ctx.now ?? new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mon = MONTHS[now.getMonth()];

  if (!data || !data.items || data.items.length === 0) {
    if (data?.stale) return noSignalPage(400, now);
    const page = blankPage(400);
    applyHeader(page, now);
    writeText(page, 4, 1, `ON THIS DAY: ${dd} ${mon}`, { fg: 'cyan', bg: 'black' });
    writeText(page, 6, 1, 'NO HISTORICAL DATA AVAILABLE.',  { fg: 'white', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  const pages  = [];
  let currentPage = null;
  let currentRow  = BODY_START;

  function newPage() {
    const sp   = pages.length + 1;
    const page = blankPage(400, sp, 1);
    applyHeader(page, now);
    writeText(page, 1, 0, `P400 ON THIS DAY: ${dd} ${mon}`, { fg: 'black', bg: 'yellow' });
    writeText(page, 1, 23, '                 ', { fg: 'black', bg: 'yellow' });
    if (data.stale && data.cacheTs) writeCacheTag(page, data.cacheTs);
    applyFastext(page, FASTEXT);
    pages.push(page);
    currentPage = page;
    currentRow  = BODY_START;
  }

  newPage();

  for (const item of data.items) {
    const yearStr  = item.year > 0 ? String(item.year) : `${Math.abs(item.year)} BC`;
    const bodyText = `${yearStr}: ${item.text}`;
    const lines    = wrapText(bodyText, BODY_WIDTH);
    const totalLines = lines.length + 1; // +1 blank

    if (currentRow > BODY_START && currentRow + totalLines > BODY_END + 1) {
      newPage();
    }

    // Year in yellow, rest in white.
    for (let li = 0; li < lines.length; li++) {
      if (currentRow > BODY_END) { newPage(); }
      const fg = li === 0 ? 'yellow' : 'white';
      writeText(currentPage, currentRow, BODY_COL, lines[li].slice(0, BODY_WIDTH), { fg, bg: 'black' });
      currentRow++;
    }

    if (currentRow <= BODY_END) currentRow++;
  }

  const total = pages.length;
  for (let i = 0; i < total; i++) {
    pages[i].subpage      = i + 1;
    pages[i].subpageTotal = total;
  }

  return pages;
}

/**
 * Sample data for tests / grid-lint.
 */
export const sample = {
  items: [
    { year: 1974, text: 'Ceefax teletext service launched by the BBC.'      },
    { year: 1517, text: 'Martin Luther posts his Ninety-Five Theses.'        },
    { year: 1793, text: 'The Louvre museum opens to the public in Paris.'    },
    { year: 1881, text: 'Pablo Picasso is born in Malaga, Spain.'            },
    { year: 1945, text: 'The United Nations Charter comes into force.'       },
  ],
  stale:   false,
  cacheTs: null,
};

registerPage(400, (data, ctx) => Promise.resolve(build(data ?? sample, ctx)));
