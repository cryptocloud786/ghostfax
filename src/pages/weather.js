/**
 * src/pages/weather.js
 * Page 300 — Weather forecast with mosaic sextant bar chart.
 *
 * Layout:
 *   Row  0  — header (clock)
 *   Row  1  — section banner "P300 WEATHER SERVICE" + optional CACHED tag
 *   Row  2  — city name (cyan)
 *   Row  3  — current conditions: temp + wind + description
 *   Row  4  — blank
 *   Row  5  — mosaic chart label row: "NOW   +6H  +12H  +18H"
 *   Rows 5-11 — sextant bar chart of next-24-hour temperatures
 *             (chart columns start at col 8, 24 cols wide = one per hour)
 *             col 1-4: max/min labels ("-31C" / "+22C")
 *   Row 12  — hour-tick labels
 *   Row 13  — blank
 *   Row 14  — "5-DAY FORECAST:" label (yellow)
 *   Rows 15-19 — 5-day table (one row each)
 *   Row 20  — blank
 *   Row 21  — source line
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { encode as mosaicEncode } from '../teletext/mosaic.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext, writeCacheTag,
  noSignalPage,
} from './_builder.js';

export const numbers = [300];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'NEWS',    page: 101 },
  yellow: { label: 'TECH',    page: 110 },
  cyan:   { label: 'HISTORY', page: 400 },
};

/** Day abbreviations. */
const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * WMO weather codes → terse 14-char-max descriptions for the 5-day table.
 */
const WMO_SHORT = {
  0:  'CLEAR',        1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
  45: 'FOGGY',       48: 'RIME FOG',
  51: 'LT DRIZZLE',  53: 'DRIZZLE',     55: 'HVY DRIZZLE',
  61: 'LT RAIN',     63: 'RAIN',        65: 'HVY RAIN',
  71: 'LT SNOW',     73: 'SNOW',        75: 'HVY SNOW',
  80: 'LT SHOWERS',  81: 'SHOWERS',     82: 'SHOWERS+',
  95: 'THUNDER',     96: 'HAIL',        99: 'HEAVY HAIL',
};

function wmoShort(code) {
  return WMO_SHORT[code] ?? `CODE ${code}`;
}

/** Format temperature with sign, e.g. "+14C" or "-3C". */
function fmtTemp(t) {
  return `${t >= 0 ? '+' : ''}${t}C`;
}

/**
 * Draw the 24-column sextant bar chart for next-24-hour temperatures.
 *
 * The chart occupies rows 5–11 (7 text rows = 14 mosaic pixel rows).
 * Chart columns: col 8 to col 31 (24 columns, one per hour).
 * Left margin (cols 1–7): max label at top, min label at bottom.
 *
 * Each text cell is a sextant character covering 1 col × 3 pixel rows
 * (top/mid/bot bits in pairs).  We build the chart by computing, for each
 * column×row pair, whether the pixel is "filled" (bar is present).
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {{ hour: string, temp: number }[]} hourly   24-element array
 */
