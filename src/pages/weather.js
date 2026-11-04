/**
 * src/pages/weather.js
 * Page 300 — Weather forecast with mosaic bar chart.
 */

import { blankPage, writeText } from '../teletext/grid.js';
import { encode as mosaicEncode } from '../teletext/mosaic.js';
import { registerPage } from '../teletext/router.js';
import {
  applyHeader, applyFastext, writeCacheTag,
  noSignalPage, BODY_COL, BODY_WIDTH,
} from './_builder.js';

export const numbers = [300];

const FASTEXT = {
  red:    { label: 'INDEX',   page: 100 },
  green:  { label: 'NEWS',    page: 101 },
  yellow: { label: 'TECH',    page: 110 },
  cyan:   { label: 'HISTORY', page: 400 },
};

/** Day abbreviations for the daily forecast. */
const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Build a mosaic temperature bar chart across 5 days.
 * Chart occupies rows 14–20 (7 rows).
 *
 * Each day column is 7 chars wide (5 days × 7 = 35 chars, col 2–36).
 * The bar height represents the temperature range within a fixed scale.
 *
 * @param {import('../teletext/grid.js').Page} page
 * @param {Array<{date:string,maxTemp:number,minTemp:number}>} daily
 */
function drawBarChart(page, daily) {
  if (!daily || daily.length === 0) return;

  // Find global min/max for scale.
  const allMax = daily.map(d => d.maxTemp);
  const allMin = daily.map(d => d.minTemp);
  const globalMax = Math.max(...allMax, 0);
  const globalMin = Math.min(...allMin, 0);
  const range = globalMax - globalMin || 1;

  // Chart area: rows 14–20 (7 visible rows = 14 mosaic pixel rows).
  const CHART_TOP_ROW = 14;
  const CHART_ROWS    = 7; // text rows; each row = 2 mosaic pixel rows (top/mid of 2x3)
  // We use a simple 1-row-per-temp-unit approach: map temp to row.
  const CHART_BOTTOM  = CHART_TOP_ROW + CHART_ROWS - 1; // row 20

  // Column layout: 5 days, each 7 chars wide starting at col 2.
  const COL_WIDTH = 7;
  const COL_START = 2;

  for (let di = 0; di < Math.min(daily.length, 5); di++) {
    const day      = daily[di];
    const colBase  = COL_START + di * COL_WIDTH;

    // Date label from ISO date string "YYYY-MM-DD".
    const parts    = day.date.split('-');
    const dayOfWeek = parts.length === 3
      ? DAY_ABBR[new Date(day.date + 'T12:00:00').getDay()] ?? '---'
      : '---';
    const dateLabel = dayOfWeek.padEnd(COL_WIDTH, ' ').slice(0, COL_WIDTH);
    writeText(page, CHART_TOP_ROW - 1, colBase, dateLabel, { fg: 'cyan', bg: 'black' });

    // For each chart row, decide if we're inside the min-max bar.
    // Map: row CHART_TOP_ROW = globalMax, row CHART_BOTTOM = globalMin.
    for (let r = CHART_TOP_ROW; r <= CHART_BOTTOM; r++) {
      const fraction = 1 - (r - CHART_TOP_ROW) / (CHART_ROWS - 1);
      const tempAtRow = globalMin + fraction * range;

      const inBar = tempAtRow >= day.minTemp && tempAtRow <= day.maxTemp;
      const aboveMax = tempAtRow > day.maxTemp;

      // Draw 2 mosaic chars per column (left + right of 2-wide block).
      // Use solid block for bar, space otherwise.
      const barChar = inBar ? '█' : ' ';
      const fg      = inBar
        ? (day.maxTemp >= 25 ? 'red' : day.maxTemp >= 15 ? 'yellow' : 'cyan')
        : 'black';

      // Write 4 chars of bar (leaving 2 for gap + 1 for label separator).
      const barStr = barChar.repeat(4).padEnd(COL_WIDTH - 1, ' ');
      writeText(page, r, colBase, barStr, { fg, bg: 'black' });
    }

    // Max/min labels at bottom.
    const maxStr = `${day.maxTemp > 0 ? '+' : ''}${day.maxTemp}`;
    const minStr = `${day.minTemp > 0 ? '+' : ''}${day.minTemp}`;
    const tempLine = `${maxStr}/${minStr}`.slice(0, COL_WIDTH).padEnd(COL_WIDTH, ' ');
    writeText(page, CHART_BOTTOM + 1, colBase, tempLine, { fg: 'white', bg: 'black' });
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
    writeText(page, 7,  1, 'TO SET YOUR CITY, USE THE', { fg: 'white', bg: 'black' });
    writeText(page, 8,  1, 'REMOTE CONTROL MENU OR', { fg: 'white', bg: 'black' });
    writeText(page, 9,  1, 'VISIT PAGE 300 FROM THE', { fg: 'white', bg: 'black' });
    writeText(page, 10, 1, 'APP SETTINGS.', { fg: 'white', bg: 'black' });
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
  const temp = `${cur.temp > 0 ? '+' : ''}${cur.temp}C`;
  const wind = `WIND ${cur.windSpeed}KMH`;
  const desc = cur.description.slice(0, 16);
  const condLine = `  ${temp}  ${wind}  ${desc}`.slice(0, 38);
  writeText(page, 3, 1, condLine.slice(0, 38), { fg: 'white', bg: 'black' });

  // Row 13 separator label.
  writeText(page, 12, 1, '5-DAY FORECAST:', { fg: 'yellow', bg: 'black' });

  // Mosaic bar chart rows 13–20.
  drawBarChart(page, data.daily ?? []);

  // Row 22: note.
  writeText(page, 22, 1, 'DATA: OPEN-METEO.COM  FREE & OPEN', { fg: 'yellow', bg: 'black' });

  applyFastext(page, FASTEXT);

  return [page];
}

/**
 * Sample data for tests / grid-lint.
 */
export const sample = {
  city: 'London',
  current: { temp: 14, windSpeed: 22, weatherCode: 2, description: 'PARTLY CLOUDY' },
  hourly: Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
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
