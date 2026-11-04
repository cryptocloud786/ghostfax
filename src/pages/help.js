/**
 * src/pages/help.js
 * Page 199 — Help (keyboard shortcuts & page directory).
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { registerPage } from '../teletext/router.js';
import { applyHeader, applyFastext } from './_builder.js';

export const numbers = [199];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'NEWS',    page: 101 },
  yellow: { label: 'WEATHER', page: 300 },
  cyan:   { label: 'GHOST',   page: 666 },
};

// ── Help content ─────────────────────────────────────────────────────────

const PAGE1_KEYS = [
  // [key, description]  — both fit within 38 chars total
  ['0-9',      'TYPE PAGE NUMBER (3 DIGITS)'],
  ['ENTER',    'CONFIRM PAGE SELECTION'],
  ['BKSP',     'CANCEL DIGIT ENTRY'],
  ['F1',       'FASTEXT RED BUTTON'],
  ['F2',       'FASTEXT GREEN BUTTON'],
  ['F3',       'FASTEXT YELLOW BUTTON'],
  ['F4',       'FASTEXT CYAN BUTTON'],
  ['H',        'HOLD / RESUME SUBPAGE'],
  ['R',        'REVEAL HIDDEN TEXT'],
];

const PAGE1_DIRECTORY = [
  ['100', 'INDEX     — MAIN DIRECTORY'],
  ['101', 'NEWS      — IN THE NEWS'],
  ['110', 'TECH      — HACKER NEWS'],
  ['199', 'HELP      — THIS PAGE'],
  ['300', 'WEATHER   — FORECAST'],
  ['400', 'HISTORY   — ON THIS DAY'],
  ['500', 'MARKETS   — CRYPTO PRICES'],
  ['666', 'GHOST     — GHOST OF CEEFAX'],
  ['700', 'WRITER    — GHOST WRITER'],
  ['888', 'SUBTITLES — LIVE CAPTIONS'],
];

/**
 * @param {any}    _data  unused
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(_data, ctx = {}) {
  const now = ctx.now ?? new Date();

  // ── Page 1: Keyboard shortcuts ──────────────────────────────────────────
  const p1 = blankPage(199, 1, 2);
  applyHeader(p1, now);

  writeText(p1, 1, 0, 'P199 GHOSTFAX HELP  1/2', { fg: 'black', bg: 'cyan' });
  writeText(p1, 1, 23, '                 ', { fg: 'black', bg: 'cyan' });

  writeText(p1, 2, 1, 'KEYBOARD SHORTCUTS', { fg: 'yellow', bg: 'black' });
  writeText(p1, 3, 1, '------------------', { fg: 'cyan',   bg: 'black' });

  let row = 4;
  for (const [key, desc] of PAGE1_KEYS) {
    if (row > 21) break;
    const keyPad  = key.padEnd(7, ' ').slice(0, 7);
    const descStr = desc.slice(0, 30);
    writeText(p1, row, 1,  keyPad,  { fg: 'cyan',  bg: 'black' });
    writeText(p1, row, 9,  descStr, { fg: 'white', bg: 'black' });
    row++;
  }

  applyFastext(p1, FASTEXT);

  // ── Page 2: Page directory ──────────────────────────────────────────────
  const p2 = blankPage(199, 2, 2);
  applyHeader(p2, now);

  writeText(p2, 1, 0, 'P199 GHOSTFAX HELP  2/2', { fg: 'black', bg: 'cyan' });
  writeText(p2, 1, 23, '                 ', { fg: 'black', bg: 'cyan' });

  writeText(p2, 2, 1, 'PAGE DIRECTORY', { fg: 'yellow', bg: 'black' });
  writeText(p2, 3, 1, '--------------', { fg: 'cyan',   bg: 'black' });

  row = 4;
  for (const [num, desc] of PAGE1_DIRECTORY) {
    if (row > 21) break;
    writeText(p2, row, 1, `P${num}`, { fg: 'cyan',  bg: 'black' });
    writeText(p2, row, 6, desc.slice(0, 33), { fg: 'white', bg: 'black' });
    row++;
  }

  writeText(p2, row + 1, 1, 'GHOSTFAX - TELETEXT RISEN FROM', { fg: 'magenta', bg: 'black' });
  writeText(p2, row + 2, 1, 'THE GRAVE.  KIROWEEN 2026.', { fg: 'magenta', bg: 'black' });

  applyFastext(p2, FASTEXT);

  return [p1, p2];
}

export const sample = undefined;

registerPage(199, (_data, ctx) => Promise.resolve(build(_data, ctx)));
