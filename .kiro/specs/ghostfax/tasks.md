# Tasks — GHOSTFAX

## Phase 1 — Pure Modules & Property Tests

- [x] 1. Scaffold repo: `index.html`, `styles/ghostfax.css`, `src/` tree, `tests/`, `package.json` with `"test": "node --test"`, `fast-check` dev-dependency. _(R1, structure.md)_
- [x] 2. Implement `src/teletext/grid.js`: `blankPage()`, `setCell()`, `buildHeaderRow()`. _(R1.1, R1.2, Design §3, §8)_
- [x] 3. Implement `src/teletext/wrap.js`: `wrapText(text, width)`. _(R7.1, Design §4)_
- [x] 4. Implement `src/teletext/mosaic.js`: `encode(bits)` and `decode(ch)` for U+1FB00–U+1FB3B. _(R9.3, Design §5)_
- [x] 5. Implement `src/teletext/router.js`: `parsePageInput()`, page registry map, `navigate()`, subpage carousel timer. _(R2.1, R4.2, Design §7)_
- [x] 6. Write property tests — grid dimensions (24×40 for every builder stub). _(Design §10)_
- [x] 7. Write property tests — `wrapText`: width bound, no mid-word split, lossless round-trip. _(Design §10)_
- [x] 8. Write property tests — mosaic round-trip for all 64 bit combinations. _(Design §10)_
- [x] 9. Write property tests — `parsePageInput` accepts 100–899, rejects outside that range; `buildHeaderRow` always returns 40 cells. _(Design §10)_

## Phase 2 — Data Layer

- [x] 10. Implement `src/data/fetcher.js`: 5 s `AbortController` timeout, localStorage read/write, stale flag, offline null path. _(R16.1–R16.3, Design §6)_
- [x] 11. Implement `src/data/wikimedia.js`: fetch + parse featured feed; expose `getInTheNews(date)` and `getOnThisDay(date)`. _(R7.1, R10.1)_
- [x] 12. Implement `src/data/hackernews.js`: fetch top-stories list + top-20 item details. _(R8.1)_
- [x] 13. Implement `src/data/weather.js`: geocoding search + forecast fetch; cache city preference. _(R9.1, R9.2)_
- [x] 14. Implement `src/data/markets.js`: CoinGecko simple-price for BTC/ETH/SOL in USD+INR. _(R11.1)_

## Phase 3 — Page Builders

- [x] 15. Implement `src/pages/index.js` — page 100 directory with Fastext to 101/110/300/400. _(R6)_
- [x] 16. Implement `src/pages/news.js` — pages 101–104 from Wikimedia; `CACHED HH:MM` fallback; Fastext. _(R7)_
- [x] 17. Implement `src/pages/tech.js` — pages 110–114 from HN; `CACHED HH:MM` fallback; Fastext. _(R8)_
- [x] 18. Implement `src/pages/weather.js` — page 300; mosaic temperature bar chart; geolocation + city-search fallback; Fastext. _(R9)_
- [x] 19. Implement `src/pages/history.js` — page 400 from Wikimedia On This Day; Fastext. _(R10)_
- [x] 20. Implement `src/pages/markets.js` — page 500; green/red 24 h change colours; Fastext. _(R11)_
- [x] 21. Implement `src/pages/ghost.js` — page 666; mosaic ghost art; Halloween countdown; flash cells; Fastext. _(R12)_
- [x] 22. Implement `src/pages/writer.js` — page 700; editable canvas; URL-hash encode/decode on Share. _(R13)_
- [x] 23. Implement `src/pages/subtitles.js` — page 888; Web Speech API; graceful fallback message; stop on navigate. _(R14)_
- [x] 24. Implement `src/pages/help.js` — page 199; keyboard shortcuts; page directory. _(R15)_

## Phase 4 — UI & Rendering

- [ ] 25. Implement `src/ui/renderer.js`: write a `Page` to DOM grid; apply `fg`/`bg` colours; `dh`, `flash`, `conceal` cell attributes; `role="document"` on grid. _(R1.4–R1.7, R17.5)_
- [ ] 26. Implement `src/ui/clock.js`: 1 Hz tick updating only the header row `HH:MM:SS` cells. _(R1.3)_
- [ ] 27. Implement `src/ui/keypad.js`: numeric key entry (digits 0–9), Enter, Backspace; rolling counter animation during navigation; F1–F4 for Fastext; H for Hold; R for Reveal; on-screen remote button wiring. _(R2.1–R2.4, R3.2, R4.3, R5.1, R17.2)_
- [ ] 28. Implement Fastext button rendering in `renderer.js`/`keypad.js`: four coloured labels on row 23, accessible labels including target page number. _(R3.1, R3.3, R17.5)_
- [ ] 29. Implement subpage `{n}/{total}` indicator and Hold state display. _(R4.1, R4.3)_
- [ ] 30. Implement Reveal toggle: un-conceal cells on activation; reset on page navigation. _(R5.1, R5.2)_
- [ ] 31. Implement `src/ui/speech.js`: Web Speech API session lifecycle for page 888. _(R14.1–R14.3)_
- [ ] 32. Implement `src/ui/accessibility.js`: off-screen `aria-live="polite"` mirror; Exorcise toggle (persisted to localStorage); `prefers-reduced-motion` detection disabling all animation. _(R17.1, R17.3, R17.4)_

## Phase 5 — Styling

- [ ] 33. Self-host Bedstead font in `assets/fonts/`; add `@font-face` to `styles/ghostfax.css`; fall back to monospace. _(tech.md)_
- [ ] 34. Add CRT glow and ghost-flicker CSS effects, gated on `.effects-enabled` class (removed by Exorcise toggle and `prefers-reduced-motion`). _(R1.6, R12.3, R17.3, R17.4)_

## Phase 6 — PWA & Polish

- [ ] 35. Create `manifest.json` with name, short name, icons (192 px + 512 px), theme colour, `display: standalone`. _(R18.1)_
- [ ] 36. Implement `service-worker.js`: cache-first for app-shell assets; network-first with cache fallback for API URLs; synthetic offline JSON for failed API fetches. _(R16.4, R18.2, R18.3)_
- [ ] 37. Register service worker in `index.html`; verify offline load. _(R18.2)_
- [ ] 38. Add "NO SIGNAL" placeholder page builder for the case where the fetcher returns `{data: null, stale: true}`. _(R16.3)_
- [ ] 39. Final pass: ensure `npm test` passes; verify 40×24 invariant visually; check all Fastext links resolve to real pages. _(Design §10)_
