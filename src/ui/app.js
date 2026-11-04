/**
 * src/ui/app.js
 * Single entry module: wires the page registry, data sources, renderer,
 * keypad/remote, clock, speech captions, writer editor and accessibility.
 * DOM-only.
 */

// Page builders self-register on import.
import '../pages/index.js';
import '../pages/news.js';
import '../pages/tech.js';
import '../pages/weather.js';
import '../pages/history.js';
import '../pages/markets.js';
import '../pages/ghost.js';
import '../pages/writer.js';
import '../pages/subtitles.js';
import '../pages/help.js';

import { getRegistry } from '../teletext/router.js';
import { buildHeaderRow } from '../teletext/grid.js';
import { getInTheNews, getOnThisDay } from '../data/wikimedia.js';
import { getTopStories } from '../data/hackernews.js';
import { getForecast, searchCity } from '../data/weather.js';
import { getMarkets } from '../data/markets.js';
import { decodeShare } from '../pages/writer.js';

import { renderPage, setReveal } from './renderer.js';
import { startClock } from './clock.js';
import {
  setNavigateCallback, setHoldCallback, setRevealCallback,
  setCurrentPageNumber, updateFastextButtons, updateSubpageIndicator, resetReveal,
} from './keypad.js';
import { updateMirror, isAnimationSuppressed } from './accessibility.js';
import { isSpeechSupported, startSpeech, stopSpeech, isSpeechActive } from './speech.js';
import { initWriter, writerCells, setWriterCells, writerActive } from './writer-editor.js';
import { openCityDialog } from './weather-dialog.js';

const REFRESH_MS  = 10 * 60 * 1000;
const CAROUSEL_MS = 8000;
const CITY_KEY    = 'gfx:city';

// ── Data store (page number → data object) ────────────────────────────────
const loading = { items: [], coins: [], stale: false, cacheTs: null, loading: true };
const store = {
  news: loading, otd: loading, tech: loading, markets: loading,
  weather: { city: '', current: null, hourly: [], daily: [], stale: false, cacheTs: null, loading: true },
};
const captions = { lines: [] };

function dataFor(n) {
  if (n >= 101 && n <= 104) return store.news;
  if (n >= 110 && n <= 114) return store.tech;
  if (n === 300) return store.weather;
  if (n === 400) return store.otd;
  if (n === 500) return store.markets;
  return null;
}

// ── View state ────────────────────────────────────────────────────────────
let current = { number: 100, pages: [], index: 0 };
let hold = false;
let carousel = null;

function ctxFor(n) {
  return {
    now: new Date(),
    effects: !isAnimationSuppressed(),
    captions: captions.lines,
    speechSupported: isSpeechSupported(),
    speechActive: isSpeechActive(),
    cells: n === 700 ? writerCells() : undefined,
  };
}

async function buildPages(n) {
  const builder = getRegistry().get(n);
  if (!builder) return null;
  const pages = await builder(dataFor(n), ctxFor(n));
  return Array.isArray(pages) ? pages : [pages];
}

function show(page) {
  // Fresh header row (clock) on every paint.
  page.rows[0] = buildHeaderRow(page.number, new Date());
  renderPage(page);
  updateMirror(page);
  updateFastextButtons(page.fastext);
  updateSubpageIndicator(page.subpage ?? current.index + 1, current.pages.length);
}

function startCarousel() {
  clearInterval(carousel);
  if (hold || current.pages.length < 2) return;
  carousel = setInterval(() => {
    current.index = (current.index + 1) % current.pages.length;
    show(current.pages[current.index]);
  }, CAROUSEL_MS);
}

async function goTo(n, { keepIndex = false } = {}) {
  const leaving = current.number;
  let pages = await buildPages(n);
  if (!pages) pages = await notFound(n);
  if (leaving === 888 && n !== 888 && isSpeechActive()) stopSpeech();
  if (!keepIndex) { resetReveal(); setReveal(false); }
  const index = keepIndex ? Math.min(current.index, pages.length - 1) : 0;
  current = { number: n, pages, index };
  setCurrentPageNumber(n);
  document.body.dataset.page = String(n);
  if (!keepIndex) history.replaceState(null, '', n === 100 ? location.pathname : `#p=${n}`);
  show(pages[index]);
  startCarousel();
  syncPageButtons();
}

