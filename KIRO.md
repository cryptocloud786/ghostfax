# How GHOSTFAX was built with Kiro

GHOSTFAX was built spec-first with [Kiro](https://kiro.dev), mostly through the **Kiro CLI** (`kiro-cli chat`) running the custom `ghost-builder` agent against the spec in `.kiro/`. This file documents the workflow honestly, including the parts that were not written by Kiro.

---

## 1. Spec-driven development (EARS)

The spec lives in `.kiro/specs/ghostfax/`:

- `requirements.md` — 18 requirement groups (R1–R18) written as EARS statements ("WHEN the user types three digits, THE SYSTEM SHALL navigate to that page…", "IF a data source fails, THE SYSTEM SHALL show the last cached copy marked stale…").
- `design.md` — architecture, module list, data-model typedefs, algorithms, and a **correctness-properties table**: invariants such as *every page is exactly 40×24*, *wrap never splits a word that fits on a line*, *wrap is lossless*, *mosaic encode/decode round-trips*, *page numbers 100–899 parse and 0–99/900–999 are rejected*, *the header row is always 40 characters*.
- `tasks.md` — numbered tasks in phases, each cross-referenced to requirements and ticked `- [x]` as they were completed.

The correctness properties became **fast-check property-based tests before any UI existed** (Phase 1: `tests/wrap.test.js`, `tests/grid.test.js`, `tests/mosaic.test.js`, `tests/router.test.js`). Later phases added a property for the Ghost Writer share encoding (canvas → URL hash → canvas); edge cases like the weather hourly-slice picker are covered by example tests against real API fixtures. The suite is 140 tests (`npm test`), and `scripts/grid-lint.mjs` checks every registered page builder against the 24×40 invariant.

## 2. Steering docs

`.kiro/steering/` holds four steering files loaded into every session:

- `product.md` — who it is for, non-negotiables (40×24 grid, real data only, spooky but readable), hackathon context.
- `tech.md` — no build step, Node 22 `node:test`, pure DOM-free logic, the approved keyless APIs, Bedstead font, accessibility rules.
- `structure.md` — the directory layout (`src/teletext`, `src/pages`, `src/data`, `src/ui`).
- `teletext-style.md` — scoped to `src/**/*.js`: teletext palette, row-0 header format, double-height titles, Fastext row, mosaic usage, copy tone.

## 3. Custom agent: `ghost-builder`

`.kiro/agents/ghost-builder.json` defines the agent that did the bulk of the work. It works only from `tasks.md`, must follow the steering docs, ticks tasks when done, never fakes data, and must run `npm test` and fix failures before stopping. Its resources are the steering files and the spec; its tools include file read/write, shell, and the `fetch` MCP server. Commits marked "(Kiro CLI)" in the history came from this agent, one phase per run.

## 4. Agent hooks

`.kiro/hooks/` contains four hooks:

- **Grid Guardian** (`fileEdited` on `src/pages/**`, `src/teletext/**`) — re-run grid-lint and the property tests; fix the builder, never the test.
- **Fixture Refresh (MCP fetch)** (`fileEdited` on `src/data/*.js`) — pull a fresh live sample from the API with the fetch MCP server and update `tests/fixtures/` so normalisers are tested against real response shapes.
- **Accessibility Mirror Check** (`fileEdited` on UI/CSS/HTML) — verify the aria-live text mirror, the Exorcise toggle and reduced-motion gating.
- **Spec Sync** (`agentStop`) — reconcile `tasks.md` checkboxes with what actually exists in `src/` and `tests/`.

## 5. MCP

`.kiro/settings/mcp.json` registers the `fetch` MCP server (`uvx mcp-server-fetch`). It was used to inspect live responses from Wikimedia, Hacker News, Open-Meteo, CoinGecko and Coinbase before writing the normalisers, and to capture the JSON fixtures in `tests/fixtures/`.

## 6. What was not written by Kiro

Honesty note: Kiro's free tier throttled us partway through Phase 4. While it was throttled, some UI glue was **written by hand** (commit `85bc08c`): `src/ui/app.js` (app entry and wiring), `src/ui/writer-editor.js`, `src/ui/weather-dialog.js`, the CRT TV and remote styling in `styles/ghostfax.css`, the `index.html` shell, and double-height fixes in `src/ui/renderer.js`. Everything in `src/teletext/`, `src/pages/`, `src/data/`, the other `src/ui/` modules, the tests, the PWA files and these docs came from Kiro runs, reviewed before committing.
