/**
 * src/ui/keypad.js
 * Keyboard + on-screen remote → navigation.
 * DOM-only module.
 *
 * Supported inputs:
 *   Digits 0–9           — 3-digit page entry
 *   Enter                — confirm entry
 *   Backspace / Escape   — cancel digit entry
 *   ArrowUp / PageUp     — page P+1
 *   ArrowDown / PageDown — page P-1
 *   F1–F4 / q,w,e,t      — Fastext red/green/yellow/cyan
 *   H                    — toggle Hold
 *   R                    — toggle Reveal
 *   X                    — toggle Exorcise
 *   I                    — go to Index (100)
 */

import { parsePageInput } from '../teletext/router.js';
import { showDigitEntry, animatePageRoll } from './renderer.js';
import { toggleExorcise, isAnimationSuppressed } from './accessibility.js';

// ── State ──────────────────────────────────────────────────────────────────

/** Digits being typed: '' | '1' | '12' */
let _digitBuffer = '';

/** Currently displayed page number (set externally via setCurrentPageNumber). */
let _currentPage = 100;

/** Hold state. */
let _hold = false;

/** Reveal state. */
let _reveal = false;

// ── Callbacks — wired by app.js ────────────────────────────────────────────

/** @type {(pageNumber: number) => void} */
let _onNavigate = () => {};

/** @type {(hold: boolean) => void} */
let _onHold = () => {};

/** @type {(reveal: boolean) => void} */
let _onReveal = () => {};

/** Current Fastext targets { red, green, yellow, cyan } */
let _fastext = { red: null, green: null, yellow: null, cyan: null };

// ── Public API ─────────────────────────────────────────────────────────────

export function setNavigateCallback(fn)  { _onNavigate = fn; }
export function setHoldCallback(fn)      { _onHold     = fn; }
export function setRevealCallback(fn)    { _onReveal   = fn; }

export function setCurrentPageNumber(n) { _currentPage = n; }

/**
 * Update the Fastext button labels and targets from the current page.
 * @param {import('../teletext/grid.js').Fastext} fastext
 */
export function updateFastextButtons(fastext) {
  _fastext = fastext ?? { red: null, green: null, yellow: null, cyan: null };
  const ids = { red: 'btn-red', green: 'btn-green', yellow: 'btn-yellow', cyan: 'btn-cyan' };
  for (const [colour, id] of Object.entries(ids)) {
    const btn   = document.getElementById(id);
    if (!btn) continue;
    const link  = _fastext[colour];
    if (link) {
      btn.textContent = link.label.slice(0, 9);
      btn.setAttribute('aria-label', `${link.label} — page ${link.page}`);
      btn.disabled    = false;
    } else {
      btn.textContent = '';
      btn.setAttribute('aria-label', '');
      btn.disabled    = true;
    }
  }
}

/**
 * Update the subpage indicator in the header area (P+/P-).
 * @param {number} subpage
 * @param {number} total
 */
export function updateSubpageIndicator(subpage, total) {
  let el = document.getElementById('subpage-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'subpage-indicator';
    document.getElementById('ctrl-bar')?.prepend(el);
  }
  if (total > 1) {
    el.textContent  = `${subpage}/${total}`;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }

  // Hold indicator.
  const holdBtn = document.getElementById('btn-hold');
  if (holdBtn) {
    holdBtn.classList.toggle('active', _hold);
    holdBtn.textContent = _hold ? 'RESUME' : 'HOLD';
  }
}

// ── Digit buffer logic ─────────────────────────────────────────────────────

function _addDigit(d) {
  if (_digitBuffer.length >= 3) return;
  _digitBuffer += d;
  showDigitEntry(_digitBuffer, _currentPage);

  if (_digitBuffer.length === 3) {
    const target = parsePageInput(_digitBuffer);
    _digitBuffer = '';
    if (target !== null) {
      _triggerNavigation(target);
    } else {
      // Invalid (e.g. starts with 9) — silently reset.
      showDigitEntry('', _currentPage);
    }
  }
}

function _cancelDigits() {
  _digitBuffer = '';
  showDigitEntry('', _currentPage);
}

function _triggerNavigation(target) {
  const from = _currentPage;
  animatePageRoll(from, target, () => {
    _onNavigate(target);
  }, isAnimationSuppressed());
}

// ── Hold / Reveal ──────────────────────────────────────────────────────────

function _toggleHold() {
  _hold = !_hold;
  _onHold(_hold);
  updateSubpageIndicator(0, 0); // refresh indicator
}

