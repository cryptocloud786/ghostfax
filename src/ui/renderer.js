/**
 * src/ui/renderer.js
 * DOM renderer — writes a Page onto the #grid element.
 *
 * DOM-only: this module must not be imported in Node tests.
 */

const COLOUR_MAP = {
  black:   '#000000',
  red:     '#cc0000',
  green:   '#00cc00',
  yellow:  '#cccc00',
  blue:    '#0000cc',
  magenta: '#cc00cc',
  cyan:    '#00cccc',
  white:   '#cccccc',
};

/** The grid container element. */
const grid = document.getElementById('grid');

/** Currently displayed page (for clock ticks and reveal). */
let _currentPage  = null;
let _revealActive = false;

/** Cell DOM elements indexed [row][col] — built once, reused. */
let _cells = [];

/**
 * Build the 24×40 DOM grid once on first render.
 */
function ensureGrid() {
  if (_cells.length === 40) return; // already built (check col count via row 0)
  if (grid.children.length > 0) {
    // Collect existing cells.
    _cells = [];
    for (let r = 0; r < 24; r++) {
      _cells[r] = [];
      for (let c = 0; c < 40; c++) {
        _cells[r][c] = grid.children[r * 40 + c];
      }
    }
    return;
  }

  grid.innerHTML = '';
  _cells = [];
  for (let r = 0; r < 24; r++) {
    _cells[r] = [];
    for (let c = 0; c < 40; c++) {
      const el = document.createElement('span');
      el.className = 'cell';
      el.dataset.row = r;
      el.dataset.col = c;
      grid.appendChild(el);
      _cells[r][c] = el;
    }
  }
}

/**
 * Apply a single Cell data object to a DOM span.
 * @param {HTMLElement} el
 * @param {import('../teletext/grid.js').Cell} cell
 * @param {boolean} reveal
 */
function applyCell(el, cell, reveal) {
  // Character — use non-breaking space to preserve cell width for spaces.
  el.textContent = cell.ch === ' ' ? '\u00A0' : cell.ch;

  // Colours.
  el.style.color      = COLOUR_MAP[cell.fg] ?? COLOUR_MAP.white;
  el.style.background = COLOUR_MAP[cell.bg] ?? COLOUR_MAP.black;

  // Attributes via CSS classes.
  el.classList.toggle('dh',      Boolean(cell.dh));
  el.classList.toggle('flash',   Boolean(cell.flash));
  el.classList.toggle('conceal', Boolean(cell.conceal) && !reveal);
  el.classList.toggle('revealed', Boolean(cell.conceal) && reveal);

  // Double-height: scale via transform; let the next row be blank/hidden.
  if (cell.dh) {
    el.style.transform      = 'scaleY(2)';
    el.style.transformOrigin = '50% 0%';
    el.style.lineHeight     = '';
  } else {
    el.style.transform      = '';
    el.style.transformOrigin = '';
  }
}

/**
 * Render a complete Page onto the DOM grid.
 *
 * @param {import('../teletext/grid.js').Page} page
 */
export function renderPage(page) {
  ensureGrid();
  _currentPage = page;

  for (let r = 0; r < 24; r++) {
    const row = page.rows[r];
    if (!row) continue;
    for (let c = 0; c < 40; c++) {
      applyCell(_cells[r][c], row[c], _revealActive);
    }
  }
}

/**
 * Re-render only the header row (row 0) — called by clock.js every second.
 * @param {import('../teletext/grid.js').Cell[]} headerCells  40 cells
 */
export function renderHeaderRow(headerCells) {
  if (!_cells[0]) return;
  for (let c = 0; c < 40; c++) {
    applyCell(_cells[0][c], headerCells[c], _revealActive);
  }
}

/**
 * Set the reveal state. Re-renders conceal cells without full page repaint.
 * @param {boolean} active
 */
export function setReveal(active) {
  _revealActive = active;
  if (!_currentPage) return;
  for (let r = 0; r < 24; r++) {
    const row = _currentPage.rows[r];
    if (!row) continue;
    for (let c = 0; c < 40; c++) {
      if (row[c].conceal) {
        applyCell(_cells[r][c], row[c], active);
      }
    }
  }
}

/**
 * Show a "rolling counter" animation on the header row during navigation.
 * Cycles from `from` to `to` over ~800 ms in steps.
 *
 * @param {number}   from       Current page number.
 * @param {number}   to         Target page number.
 * @param {Function} onDone     Called when animation finishes.
 * @param {boolean}  [skip=false] Skip animation (reduced-motion).
 */
export function animatePageRoll(from, to, onDone, skip = false) {
  if (skip) { onDone(); return; }

  const DURATION = 800;
  const STEPS    = 16;
  const interval = DURATION / STEPS;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const frac = step / STEPS;
    const mid  = Math.round(from + (to - from) * frac);
    // Update just cols 0–3 (P + 3 digits) in the header.
    const label = `P${String(mid).padStart(3, '0')}`;
    if (_cells[0]) {
      for (let c = 0; c < 4; c++) {
        _cells[0][c].textContent = label[c];
      }
    }
    if (step >= STEPS) {
      clearInterval(timer);
      onDone();
    }
  }, interval);
}

/**
 * Show partial digit entry in the header (e.g. "P3__").
 * @param {string} digits  1–3 partial digits entered so far.
 * @param {number} currentPageNumber  Current page for context.
 */
export function showDigitEntry(digits, currentPageNumber) {
  ensureGrid();
  if (!_cells[0]) return;
  const placeholder = digits.padEnd(3, '-');
  const label = `P${placeholder}`;
  for (let c = 0; c < 4; c++) {
    _cells[0][c].textContent = label[c] ?? '\u00A0';
  }
}

/**
 * Return the current page (for clock.js).
 * @returns {import('../teletext/grid.js').Page|null}
 */
export function getCurrentPage() { return _currentPage; }
