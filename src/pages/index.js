/**
 * src/pages/index.js
 * Page 100 — GHOSTFAX Directory Index.
 *
 * No external data needed — static content only.
 * Registers itself in the page registry.
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { registerPage } from '../teletext/router.js';
import { applyHeader, applyFastext, writeDoubleHeight } from './_builder.js';

export const numbers = [100];

/** @type {Array<{ page: number, colour: string, label: string, desc: string }>} */
const DIRECTORY = [
  { page: 101, colour: 'cyan',    label: 'IN THE NEWS',    desc: 'Latest headlines from Wikipedia' },
  { page: 110, colour: 'cyan',    label: 'TECH NEWS',      desc: 'Hacker News top stories'         },
  { page: 300, colour: 'green',   label: 'WEATHER',        desc: 'Forecast from Open-Meteo'        },
  { page: 400, colour: 'yellow',  label: 'ON THIS DAY',    desc: 'History via Wikipedia'           },
  { page: 500, colour: 'green',   label: 'MARKETS',        desc: 'Crypto prices from CoinGecko'    },
  { page: 666, colour: 'magenta', label: 'GHOST PAGE',     desc: 'Risen from the grave'            },
  { page: 700, colour: 'cyan',    label: 'GHOST WRITER',   desc: 'Editable teletext canvas'        },
  { page: 888, colour: 'white',   label: 'SUBTITLES',      desc: 'Live speech captions'            },
  { page: 199, colour: 'white',   label: 'HELP',           desc: 'Keys and shortcuts'              },
];

/**
 * @param {any}    _data  unused
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(_data, ctx = {}) {
  const now  = ctx.now ?? new Date();
  const page = blankPage(100);
  applyHeader(page, now);

  // Row 0: header (applied above)
  // Row 1: service strapline
  writeText(page, 1, 0, '    GHOSTFAX  TELETEXT  SERVICE    ', { fg: 'yellow', bg: 'black' });

  // Row 2: tagline
  writeText(page, 2, 0, '      RISEN FROM THE GRAVE 1974    ', { fg: 'cyan',   bg: 'black' });

  // Row 3: separator
  writeText(page, 3, 0, ' '.repeat(40), { fg: 'black', bg: 'black' });

  // Rows 4–21: directory entries (2 rows each = title + desc)
  let row = 4;
  for (const entry of DIRECTORY) {
    if (row + 1 > 21) break;

    // Page number + label
    const numStr  = String(entry.page).padStart(3, ' ');
    const label   = `P${numStr}  ${entry.label}`;
    writeText(page, row, 1, label.slice(0, 38), { fg: entry.colour, bg: 'black' });

    // Description (indented)
    const desc = `      ${entry.desc}`;
    writeText(page, row + 1, 1, desc.slice(0, 38), { fg: 'white', bg: 'black' });

    row += 2;
  }

  // Row 22: prompt
  writeText(page, 22, 1, 'TYPE A PAGE NUMBER OR USE FASTEXT', { fg: 'yellow', bg: 'black' });

  applyFastext(page, {
    red:    { label: 'NEWS',    page: 101 },
    green:  { label: 'TECH',    page: 110 },
    yellow: { label: 'WEATHER', page: 300 },
    cyan:   { label: 'HISTORY', page: 400 },
  });

  return [page];
}

// Sample data for tests / grid-lint (no external data needed).
export const sample = undefined;

// Self-register.
registerPage(100, (data, ctx) => Promise.resolve(build(data, ctx)));
