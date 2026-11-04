/**
 * src/pages/tech.js
 * Pages 110–114 — Tech News (Hacker News top stories).
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { wrapText } from '../teletext/wrap.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext, writeCacheTag,
  noSignalPage, BODY_START, BODY_END, BODY_WIDTH, BODY_COL,
} from './_builder.js';

export const numbers = [110, 111, 112, 113, 114];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'NEWS',    page: 101 },
  yellow: { label: 'WEATHER', page: 300 },
  cyan:   { label: 'MARKETS', page: 500 },
};

/**
 * @typedef {{ title: string, score: number, by: string, descendants: number, urlHost: string }} HNItem
 *
 * @param {{ items: HNItem[], stale: boolean, cacheTs: number|null }} data
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(data, ctx = {}) {
  const now = ctx.now ?? new Date();

  if (!data || !data.items || data.items.length === 0) {
    if (data?.stale) return noSignalPage(110, now);
    const page = blankPage(110);
    applyHeader(page, now);
    writeText(page, 4, 1, 'NO TECH STORIES AVAILABLE.', { fg: 'white', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  const pages = [];
  let currentPage = null;
  let currentRow  = BODY_START;
  let storyIndex  = 0;

  function newPage() {
    const sp   = pages.length + 1;
    const page = blankPage(110, sp, 1);
    applyHeader(page, now);
    writeText(page, 1, 0, 'P110 HACKER NEWS', { fg: 'white', bg: 'red' });
    writeText(page, 1, 16, '                        ', { fg: 'white', bg: 'red' });
    if (data.stale && data.cacheTs) writeCacheTag(page, data.cacheTs);
    applyFastext(page, FASTEXT);
    pages.push(page);
    currentPage = page;
    currentRow  = BODY_START;
  }

  newPage();

  for (const item of data.items) {
    storyIndex++;
    // Each story: 1 row for number + score, then wrapped title, 1 row for host/author.
    const numLabel    = `${String(storyIndex).padStart(2, ' ')}. `;
    const titleText   = item.title.toUpperCase();
    const titleLines  = wrapText(numLabel + titleText, BODY_WIDTH);
    // Meta line: score + author + host
    const hostPart    = item.urlHost ? ` (${item.urlHost.slice(0, 18)})` : '';
    const metaText    = `    PTS:${item.score} BY:${item.by.slice(0, 10)}${hostPart}`;
    const metaLine    = metaText.slice(0, BODY_WIDTH);
    const totalLines  = titleLines.length + 1 + 1; // title + meta + blank

    if (currentRow > BODY_START && currentRow + totalLines > BODY_END + 1) {
      newPage();
    }

    // Title lines.
    for (const line of titleLines) {
      if (currentRow > BODY_END) { newPage(); }
      writeText(currentPage, currentRow, BODY_COL, line.slice(0, BODY_WIDTH), { fg: 'cyan', bg: 'black' });
      currentRow++;
    }

    // Meta line.
    if (currentRow <= BODY_END) {
      writeText(currentPage, currentRow, BODY_COL, metaLine, { fg: 'yellow', bg: 'black' });
      currentRow++;
    }

    // Blank separator.
    if (currentRow <= BODY_END) {
      currentRow++;
    }
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
    { title: 'Show HN: A new open-source tool for developers', score: 342, by: 'hacker1', descendants: 87,  urlHost: 'github.com'   },
    { title: 'Ask HN: What are you working on this month?',    score: 215, by: 'hacker2', descendants: 203, urlHost: ''            },
    { title: 'The unexpected consequences of fast hardware',   score: 189, by: 'hacker3', descendants: 44,  urlHost: 'example.com' },
    { title: 'Why most software rewrites fail',                score: 167, by: 'hacker4', descendants: 91,  urlHost: 'medium.com'  },
    { title: 'Building reliable distributed systems in 2025',  score: 155, by: 'hacker5', descendants: 33,  urlHost: 'blog.dev'    },
  ],
  stale:   false,
  cacheTs: null,
};

for (const n of numbers) {
  registerPage(n, (data, ctx) => Promise.resolve(build(data ?? sample, ctx)));
}
