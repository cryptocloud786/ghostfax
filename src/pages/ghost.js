/**
 * src/pages/ghost.js
 * Page 666 — Ghost of Ceefax.
 *
 * Features:
 *  - Mosaic ghost figure built from a bitmap via mosaic.encode
 *  - Flashing "BOO" cells (when effects enabled)
 *  - Ceefax obituary (Ceefax: 23 Sep 1974 – 23 Oct 2012)
 *  - Live Halloween countdown (days/hours/mins/secs to Oct 31)
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { encode as mosaicEncode } from '../teletext/mosaic.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext,
} from './_builder.js';

export const numbers = [666];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'WRITER',  page: 700 },
  yellow: { label: 'SUBS',    page: 888 },
  cyan:   { label: 'HELP',    page: 199 },
};

/**
 * Ghost bitmap — 12 wide × 14 tall pixel grid.
 * Each row: 12 bits (true = set).
 * Rendered as 6-wide × 14-tall text cells using 2×1 mosaic pairs per row.
 * (We use a 2-col wide mosaic: each text cell covers 2 pixel columns.)
 *
 * Layout uses pairs of columns → 6 mosaic chars wide = 12 pixel cols.
 * Rows use 2 pixel rows per text row (top+bottom of sextant) → 7 text rows.
 */
const GHOST_BITMAP = [
  // Row 0-1 (head top)
  [0,0,1,1,1,1,1,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,0,0,0],
  // Row 2-3 (head mid with eyes)
  [1,1,0,1,1,0,1,1,1,1,0,0],
  [1,1,0,1,1,0,1,1,1,1,0,0],
  // Row 4-5 (mouth)
  [1,1,1,0,0,1,0,0,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,0,0],
  // Row 6-7 (body)
  [1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,0,0],
  // Row 8-9 (body lower)
  [1,1,1,1,1,1,1,1,1,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,0,0],
  // Row 10-11 (tattered bottom)
  [1,1,0,1,1,0,1,0,1,1,0,0],
  [1,0,0,0,1,0,0,0,1,0,0,0],
  // Row 12-13 (tail wisps)
  [0,1,0,0,0,1,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0],
];

/**
 * Render the ghost mosaic onto the page.
 * The bitmap is 12×14 pixels → 6 text cols × 7 text rows.
 * Placed at text col 2, text row 4.
 *
 * Each mosaic cell covers 2 pixel cols (left,right) × 3 pixel rows (top,mid,bot).
 * We map 2 bitmap rows per text row and use only top+bottom bits (bits 0,1,4,5).
 * Mid bits (2,3) copy the bottom row to fill the cell.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {string} fg
 */
function drawGhost(page, fg = 'white') {
  const TEXT_COL = 2;
  const TEXT_ROW = 4;
  const PIXEL_COLS = 12; // must be even
  const PIXEL_ROWS = 14; // must be divisible by 2

  for (let pr = 0; pr < PIXEL_ROWS; pr += 2) {
    const textRow = TEXT_ROW + Math.floor(pr / 2);
    for (let pc = 0; pc < PIXEL_COLS; pc += 2) {
      const textCol = TEXT_COL + Math.floor(pc / 2);

      const r0 = GHOST_BITMAP[pr]     ?? [];
      const r1 = GHOST_BITMAP[pr + 1] ?? [];

      // Sextant bit layout:
      // bit0=top-left  bit1=top-right
      // bit2=mid-left  bit3=mid-right
      // bit4=bot-left  bit5=bot-right
      const b0 = Boolean(r0[pc]);
      const b1 = Boolean(r0[pc + 1]);
      const b2 = Boolean(r1[pc]);     // mid = same as bot row
      const b3 = Boolean(r1[pc + 1]);
      const b4 = Boolean(r1[pc]);
      const b5 = Boolean(r1[pc + 1]);

      const ch = mosaicEncode([b0, b1, b2, b3, b4, b5]);
      const cellFg = (ch === ' ') ? 'black' : fg;
      const cell = page.rows[textRow]?.[textCol];
      if (cell) {
        cell.ch  = ch;
        cell.fg  = cellFg;
        cell.bg  = 'black';
      }
    }
  }
}

