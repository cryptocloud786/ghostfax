/**
 * src/ui/accessibility.js
 * - Off-screen aria-live="polite" mirror of each page.
 * - Exorcise toggle (disable CRT effects), persisted to localStorage.
 * - prefers-reduced-motion detection.
 * DOM-only module.
 */

const MIRROR_ID    = 'aria-mirror';
const EXORCISE_KEY = 'gfx:exorcise';

const mirror    = document.getElementById(MIRROR_ID);
const exBtn     = document.getElementById('btn-exorcise');
const body      = document.body;

// ── Reduced-motion detection ───────────────────────────────────────────────

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Whether animations should be suppressed.
 * True when either: prefers-reduced-motion OR exorcise is active.
 */
export function isReducedMotion() {
  return motionQuery.matches;
}

export function isExorcised() {
  return !body.classList.contains('effects-enabled');
}

export function isAnimationSuppressed() {
  return motionQuery.matches || isExorcised();
}

// ── Effects toggle ─────────────────────────────────────────────────────────

function applyEffectsState(enabled) {
  body.classList.toggle('effects-enabled', enabled && !motionQuery.matches);
  if (exBtn) {
    exBtn.textContent = enabled ? 'EXORCISE' : 'RESTORE';
    exBtn.setAttribute('aria-pressed', String(!enabled));
  }
}

function loadEffectsPreference() {
  try {
    const stored = localStorage.getItem(EXORCISE_KEY);
    // Default: effects ON (i.e. not exorcised), unless stored as 'off' or reduced-motion.
    return stored !== 'off';
  } catch {
    return true;
  }
}

function saveEffectsPreference(enabled) {
  try {
    localStorage.setItem(EXORCISE_KEY, enabled ? 'on' : 'off');
  } catch { /* ignore */ }
}

/**
 * Toggle CRT effects.  Called by btn-exorcise and keyboard shortcut X.
 */
export function toggleExorcise() {
  const current = body.classList.contains('effects-enabled');
  const next    = !current;
  applyEffectsState(next);
  saveEffectsPreference(next);
}

// ── Initialise ────────────────────────────────────────────────────────────

// Apply persisted preference on load.
applyEffectsState(loadEffectsPreference());

// If the OS reduced-motion preference changes, re-evaluate.
motionQuery.addEventListener('change', () => {
  // Re-apply current toggle state, but motionQuery may override.
  const current = !body.classList.contains('effects-enabled');
  applyEffectsState(!current);
});

if (exBtn) {
  exBtn.addEventListener('click', toggleExorcise);
}

// ── Aria-live mirror ───────────────────────────────────────────────────────

/**
 * Update the off-screen aria-live region with the plain-text content of a page.
 * Mosaic block characters (U+1FB00–U+1FB3B, U+2588) are replaced with spaces.
 *
 * @param {import('../teletext/grid.js').Page} page
 */
export function updateMirror(page) {
  if (!mirror || !page) return;

  const lines = [];
  for (let r = 0; r < 24; r++) {
    const row = page.rows[r];
    if (!row) { lines.push(''); continue; }
    const text = row.map(cell => {
      const cp = cell.ch.codePointAt(0) ?? 32;
      // Strip mosaic sextant chars + full block.
      if ((cp >= 0x1FB00 && cp <= 0x1FB3B) || cp === 0x2588) return ' ';
      return cell.ch;
    }).join('').trimEnd();
    lines.push(text);
  }

  mirror.textContent = lines.join('\n');
}
