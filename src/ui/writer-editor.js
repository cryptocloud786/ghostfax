/**
 * src/ui/writer-editor.js
 * Page 700 "Ghost Writer" editor: type straight onto the teletext grid.
 * Arrow keys move the cursor, Tab cycles the ink colour, Shift+Tab cycles
 * the paper colour, SHARE copies a #w= link. DOM-only.
 */

import { blankCanvas, encodeShare } from '../pages/writer.js';

const INKS = ['white', 'yellow', 'cyan', 'green', 'magenta', 'red', 'blue'];
const PAPERS = ['black', 'blue', 'red', 'magenta', 'green'];
const ROWS = 22;

let cells = starterCanvas();
let cursor = { r: 7, c: 2 };
let ink = 0;
let paper = 0;
let opts = { isActive: () => false, onChange: () => {} };

function put(canvas, r, text, fg = 'white', bg = 'black', c0 = 0) {
  [...text].forEach((ch, i) => {
    if (c0 + i < 40) canvas[r][c0 + i] = { ch, fg, bg };
  });
}

/** A friendly starting page instead of an empty void. */
function starterCanvas() {
  const cv = blankCanvas();
  put(cv, 0, ' GHOST WRITER                    P700 ', 'yellow', 'blue');
  put(cv, 2, ' Type anywhere on this page.', 'cyan');
  put(cv, 3, ' ARROWS move  TAB ink  SHIFT+TAB paper', 'white');
  put(cv, 4, ' Then press SHARE to haunt a friend.', 'green');
  return cv;
}

export function writerCells() {
  const view = cells.map((row) => row.map((cell) => ({ ...cell })));
  if (opts.isActive()) {
    const cur = view[cursor.r][cursor.c];
    view[cursor.r][cursor.c] = { ch: cur.ch === ' ' ? '_' : cur.ch, fg: 'black', bg: INKS[ink] };
  }
  return view;
}

export function setWriterCells(next) {
  if (Array.isArray(next) && next.length) cells = next;
}

export function writerActive() {
  return opts.isActive();
}

function move(dr, dc) {
  cursor.c += dc;
  if (cursor.c > 39) { cursor.c = 0; cursor.r += 1; }
  if (cursor.c < 0) { cursor.c = 39; cursor.r -= 1; }
  cursor.r = Math.max(0, Math.min(ROWS - 1, cursor.r + dr));
}

async function share() {
  const url = `${location.origin}${location.pathname}#w=${encodeShare(cells)}`;
  const btn = document.getElementById('btn-share');
  try {
    await navigator.clipboard.writeText(url);
    if (btn) btn.textContent = 'COPIED!';
  } catch {
    window.prompt('Copy this Ghostfax link:', url);
  }
  history.replaceState(null, '', url);
  setTimeout(() => { if (btn) btn.textContent = 'SHARE'; }, 1600);
}

export function initWriter(options) {
  opts = { ...opts, ...options };
  document.getElementById('btn-share')?.addEventListener('click', share);

  // Capture phase so the editor wins over the global keypad on page 700.
  document.addEventListener('keydown', (e) => {
    if (!opts.isActive() || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key;
    let handled = true;
    if (k === 'ArrowLeft') move(0, -1);
    else if (k === 'ArrowRight') move(0, 1);
    else if (k === 'ArrowUp') move(-1, 0);
    else if (k === 'ArrowDown' || k === 'Enter') { move(1, 0); if (k === 'Enter') cursor.c = 0; }
    else if (k === 'Backspace') { move(0, -1); cells[cursor.r][cursor.c] = { ch: ' ', fg: INKS[ink], bg: PAPERS[paper] }; }
    else if (k === 'Tab') { if (e.shiftKey) paper = (paper + 1) % PAPERS.length; else ink = (ink + 1) % INKS.length; }
    else if (k === 'Escape') { handled = false; }
    else if (k.length === 1 && k >= ' ' && k <= '~') {
      cells[cursor.r][cursor.c] = { ch: k.toUpperCase() === k ? k : k, fg: INKS[ink], bg: PAPERS[paper] };
      move(0, 1);
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopImmediatePropagation();
      opts.onChange();
    }
  }, true);

  // Click a cell to place the cursor.
  document.getElementById('grid')?.addEventListener('click', (e) => {
    if (!opts.isActive()) return;
    const el = e.target.closest('.cell');
    if (!el) return;
    const r = Number(el.dataset.row) - 1;
    const c = Number(el.dataset.col);
    if (r >= 0 && r < ROWS) { cursor = { r, c }; opts.onChange(); }
  });
}