/**
 * Compute days/hours/mins/secs until the next Halloween (Oct 31).
 * @param {Date} now
 * @returns {{ days: number, hours: number, mins: number, secs: number }}
 */
export function halloweenCountdown(now) {
  const year  = now.getFullYear();
  let target  = new Date(year, 9, 31, 23, 59, 59); // Oct 31 this year
  if (now > target) {
    target = new Date(year + 1, 9, 31, 23, 59, 59); // next year
  }

  const diff  = Math.max(0, target.getTime() - now.getTime());
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  return {
    days,
    hours: hours % 24,
    mins:  mins  % 60,
    secs:  secs  % 60,
  };
}

/**
 * @param {any}    _data  unused (no external data)
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(_data, ctx = {}) {
  const now     = ctx.now     ?? new Date();
  const effects = ctx.effects ?? true;  // false when exorcised

  const page = blankPage(666);
  applyHeader(page, now);

  // Row 1: section header.
  writeText(page, 1, 0, 'P666 GHOST OF CEEFAX', { fg: 'black', bg: 'magenta' });
  writeText(page, 1, 20, '                    ', { fg: 'black', bg: 'magenta' });

  // Row 2: strapline.
  writeText(page, 2, 1, 'RISEN FROM THE GRAVE', { fg: 'white', bg: 'black' });

  // Ghost mosaic (rows 4–10, cols 2–7).
  drawGhost(page, 'white');

  // "BOO" text next to ghost — optionally flashing.
  writeText(page, 5, 10, 'BOO!', { fg: 'yellow', bg: 'black', flash: effects });
  writeText(page, 7, 10, 'WHO',  { fg: 'cyan',   bg: 'black', flash: effects });
  writeText(page, 8, 10, 'GOES', { fg: 'cyan',   bg: 'black', flash: effects });
  writeText(page, 9, 10, 'THERE?',{ fg: 'cyan',  bg: 'black', flash: false   });

  // Ceefax obituary (rows 12–14).
  writeText(page, 11, 1, 'CEEFAX  1974 - 2012', { fg: 'yellow', bg: 'black' });
  writeText(page, 12, 1, 'BORN:  23 SEP 1974',  { fg: 'white',  bg: 'black' });
  writeText(page, 13, 1, 'DIED:  23 OCT 2012',  { fg: 'white',  bg: 'black' });
  writeText(page, 14, 1, 'MOURNED BY MILLIONS,', { fg: 'white', bg: 'black' });
  writeText(page, 15, 1, 'RESURRECTED BY GHOSTFAX.', { fg: 'cyan', bg: 'black' });

  // Halloween countdown (rows 17–20).
  const cd = halloweenCountdown(now);
  writeText(page, 17, 1, 'NEXT HALLOWEEN IN:', { fg: 'yellow', bg: 'black' });
  writeText(page, 18, 1, `${String(cd.days).padStart(3, ' ')} DAYS`, { fg: 'red', bg: 'black' });
  writeText(page, 19, 1,
    `${String(cd.hours).padStart(2, '0')}H ` +
    `${String(cd.mins ).padStart(2, '0')}M ` +
    `${String(cd.secs ).padStart(2, '0')}S`,
    { fg: 'red', bg: 'black' });

  // Row 21: mood.
  writeText(page, 21, 1, 'THE GHOST STILL WALKS THE AIRWAVES.', { fg: 'magenta', bg: 'black' });

  applyFastext(page, FASTEXT);

  return [page];
}

export const sample = undefined; // no external data needed

registerPage(666, (_data, ctx) => Promise.resolve(build(_data, ctx)));