function _toggleReveal() {
  _reveal = !_reveal;
  _onReveal(_reveal);
  const revBtn = document.getElementById('btn-reveal');
  if (revBtn) {
    revBtn.classList.toggle('active', _reveal);
    revBtn.textContent = _reveal ? 'CONCEAL' : 'REVEAL';
  }
}

function _navFastext(colour) {
  const link = _fastext[colour];
  if (link) _triggerNavigation(link.page);
}

// ── Keyboard handler ───────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  // Don't intercept if focus is in an input element (city dialog etc.)
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const key = e.key;

  // Digits.
  if (/^[0-9]$/.test(key)) {
    e.preventDefault();
    _addDigit(key);
    return;
  }

  switch (key) {
    case 'Enter':
      e.preventDefault();
      if (_digitBuffer.length > 0) {
        // Pad to 3 digits if < 3.
        const padded = _digitBuffer.padEnd(3, '0');
        _digitBuffer = '';
        const target = parsePageInput(padded);
        if (target !== null) _triggerNavigation(target);
        else showDigitEntry('', _currentPage);
      }
      break;

    case 'Backspace':
    case 'Escape':
      e.preventDefault();
      _cancelDigits();
      break;

    case 'ArrowUp':
    case 'PageUp': {
      e.preventDefault();
      const next = Math.min(_currentPage + 1, 899);
      _triggerNavigation(next);
      break;
    }

    case 'ArrowDown':
    case 'PageDown': {
      e.preventDefault();
      const prev = Math.max(_currentPage - 1, 100);
      _triggerNavigation(prev);
      break;
    }

    case 'F1': e.preventDefault(); _navFastext('red');    break;
    case 'F2': e.preventDefault(); _navFastext('green');  break;
    case 'F3': e.preventDefault(); _navFastext('yellow'); break;
    case 'F4': e.preventDefault(); _navFastext('cyan');   break;

    // Lowercase letter shortcuts.
    case 'q': _navFastext('red');    break;
    case 'w': _navFastext('green');  break;
    case 'e': _navFastext('yellow'); break;
    case 't': _navFastext('cyan');   break;

    case 'h': case 'H': _toggleHold();    break;
    case 'r': case 'R': _toggleReveal();  break;
    case 'x': case 'X': toggleExorcise(); break;
    case 'i': case 'I':
      e.preventDefault();
      _triggerNavigation(100);
      break;
  }
});

// ── On-screen remote buttons ───────────────────────────────────────────────

// Digit buttons.
document.querySelectorAll('.num-btn[data-digit]').forEach(btn => {
  btn.addEventListener('click', () => _addDigit(btn.dataset.digit));
});

document.getElementById('btn-backspace')?.addEventListener('click', _cancelDigits);
document.getElementById('btn-enter')?.addEventListener('click', () => {
  if (_digitBuffer.length > 0) {
    const padded = _digitBuffer.padEnd(3, '0');
    _digitBuffer = '';
    const target = parsePageInput(padded);
    if (target !== null) _triggerNavigation(target);
    else showDigitEntry('', _currentPage);
  }
});

// P+ / P-.
document.getElementById('btn-pplus')?.addEventListener('click', () => {
  _triggerNavigation(Math.min(_currentPage + 1, 899));
});
document.getElementById('btn-pminus')?.addEventListener('click', () => {
  _triggerNavigation(Math.max(_currentPage - 1, 100));
});

// Fastext.
document.getElementById('btn-red')?.addEventListener('click',    () => _navFastext('red'));
document.getElementById('btn-green')?.addEventListener('click',  () => _navFastext('green'));
document.getElementById('btn-yellow')?.addEventListener('click', () => _navFastext('yellow'));
document.getElementById('btn-cyan')?.addEventListener('click',   () => _navFastext('cyan'));

// Control buttons.
document.getElementById('btn-hold')?.addEventListener('click',    _toggleHold);
document.getElementById('btn-reveal')?.addEventListener('click',  _toggleReveal);
document.getElementById('btn-index')?.addEventListener('click',   () => _triggerNavigation(100));
// Exorcise is wired in accessibility.js.

/**
 * Reset reveal state (called on page navigation).
 */
export function resetReveal() {
  if (_reveal) {
    _reveal = false;
    _onReveal(false);
    const revBtn = document.getElementById('btn-reveal');
    if (revBtn) {
      revBtn.classList.remove('active');
      revBtn.textContent = 'REVEAL';
    }
  }
}
