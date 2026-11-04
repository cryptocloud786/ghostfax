---
inclusion: always
---
# Tech steering

- Zero build step: plain HTML + CSS + native ES modules in `src/`, served as-is by GitHub Pages. No frameworks, no bundler.
- Node 22 only for tests: `node --test` with `fast-check` for property-based tests. `npm test` must pass before any commit.
- Pure logic (text wrapping, page layout, mosaic encoding, page routing, data shaping) lives in side-effect-free modules that run in both Node and the browser. DOM code only in `src/ui/`.
- Data sources (all keyless + CORS):
  - Wikipedia featured feed (In the news, On this day): `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/YYYY/MM/DD`
  - Hacker News: `https://hacker-news.firebaseio.com/v0/topstories.json`, `/item/{id}.json`
  - Open-Meteo forecast + geocoding: `https://api.open-meteo.com/v1/forecast`, `https://geocoding-api.open-meteo.com/v1/search`
  - CoinGecko simple price: `https://api.coingecko.com/api/v3/simple/price`
- Every fetch goes through `src/data/fetcher.js` (timeout, localStorage cache with timestamp, offline fallback).
- Teletext font: Bedstead (public domain) self-hosted in `assets/fonts/`; fall back to monospace.
- Accessibility: grid is `role="document"` with an off-screen plain-text mirror (`aria-live="polite"`) of each page.
