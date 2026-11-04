/**
 * src/ui/clock.js
 * 1 Hz tick that updates only the header row HH:MM:SS cells.
 * DOM-only module.
 */

import { buildHeaderRow } from '../teletext/grid.js';
import { renderHeaderRow, getCurrentPage } from './renderer.js';

let _tickTimer = null;

/**
 * Start the 1 Hz clock.  Safe to call multiple times (no-op if already running).
 */
export function startClock() {
  if (_tickTimer !== null) return;

  _tickTimer = setInterval(() => {
    const page = getCurrentPage();
    if (!page) return;
    const cells = buildHeaderRow(page.number, new Date());
    renderHeaderRow(cells);
  }, 1000);
}

/**
 * Stop the clock (useful for tests / teardown).
 */
export function stopClock() {
  if (_tickTimer !== null) {
    clearInterval(_tickTimer);
    _tickTimer = null;
  }
}
