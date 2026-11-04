/**
 * src/teletext/router.js
 * Pure routing logic — page-number parsing, registry, and navigation.
 *
 * The carousel timer and DOM custom events fire only when running in
 * a browser context (typeof window !== 'undefined'), so this module
 * remains importable in Node for tests.
 */

// ── Page registry ──────────────────────────────────────────────────────────
// Populated lazily by registerPage() calls from each page builder module.
// Maps page number (integer) → async builder function: (data?) => Page[]
/** @type {Map<number, (data?: any) => Promise<import('./grid.js').Page[]>>} */
const PAGE_REGISTRY = new Map();

/**
 * Register a page builder.
 *
 * @param {number}   pageNumber   100–899
 * @param {Function} builder      async (data?) => Page[]
 */
export function registerPage(pageNumber, builder) {
  PAGE_REGISTRY.set(pageNumber, builder);
}

/**
 * Return a snapshot of the current registry (for grid-lint and tests).
 * @returns {Map<number, Function>}
 */
export function getRegistry() {
  return PAGE_REGISTRY;
}

// ── Page-number parsing ────────────────────────────────────────────────────

/**
 * Parse a 3-character digit string into a valid page number.
 *
 * Rules:
 *  - Must be exactly 3 characters, all digits.
 *  - Leading digit must be 1–8 (result in range 100–899).
 *
 * @param {string} digits
 * @returns {number|null}  The page number, or null if invalid.
 */
export function parsePageInput(digits) {
  if (typeof digits !== 'string' || digits.length !== 3) return null;
  if (!/^\d{3}$/.test(digits)) return null;
  const n = parseInt(digits, 10);
  if (n < 100 || n > 899) return null;
  return n;
}

// ── Subpage carousel ───────────────────────────────────────────────────────

const CAROUSEL_INTERVAL_MS = 8_000;

/** @type {ReturnType<typeof setTimeout>|null} */
let _carouselTimer = null;

function clearCarousel() {
  if (_carouselTimer !== null) {
    clearInterval(_carouselTimer);
    _carouselTimer = null;
  }
}

// ── Navigation state ───────────────────────────────────────────────────────

/** @type {{ pages: import('./grid.js').Page[], subpageIndex: number }|null} */
let _currentState = null;

function _firePageChange(page, subpage) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pagechange', {
    detail: { page, subpage },
  }));
}

/**
 * Navigate to a page number.
 *
 * Looks up the builder in the registry, calls it with the optional data
 * store, stores the resulting Page array, starts the subpage carousel timer,
 * and fires a `pagechange` CustomEvent on window.
 *
 * @param {number}  pageNumber
 * @param {any}     [store]       Optional data passed to the builder.
 * @returns {Promise<void>}
 */
export async function navigate(pageNumber, store) {
  clearCarousel();

  const builder = PAGE_REGISTRY.get(pageNumber);
  if (!builder) {
    // Unregistered page — fire a not-found event.
    _firePageChange(null, 1);
    return;
  }

  const pages = await builder(store);
  _currentState = { pages, subpageIndex: 0 };

  _firePageChange(pages[0], 1);

  if (pages.length > 1) {
    _carouselTimer = setInterval(() => {
      if (!_currentState) return;
      _currentState.subpageIndex =
        (_currentState.subpageIndex + 1) % _currentState.pages.length;
      const sp = _currentState.subpageIndex;
      _firePageChange(_currentState.pages[sp], sp + 1);
    }, CAROUSEL_INTERVAL_MS);
  }
}

/**
 * Hold or resume the subpage carousel.
 * @param {boolean} hold  true = freeze, false = resume
 */
export function setHold(hold) {
  if (hold) {
    clearCarousel();
  } else if (_currentState && _currentState.pages.length > 1) {
    // Resume from current position.
    _carouselTimer = setInterval(() => {
      if (!_currentState) return;
      _currentState.subpageIndex =
        (_currentState.subpageIndex + 1) % _currentState.pages.length;
      const sp = _currentState.subpageIndex;
      _firePageChange(_currentState.pages[sp], sp + 1);
    }, CAROUSEL_INTERVAL_MS);
  }
}

/**
 * Return the currently displayed page, or null.
 * @returns {import('./grid.js').Page|null}
 */
export function currentPage() {
  if (!_currentState) return null;
  return _currentState.pages[_currentState.subpageIndex] ?? null;
}