async function notFound(n) {
  // Unregistered page numbers show the classic "searching" header over the index.
  const pages = await buildPages(100);
  return pages.map((p) => ({ ...p, number: n }));
}

function refreshCurrent() {
  return goTo(current.number, { keepIndex: true });
}

function syncPageButtons() {
  const speechBtn = document.getElementById('btn-speech');
  const shareBtn  = document.getElementById('btn-share');
  if (speechBtn) {
    speechBtn.hidden = current.number !== 888;
    speechBtn.textContent = isSpeechActive() ? 'STOP SUBS' : 'START SUBS';
    speechBtn.disabled = !isSpeechSupported();
  }
  if (shareBtn) shareBtn.hidden = current.number !== 700;
  document.getElementById('btn-city')?.toggleAttribute('hidden', current.number !== 300);
  document.getElementById('btn-here')?.toggleAttribute('hidden', current.number !== 300);
}

// ── Data loading ──────────────────────────────────────────────────────────
function savedCity() {
  try { return JSON.parse(localStorage.getItem(CITY_KEY)); } catch { return null; }
}
let city = savedCity() ?? { name: 'Hyderabad, India', lat: 17.385, lon: 78.4867 };

async function loadWeather() {
  store.weather = await getForecast(city.lat, city.lon, city.name);
  if (current.number === 300) refreshCurrent();
}

const PAGES_FOR = { news: [101, 102, 103, 104], otd: [400], tech: [110, 111, 112, 113, 114], markets: [500] };

async function loadAll() {
  const jobs = [
    ['news', () => getInTheNews()],
    ['otd', () => getOnThisDay()],
    ['tech', () => getTopStories()],
    ['markets', () => getMarkets()],
  ];
  await Promise.allSettled([
    ...jobs.map(async ([key, fn]) => {
      try { store[key] = await fn(); } catch { store[key] = { items: [], coins: [], stale: true, cacheTs: null }; }
      if (PAGES_FOR[key].includes(current.number)) refreshCurrent();
    }),
    loadWeather().catch(() => {}),
  ]);
}

// ── Wiring ────────────────────────────────────────────────────────────────
setNavigateCallback((n) => goTo(n));
setHoldCallback((h) => { hold = h; startCarousel(); });
setRevealCallback((r) => setReveal(r));

document.getElementById('btn-speech')?.addEventListener('click', () => {
  if (isSpeechActive()) stopSpeech();
  else startSpeech((lines) => { captions.lines = lines; if (current.number === 888) refreshCurrent(); });
  syncPageButtons();
  refreshCurrent();
});

document.getElementById('btn-city')?.addEventListener('click', () => {
  openCityDialog(searchCity, async (picked) => {
    city = picked;
    try { localStorage.setItem(CITY_KEY, JSON.stringify(city)); } catch { /* ignore */ }
    await loadWeather();
  });
});

document.getElementById('btn-here')?.addEventListener('click', () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    city = { name: 'YOUR LOCATION', lat: pos.coords.latitude, lon: pos.coords.longitude };
    await loadWeather();
  }, () => {}, { timeout: 8000 });
});

initWriter({
  isActive: () => current.number === 700,
  onChange: () => { if (current.number === 700) refreshCurrent(); },
});

// ── Boot ──────────────────────────────────────────────────────────────────
function initialPage() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has('w')) {
    const cells = decodeShare(h.get('w'));
    if (cells) { setWriterCells(cells); return 700; }
  }
  const p = Number(h.get('p'));
  return p >= 100 && p <= 899 ? p : 100;
}

window.addEventListener('hashchange', () => {
  const p = Number(new URLSearchParams(location.hash.slice(1)).get('p'));
  if (p >= 100 && p <= 899 && p !== current.number) goTo(p);
});

goTo(initialPage());
startClock();
loadAll();
setInterval(loadAll, REFRESH_MS);
// Keep the haunted page's countdown honest.
setInterval(() => { if (current.number === 666 && !writerActive()) refreshCurrent(); }, 60_000);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