function drawHourlyChart(page, hourly) {
  if (!hourly || hourly.length === 0) return;

  const CHART_START_COL = 8;   // first data column
  const CHART_COLS      = Math.min(hourly.length, 24);
  const CHART_START_ROW = 5;   // first text row
  const CHART_ROWS      = 7;   // text rows (rows 5–11)
  // Each text row maps to 3 pixel rows. Total pixel rows = 21.
  const PIXEL_ROWS = CHART_ROWS * 3;

  const temps   = hourly.slice(0, CHART_COLS).map((h) => h.temp);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const range   = maxTemp - minTemp || 1;

  // Max/min labels on the left (cols 1–6), right-aligned in 6 chars.
  const maxLabel = fmtTemp(maxTemp).padStart(4, ' ');
  const minLabel = fmtTemp(minTemp).padStart(4, ' ');
  writeText(page, CHART_START_ROW,               1, maxLabel, { fg: 'yellow', bg: 'black' });
  writeText(page, CHART_START_ROW + CHART_ROWS - 1, 1, minLabel, { fg: 'cyan',   bg: 'black' });

  // For each chart column (one per hour), build a pixel column then encode
  // into sextant characters.
  for (let col = 0; col < CHART_COLS; col++) {
    const temp    = temps[col];
    // barTop is the pixel row at which the bar starts (from the top).
    // Lower temp → bar starts lower → more empty space above.
    // barTop = 0 means bar fills from very top.
    const fraction = (temp - minTemp) / range;          // 0..1, 0 = min
    const filledPx = Math.round(fraction * (PIXEL_ROWS - 1)) + 1; // 1..PIXEL_ROWS
    const barTopPx = PIXEL_ROWS - filledPx;             // 0-indexed from top

    const textCol = CHART_START_COL + col;

    for (let tr = 0; tr < CHART_ROWS; tr++) {
      const textRow = CHART_START_ROW + tr;
      // 3 pixel rows for this text row: top, mid, bot
      const px = [0, 1, 2].map((offset) => {
        const pixelRow = tr * 3 + offset;
        return pixelRow >= barTopPx;
      });

      // Sextant: bit0=top-left, bit1=top-right, bit2=mid-left, bit3=mid-right,
      //          bit4=bot-left, bit5=bot-right.
      // Single-column chart: both left and right of each cell are the same pixel.
      const bits = [px[0], px[0], px[1], px[1], px[2], px[2]];
      const ch   = mosaicEncode(bits);

      // Colour: warm for hot temps, cool for cold.
      const fg = temp >= 30 ? 'red'
               : temp >= 20 ? 'yellow'
               : temp >= 10 ? 'green'
               : 'cyan';

      const cell = page.rows[textRow]?.[textCol];
      if (cell) {
        cell.ch = ch;
        cell.fg = (ch === ' ') ? 'black' : fg;
        cell.bg = 'black';
      }
    }
  }
}

/**
 * Draw the hour-tick labels under the chart (row 12).
 * Shows "NOW", "+6H", "+12H", "+18H" at the relevant columns.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {{ hour: string, temp: number }[]} hourly
 */
function drawHourTicks(page, hourly) {
  const CHART_START_COL = 8;
  const TICK_ROW = 12;

  const ticks = [
    { offset: 0,  label: 'NOW' },
    { offset: 6,  label: '+6H' },
    { offset: 12, label: '+12H' },
    { offset: 18, label: '+18H' },
  ];

  for (const { offset, label } of ticks) {
    if (offset >= hourly.length) continue;
    const col = CHART_START_COL + offset;
    // Make sure label fits in 40 cols.
    if (col + label.length <= 39) {
      writeText(page, TICK_ROW, col, label, { fg: 'white', bg: 'black' });
    }
  }
}

/**
 * @typedef {{
 *   city: string,
 *   current: { temp: number, windSpeed: number, description: string },
 *   hourly: Array<{ hour: string, temp: number }>,
 *   daily: Array<{ date: string, maxTemp: number, minTemp: number, weatherCode: number }>,
 *   stale: boolean,
 *   cacheTs: number|null
 * }} WeatherData
 *
 * @param {WeatherData|null} data
 * @param {object} [ctx]
 * @returns {import('../teletext/grid.js').Page[]}
 */
