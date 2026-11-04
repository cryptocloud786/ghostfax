/**
 * src/pages/_builder.js
 * Shared helpers for all page builders.
 * Pure — no DOM, no side effects.
 */

import { blankPage, writeText, applyHeaderRow, COLOURS } from '../teletext/grid.js';
import { wrapText } from '../teletext/wrap.js';

export { COLOURS, wrapText };

/**
 * Maximum body rows available per page (rows 4–21, allowing row 22 gap + row 23 fastext).
 */
export const BODY_ROWS    = 18; // rows 4..21
export const BODY_START   = 4;
export const BODY_END     = 21; // inclusive
export const BODY_WIDTH   = 38;
export const BODY_COL     = 1;  // 1-col left margin

/**
 * Apply a standard Fastext row (row 23) to a page.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {{ red?, green?, yellow?, cyan? }} links
 *   Each value: { label: string, page: number }
 */
export function applyFastext(page, links) {
  const colours = ['red', 'green', 'yellow', 'cyan'];
  const positions = [0, 10, 20, 30]; // each button spans ~10 cols

  for (let i = 0; i < colours.length; i++) {
    const colour = colours[i];
    const link   = links[colour];
    const col    = positions[i];

    if (!link) {
      // Write spaces over the button slot.
      writeText(page, 23, col, ' '.repeat(10), { fg: 'white', bg: 'black' });
      continue;
    }

    // Store in page.fastext for keypad/router.
    page.fastext[colour] = { label: link.label, page: link.page };

    // Render: coloured background, max 9 chars label, pad to 10 cols.
    const label = String(link.label).slice(0, 9).padEnd(10, ' ');
    writeText(page, 23, col, label, { fg: 'black', bg: colour });
  }
}

/**
 * Write a double-height title onto rows `row` and `row+1`.
 * The title is rendered on both rows (teletext DH convention).
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {number} row    Starting row (0-based); row+1 is the shadow row.
 * @param {string} text   Up to 40 chars.
 * @param {string} [fg='cyan']
 * @param {string} [bg='black']
 */
export function writeDoubleHeight(page, row, text, fg = 'cyan', bg = 'black') {
  const padded = text.slice(0, 40).padEnd(40, ' ');
  writeText(page, row,     padded, 0, { fg, bg, dh: true });
  writeText(page, row + 1, padded, 0, { fg, bg, dh: true });
  // Correct signature: writeText(page, row, startCol, text, attrs)
  // We re-use writeText from grid.js which is (page, row, startCol, text, attrs).
  // Fix: pass correct arg order.
  const cells = page.rows[row];
  const cells2 = page.rows[row + 1];
  if (!cells || !cells2) return;
  for (let c = 0; c < 40; c++) {
    cells[c]  = { ch: padded[c] ?? ' ', fg, bg, flash: false, dh: true,  conceal: false };
    cells2[c] = { ch: padded[c] ?? ' ', fg, bg, flash: false, dh: true,  conceal: false };
  }
}

/**
 * Write a horizontal separator line across columns 1–38.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {number} row
 * @param {string} [ch='-']
 * @param {string} [fg='cyan']
 */
export function writeSeparator(page, row, ch = '-', fg = 'cyan') {
  writeText(page, row, 1, ch.repeat(38), { fg, bg: 'black' });
}

/**
 * Write body text (wrapped) into a page starting at `startRow`.
 * Returns the row after the last written line.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {string}  text
 * @param {number}  [startRow=4]
 * @param {number}  [maxRows=18]
 * @param {string}  [fg='white']
 * @param {string}  [bg='black']
 * @returns {number} next available row
 */
export function writeBody(page, text, startRow = 4, maxRows = BODY_ROWS, fg = 'white', bg = 'black') {
  const lines = wrapText(text, BODY_WIDTH);
  let row = startRow;
  for (const line of lines) {
    if (row > startRow + maxRows - 1) break;
    writeText(page, row, BODY_COL, line, { fg, bg });
    row++;
  }
  return row;
}

/**
 * Apply the standard header row (row 0) to a page.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {Date} [now]
 */
export function applyHeader(page, now = new Date()) {
  applyHeaderRow(page, now);
}

/**
 * Write a "CACHED HH:MM" tag on row 1 col 27 (13 chars, fits in 40).
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {number|null} cacheTs   timestamp or null
 */
export function writeCacheTag(page, cacheTs) {
  if (!cacheTs) return;
  const d  = new Date(cacheTs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  writeText(page, 1, 27, `CACHED ${hh}:${mm}`, { fg: 'yellow', bg: 'black' });
}

/**
 * Create a "NO SIGNAL" placeholder page.
 *
 * @param {number} pageNumber
 * @param {Date}   [now]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function noSignalPage(pageNumber, now = new Date()) {
  const page = blankPage(pageNumber);
  applyHeader(page, now);

  writeDoubleHeight(page, 3, '     NO SIGNAL      ', 'red', 'black');
  writeText(page, 7,  1, 'THE TRANSMISSION HAS BEEN LOST.', { fg: 'white', bg: 'black' });
  writeText(page, 8,  1, 'PLEASE CHECK YOUR CONNECTION.', { fg: 'white', bg: 'black' });
  writeText(page, 10, 1, 'GHOSTFAX IS TRYING TO RECONNECT.', { fg: 'yellow', bg: 'black' });
  writeText(page, 11, 1, 'LAST SEEN DATA UNAVAILABLE.', { fg: 'yellow', bg: 'black' });

  applyFastext(page, {
    red:   { label: 'INDEX',    page: 100 },
    green: null,
    yellow: null,
    cyan:  { label: 'HELP',    page: 199 },
  });

  return [page];
}

/**
 * Paginate an array of "items" using a render function.
 * Returns an array of Pages.
 *
 * @param {number}   pageNumber
 * @param {any[]}    items
 * @param {number}   rowsPerPage   How many body rows available.
 * @param {Function} renderItem    (page, item, row) => nextRow
 * @param {Function} applyLinks    (page, subpage, total) => void
 * @param {object}   [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function paginateItems(pageNumber, items, rowsPerPage, renderItem, applyLinks, ctx = {}) {
  if (items.length === 0) return [];

  const pages = [];
  let pageItems = [];
  let rowsUsed  = 0;

  function commitPage(batch) {
    const sp    = pages.length + 1;
    const page  = blankPage(pageNumber, sp, 1); // total updated below
    applyHeader(page, ctx.now);
    if (ctx.stale && ctx.cacheTs) writeCacheTag(page, ctx.cacheTs);

    let row = BODY_START;
    for (const item of batch) {
      row = renderItem(page, item, row);
      if (row > BODY_END) break;
    }

    applyLinks(page, sp, -1); // total placeholder
    pages.push(page);
  }

  for (const item of items) {
    const needed = item._rows ?? 3;
    if (pageItems.length > 0 && rowsUsed + needed > rowsPerPage) {
      commitPage(pageItems);
      pageItems = [];
      rowsUsed  = 0;
    }
    pageItems.push(item);
    rowsUsed += needed;
  }
  if (pageItems.length > 0) commitPage(pageItems);

  // Patch subpageTotal now that we know the count.
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    pages[i].subpage      = i + 1;
    pages[i].subpageTotal = total;
  }

  return pages;
}

// Re-export writeText from grid for convenience.
export { writeText, blankPage, applyHeaderRow };
