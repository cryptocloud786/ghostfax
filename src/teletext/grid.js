/**
 * src/teletext/grid.js
 * Pure module — no DOM, no side effects.
 *
 * Allocates and manipulates a 40×24 teletext Page.
 *
 * @typedef {import('./grid.js').Cell}    Cell
 * @typedef {import('./grid.js').Page}    Page
 * @typedef {import('./grid.js').Fastext} Fastext
 */

/** The only 8 permitted teletext colours. */
export const COLOURS = Object.freeze([
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
]);

const ROWS = 24;
const COLS = 40;

/**
 * Create one blank Cell with default styling.
 * @returns {Cell}
 */
function blankCell() {
  return { ch: ' ', fg: 'white', bg: 'black', flash: false, dh: false, conceal: false };
}

/**
 * Create a blank 40×24 Page.
 * @param {number} pageNumber   3-digit page number (100–899)
 * @param {number} [subpage=1]
 * @param {number} [subpageTotal=1]
 * @returns {Page}
 */
export function blankPage(pageNumber, subpage = 1, subpageTotal = 1) {
  const rows = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, blankCell)
  );
  return {
    number: pageNumber,
    subpage,
    subpageTotal,
    rows,
    fastext: { red: null, green: null, yellow: null, cyan: null },
  };
}

/**
 * Write a single character + optional styling into a page cell.
 * Silently ignores out-of-range positions.
 *
 * @param {Page}   page
 * @param {number} row   0-based row index  (0–23)
 * @param {number} col   0-based col index  (0–39)
 * @param {string} ch    single character
 * @param {Partial<Cell>} [attrs]
 */
export function setCell(page, row, col, ch, attrs = {}) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
  const cell = page.rows[row][col];
  cell.ch = String(ch)[0] ?? ' ';
  if (attrs.fg      !== undefined) cell.fg      = attrs.fg;
  if (attrs.bg      !== undefined) cell.bg      = attrs.bg;
  if (attrs.flash   !== undefined) cell.flash   = attrs.flash;
  if (attrs.dh      !== undefined) cell.dh      = attrs.dh;
  if (attrs.conceal !== undefined) cell.conceal = attrs.conceal;
}

/**
 * Write a string of characters across a row starting at col.
 * Stops at column 39.
 *
 * @param {Page}   page
 * @param {number} row
 * @param {number} startCol
 * @param {string} text
 * @param {Partial<Cell>} [attrs]
 */
export function writeText(page, row, startCol, text, attrs = {}) {
  for (let i = 0; i < text.length; i++) {
    setCell(page, row, startCol + i, text[i], attrs);
  }
}

// ── Abbreviated day/month names ────────────────────────────────────────────
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * Build the 40-cell header row (row 0).
 *
 * Template:  `P{pageNumber} GHOSTFAX {Day} {DD} {Mon} {HH:MM:SS}`
 * Layout (widths): 4 + 1 + 8 + 1 + 3 + 1 + 2 + 1 + 3 + 1 + 8 = 33 chars,
 * padded with trailing spaces to exactly 40.
 *
 * @param {number} pageNumber   100–899
 * @param {Date}   now
 * @returns {Cell[]} Array of exactly 40 cells
 */
export function buildHeaderRow(pageNumber, now) {
  const day  = DAYS[now.getDay()];
  const dd   = pad2(now.getDate());
  const mon  = MONTHS[now.getMonth()];
  const hh   = pad2(now.getHours());
  const mm   = pad2(now.getMinutes());
  const ss   = pad2(now.getSeconds());

  const text = `P${pageNumber} GHOSTFAX ${day} ${dd} ${mon} ${hh}:${mm}:${ss}`;
  // 33 chars; pad to 40
  const padded = text.padEnd(COLS, ' ').slice(0, COLS);

  return Array.from(padded, (ch) => ({
    ch,
    fg: 'cyan',
    bg: 'blue',
    flash: false,
    dh: false,
    conceal: false,
  }));
}

/**
 * Stamp the pre-built header row onto row 0 of a page.
 *
 * @param {Page} page
 * @param {Date} now
 */
export function applyHeaderRow(page, now) {
  const cells = buildHeaderRow(page.number, now);
  page.rows[0] = cells;
}