export function build(data, ctx = {}) {
  const now = ctx.now ?? new Date();

  if (!data || !data.current) {
    if (data?.stale) return noSignalPage(300, now);

    // City prompt page.
    const page = blankPage(300);
    applyHeader(page, now);
    writeText(page, 1, 0, 'P300 WEATHER SERVICE', { fg: 'white', bg: 'green' });
    writeText(page, 1, 20, '                    ', { fg: 'white', bg: 'green' });
    writeText(page, 4,  1, 'LOCATION NOT SET.', { fg: 'yellow', bg: 'black' });
    writeText(page, 5,  1, 'GEOLOCATION UNAVAILABLE.', { fg: 'white', bg: 'black' });
    writeText(page, 7,  1, 'TO SET YOUR CITY, PRESS THE', { fg: 'white', bg: 'black' });
    writeText(page, 8,  1, '"CITY" BUTTON ON THE REMOTE.', { fg: 'white', bg: 'black' });
    applyFastext(page, FASTEXT);
    return [page];
  }

  const page = blankPage(300);
  applyHeader(page, now);

  // Row 1: section header.
  writeText(page, 1, 0, 'P300 WEATHER SERVICE', { fg: 'white', bg: 'green' });
  writeText(page, 1, 20, '                    ', { fg: 'white', bg: 'green' });
  if (data.stale && data.cacheTs) writeCacheTag(page, data.cacheTs);

  // Row 2: city name.
  const cityLine = `  ${data.city.toUpperCase().slice(0, 36)}`;
  writeText(page, 2, 0, cityLine.padEnd(40, ' '), { fg: 'cyan', bg: 'black' });

  // Row 3: current conditions.
  const cur  = data.current;
  const temp = fmtTemp(cur.temp);
  const wind = `WIND ${cur.windSpeed}KMH`;
  const desc = cur.description.toUpperCase().slice(0, 14);
  const condLine = `  ${temp}  ${wind}  ${desc}`.slice(0, 38);
  writeText(page, 3, 1, condLine.padEnd(38, ' '), { fg: 'white', bg: 'black' });

  // Rows 4–12: hourly sextant bar chart.
  const hourly = data.hourly ?? [];
  writeText(page, 4, 1, 'NEXT 24 HOURS', { fg: 'yellow', bg: 'black' });
  drawHourlyChart(page, hourly);
  drawHourTicks(page, hourly);

  // Row 13: spacer / separator.
  // (blank)

  // Row 14: 5-day heading.
  writeText(page, 14, 1, '5-DAY FORECAST', { fg: 'yellow', bg: 'black' });

  // Rows 15–19: one row per day.
  const daily = data.daily ?? [];
  for (let di = 0; di < Math.min(daily.length, 5); di++) {
    const day     = daily[di];
    const dayParts = day.date.split('-');
    const dayOfWeek = dayParts.length === 3
      ? (DAY_ABBR[new Date(day.date + 'T12:00:00Z').getDay()] ?? '---')
      : '---';

    const maxStr  = fmtTemp(day.maxTemp);
    const minStr  = fmtTemp(day.minTemp);
    const descStr = wmoShort(day.weatherCode ?? 0).slice(0, 14);

    // "WED   +29C / +21C  MAINLY CLEAR"  — stays within 38 chars
    // Layout: 3 + 2 + 5 + 3 + 5 + 2 + 14 = 34 chars max
    const row = 15 + di;
    writeText(page, row, 1, dayOfWeek, { fg: 'white', bg: 'black' });
    writeText(page, row, 6, maxStr,    { fg: 'yellow', bg: 'black' });
    writeText(page, row, 11, '/',      { fg: 'white',  bg: 'black' });
    writeText(page, row, 13, minStr,   { fg: 'cyan',   bg: 'black' });
    writeText(page, row, 19, descStr,  { fg: 'white',  bg: 'black' });
  }

  // Row 21: source line.
  writeText(page, 21, 1, 'DATA: OPEN-METEO.COM  FREE & OPEN', { fg: 'yellow', bg: 'black' });

  applyFastext(page, FASTEXT);

  return [page];
}

/**
 * Sample data for tests / grid-lint.
 * hourly array starts at index matching current.time for pickHourlySlice test.
 */
export const sample = {
  city: 'London',
  current: {
    temp: 14, windSpeed: 22, weatherCode: 2, description: 'PARTLY CLOUDY',
    time: '2025-10-31T09:00',
  },
  hourly: Array.from({ length: 48 }, (_, i) => ({
    hour: `${String(i % 24).padStart(2, '0')}:00`,
    temp: 10 + Math.round(Math.sin(i / 4) * 4),
  })),
  daily: [
    { date: '2025-10-31', maxTemp: 15, minTemp:  8, weatherCode: 61 },
    { date: '2025-11-01', maxTemp: 12, minTemp:  5, weatherCode: 63 },
    { date: '2025-11-02', maxTemp: 10, minTemp:  3, weatherCode: 75 },
    { date: '2025-11-03', maxTemp: 14, minTemp:  7, weatherCode:  1 },
    { date: '2025-11-04', maxTemp: 17, minTemp:  9, weatherCode:  0 },
  ],
  stale:   false,
  cacheTs: null,
};

registerPage(300, (data, ctx) => Promise.resolve(build(data ?? sample, ctx)));
