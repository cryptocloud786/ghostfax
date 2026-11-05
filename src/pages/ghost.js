/**
 * src/pages/ghost.js
 * Page 666 — Ghost of Ceefax.
 *
 * Features:
 *  - Mosaic ghost figure: rounded head, hollow eyes, "O" mouth, wavy tail
 *    — 16 pixel-cols × 21 pixel-rows → 8 text-cols × 7 text-rows
 *  - Flashing "BOO!" in red double-height to the right of the ghost
 *  - Ceefax obituary
 *  - Live Halloween countdown
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
 * Ghost pixel bitmap — 16 columns × 21 rows.
 * 1 = lit (white), 0 = dark (background).
 *
 * Design:
 *   Rows  0-1:  head top (dome)
 *   Rows  2-3:  head upper — wide
 *   Rows  4-5:  eyes row — hollow circles (lit surround, dark centre)
 *   Rows  6-7:  between eyes and mouth
 *   Rows  8-9:  mouth row — "O" shape (lit surround, dark centre)
 *   Rows 10-11: lower body
 *   Rows 12-13: body base
 *   Rows 14-15: wavy skirt — alternating bumps
 *   Rows 16-17: wavy tail — narrower
 *   Rows 18-19: wispy tips
 *   Row  20:    ghost floor (thin wisps)
 */
const GHOST_BITMAP = [
  // Row 0  — dome top
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  // Row 1  — dome upper
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  // Row 2  — head wide
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  // Row 3  — head wide
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 4  — eye row (lit outside, dark inside eye sockets)
  [1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1],
  // Row 5  — eye row (hollow)
  [1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1],
  // Row 6  — between eyes and mouth
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 7  — mouth top (lip)
  [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
  // Row 8  — mouth hollow
  [1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1],
  // Row 9  — mouth hollow
  [1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1],
  // Row 10 — mouth bottom (lip)
  [1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1],
  // Row 11 — lower body
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 12 — body base
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 13 — body base
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  // Row 14 — wavy skirt: bumps down (3 bumps of 4-col each leaving gaps)
  [1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,1],
  // Row 15 — wavy skirt bottom of bumps
  [1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0],
  // Row 16 — narrowing tail wisps
  [0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0],
  // Row 17 — tail tips
  [0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  // Row 18 — thinning wisps
  [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 19 — single wisp
  [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
  // Row 20 — gone
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

/**
 * Render the ghost mosaic onto the page.
 *
 * Bitmap: 16 pixel-cols × 21 pixel-rows.
 * Text mapping: 2 pixel-cols → 1 text-col  ⇒  8 text-cols
 *               3 pixel-rows → 1 text-row  ⇒  7 text-rows
 *
 * Sextant bit layout within one cell:
 *   bit0 = top-left   bit1 = top-right
 *   bit2 = mid-left   bit3 = mid-right
 *   bit4 = bot-left   bit5 = bot-right
 *
 * Placed at text col 1, text row 3.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {string} fg
 */
function drawGhost(page, fg = 'white') {
  const TEXT_COL   = 1;
  const TEXT_ROW   = 3;
  const PIXEL_COLS = 16; // must be even
  const PIXEL_ROWS = 21; // ceil to multiple of 3 = 21

  for (let tc = 0; tc < PIXEL_COLS / 2; tc++) {
    const pc = tc * 2;  // pixel column pair
    for (let tr = 0; tr < Math.ceil(PIXEL_ROWS / 3); tr++) {
      const pr = tr * 3; // top pixel row of this text row

      const r0 = GHOST_BITMAP[pr]     ?? [];
      const r1 = GHOST_BITMAP[pr + 1] ?? [];
      const r2 = GHOST_BITMAP[pr + 2] ?? [];

      const b0 = Boolean(r0[pc]);
      const b1 = Boolean(r0[pc + 1]);
      const b2 = Boolean(r1[pc]);
      const b3 = Boolean(r1[pc + 1]);
      const b4 = Boolean(r2[pc]);
      const b5 = Boolean(r2[pc + 1]);

      const ch   = mosaicEncode([b0, b1, b2, b3, b4, b5]);
      const cellFg = (ch === ' ') ? 'black' : fg;
      const cell   = page.rows[TEXT_ROW + tr]?.[TEXT_COL + tc];
      if (cell) {
        cell.ch  = ch;
        cell.fg  = cellFg;
        cell.bg  = 'black';
      }
    }
  }
}

/**
 * Compute days/hours/mins/secs until the next Halloween (Oct 31 23:59:59).
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
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
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

  // Ghost mosaic (text rows 3–9, text cols 1–8).
  drawGhost(page, 'white');

  // "BOO!" to the right of the ghost — double-height, red, flashing.
  // Ghost occupies text cols 1–8; we place BOO! at col 11 (with space).
  // Double-height: write same text on two consecutive rows.
  const booRows = [3, 5, 7]; // pairs: (3,4), (5,6), (7,8)
  for (const r of booRows) {
    writeText(page, r,     11, 'BOO!', { fg: 'red', bg: 'black', flash: effects, dh: true });
    writeText(page, r + 1, 11, 'BOO!', { fg: 'red', bg: 'black', flash: effects, dh: true });
  }

  // Mood text to the right at col 17.
  writeText(page, 4,  17, 'WHO',    { fg: 'cyan', bg: 'black', flash: effects });
  writeText(page, 6,  17, 'GOES',   { fg: 'cyan', bg: 'black', flash: effects });
  writeText(page, 8,  17, 'THERE?', { fg: 'cyan', bg: 'black' });

  // Ceefax obituary (rows 11–14).
  writeText(page, 11, 1, 'CEEFAX  1974 - 2012',   { fg: 'yellow', bg: 'black' });
  writeText(page, 12, 1, 'BORN:  23 SEP 1974',    { fg: 'white',  bg: 'black' });
  writeText(page, 13, 1, 'DIED:  23 OCT 2012',    { fg: 'white',  bg: 'black' });
  writeText(page, 14, 1, 'MOURNED BY MILLIONS,',  { fg: 'white',  bg: 'black' });
  writeText(page, 15, 1, 'RESURRECTED BY GHOSTFAX.', { fg: 'cyan', bg: 'black' });

  // Halloween countdown (rows 17–19).
  const cd = halloweenCountdown(now);
  writeText(page, 17, 1, 'NEXT HALLOWEEN IN:', { fg: 'yellow', bg: 'black' });
  writeText(page, 18, 1,
    `${String(cd.days).padStart(3, ' ')} DAYS  ` +
    `${String(cd.hours).padStart(2, '0')}H ` +
    `${String(cd.mins ).padStart(2, '0')}M ` +
    `${String(cd.secs ).padStart(2, '0')}S`,
    { fg: 'red', bg: 'black' }
  );

  // Row 20: mood line.
  writeText(page, 20, 1, 'THE GHOST STILL WALKS THE AIRWAVES.', { fg: 'magenta', bg: 'black' });

  applyFastext(page, FASTEXT);

  return [page];
}

export const sample = undefined; // no external data needed

registerPage(666, (_data, ctx) => Promise.resolve(build(_data, ctx)));
