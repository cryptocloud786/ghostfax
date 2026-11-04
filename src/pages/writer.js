/**
 * src/pages/writer.js
 * Page 700 — Ghost Writer (editable teletext canvas).
 *
 * Pure functions:
 *   encodeShare(cells)  → URL-safe base64 string
 *   decodeShare(str)    → cells array or null
 *
 * The page builder renders a blank editable canvas by default,
 * or pre-fills cells from ctx.cells if provided.
 */

import { blankPage, writeText, COLOURS } from '../teletext/grid.js';
import { registerPage } from '../teletext/router.js';
import { applyHeader, applyFastext } from './_builder.js';

export const numbers = [700];

const FASTEXT = {
  red:    { label: 'INDEX',  page: 100 },
  green:  { label: 'GHOST',  page: 666 },
  yellow: { label: 'SUBS',   page: 888 },
  cyan:   { label: 'HELP',   page: 199 },
};

/** Editable area: rows 1–22, cols 0–39 = 22×40 = 880 cells. */
const EDIT_ROWS     = 22;
const EDIT_ROW_START = 1;

/**
 * A minimal cell shape for the share payload.
 * @typedef {{ ch: string, fg: string, bg: string }} ShareCell
 */

/**
 * Encode the editable canvas state into a URL-safe base64 string.
 *
 * Encoding: flat array of 880 objects { ch, fg, bg } → JSON → base64url.
 * We minimise size by encoding colours as single hex digits (0–7 index).
 *
 * Final format: base64url(JSON.stringify([...]))
 * The JSON is a flat array of strings, each 3 chars: char + fgIdx + bgIdx.
 *
 * @param {ShareCell[][]} cells  22 rows × 40 cols
 * @returns {string}
 */
export function encodeShare(cells) {
  const flat = [];
  for (let r = 0; r < EDIT_ROWS; r++) {
    const row = cells[r] ?? [];
    for (let c = 0; c < 40; c++) {
      const cell  = row[c] ?? { ch: ' ', fg: 'white', bg: 'black' };
      const ch    = String(cell.ch ?? ' ')[0] ?? ' ';
      const fgIdx = COLOURS.indexOf(cell.fg);
      const bgIdx = COLOURS.indexOf(cell.bg);
      flat.push(`${ch}${fgIdx < 0 ? 7 : fgIdx}${bgIdx < 0 ? 0 : bgIdx}`);
    }
  }
  const json = JSON.stringify(flat);
  // btoa is available in browser and Node 16+.
  const b64  = btoa(json);
  // Make URL-safe.
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a share string back into cells.
 *
 * @param {string} str
 * @returns {ShareCell[][]|null}  22×40 array, or null if invalid.
 */
export function decodeShare(str) {
  try {
    // Restore base64.
    const b64  = str.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const flat = JSON.parse(json);

    if (!Array.isArray(flat) || flat.length !== EDIT_ROWS * 40) return null;

    const cells = [];
    for (let r = 0; r < EDIT_ROWS; r++) {
      const row = [];
      for (let c = 0; c < 40; c++) {
        const entry = flat[r * 40 + c];
        if (typeof entry !== 'string' || entry.length !== 3) return null;
        const ch    = entry[0];
        const fgIdx = parseInt(entry[1], 10);
        const bgIdx = parseInt(entry[2], 10);
        if (isNaN(fgIdx) || isNaN(bgIdx)) return null;
        row.push({
          ch,
          fg: COLOURS[fgIdx] ?? 'white',
          bg: COLOURS[bgIdx] ?? 'black',
        });
      }
      cells.push(row);
    }
    return cells;
  } catch {
    return null;
  }
}

/**
 * Create a blank editable canvas (22×40 of space cells).
 * @returns {ShareCell[][]}
 */
export function blankCanvas() {
  return Array.from({ length: EDIT_ROWS }, () =>
    Array.from({ length: 40 }, () => ({ ch: ' ', fg: 'white', bg: 'black' }))
  );
}

/**
 * @param {any}    _data  unused
 * @param {object} [ctx]   ctx.cells: optional 22×40 ShareCell[][] from decodeShare
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(_data, ctx = {}) {
  const now   = ctx.now ?? new Date();
  const cells = ctx.cells ?? blankCanvas();

  const page = blankPage(700);
  applyHeader(page, now);

  // Apply the editable cells to rows 1–22.
  for (let r = 0; r < EDIT_ROWS; r++) {
    const srcRow  = cells[r] ?? [];
    const pageRow = page.rows[EDIT_ROW_START + r];
    if (!pageRow) continue;
    for (let c = 0; c < 40; c++) {
      const src  = srcRow[c] ?? { ch: ' ', fg: 'white', bg: 'black' };
      pageRow[c] = {
        ch:      String(src.ch ?? ' ')[0] ?? ' ',
        fg:      COLOURS.includes(src.fg) ? src.fg : 'white',
        bg:      COLOURS.includes(src.bg) ? src.bg : 'black',
        flash:   false,
        dh:      false,
        conceal: false,
      };
    }
  }

  // Row 0 already set by applyHeader; rows 1–22 come from the canvas.
  applyFastext(page, FASTEXT);

  return [page];
}

export const sample = undefined; // no external data

registerPage(700, (_data, ctx) => Promise.resolve(build(_data, ctx)));
