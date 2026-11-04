# Design — GHOSTFAX

## 1. Architecture Overview

GHOSTFAX is a zero-build PWA: plain HTML + CSS + native ES modules, served as-is by GitHub Pages. All pure logic is side-effect-free and runs in both Node (for tests) and the browser. DOM code is isolated to `src/ui/`.

```
index.html
styles/ghostfax.css
src/
  teletext/       pure: grid, wrap, mosaic, router
  pages/          pure page builders: (data) => Page
  data/           fetcher + one module per source
  ui/             DOM renderer, keypad, remote, speech
assets/fonts/     Bedstead (self-hosted, public domain)
tests/            node:test unit + fast-check property tests
service-worker.js PWA cache-first shell + network-first API
manifest.json     PWA manifest
```

## 2. Module List

| Path | Role |
|------|------|
| `src/teletext/grid.js` | Allocate a blank `Page` (24 rows × 40 cells); write cells; build header row |
| `src/teletext/wrap.js` | Word-wrap a string to lines of at most N chars |
| `src/teletext/mosaic.js` | Encode/decode 2×3 sextant bitmaps → Unicode U+1FB00–U+1FB3B |
| `src/teletext/router.js` | Parse 3-digit page input; map number → page-builder; manage subpage state |
| `src/pages/index.js` | Page 100 — directory index |
| `src/pages/news.js` | Pages 101–104 — In the News (Wikimedia) |
| `src/pages/tech.js` | Pages 110–114 — Hacker News top stories |
| `src/pages/weather.js` | Page 300 — Open-Meteo forecast + mosaic chart |
| `src/pages/history.js` | Page 400 — On This Day (Wikimedia) |
| `src/pages/markets.js` | Page 500 — CoinGecko BTC/ETH/SOL |
| `src/pages/ghost.js` | Page 666 — Ghost of Ceefax, mosaic art, Halloween countdown |
| `src/pages/writer.js` | Page 700 — Ghost Writer editor + URL-hash share |
| `src/pages/subtitles.js` | Page 888 — Web Speech API captions |
| `src/pages/help.js` | Page 199 — keyboard shortcuts & directory |
| `src/data/fetcher.js` | Timeout wrapper, localStorage cache, stale/offline fallback |
| `src/data/wikimedia.js` | Wikimedia featured feed adapter |
| `src/data/hackernews.js` | HN Firebase top-stories + item adapter |
| `src/data/weather.js` | Open-Meteo forecast + geocoding adapter |
| `src/data/markets.js` | CoinGecko simple-price adapter |
| `src/ui/renderer.js` | DOM render of a `Page` onto the grid element |
| `src/ui/keypad.js` | Keyboard + on-screen remote → router events |
| `src/ui/clock.js` | 1 Hz tick → header row clock update |
| `src/ui/accessibility.js` | aria-live mirror; Exorcise toggle; reduced-motion detection |
| `src/ui/speech.js` | Web Speech API session manager for page 888 |

## 3. Data Model

### Page

```js
/**
 * @typedef {Object} Page
 * @property {number}   number      - 3-digit page number (100–899)
 * @property {number}   subpage     - 1-based index of this subpage
 * @property {number}   subpageTotal - total subpages (1 if not paginated)
 * @property {Cell[][]} rows        - 24 rows, each 40 cells (rows[row][col])
 * @property {Fastext}  fastext     - link targets for row 23 buttons
 */

/**
 * @typedef {Object} Cell
 * @property {string}  ch      - single character (default ' ')
 * @property {string}  fg      - foreground colour name (default 'white')
 * @property {string}  bg      - background colour name (default 'black')
 * @property {boolean} flash   - 1 Hz flash (default false)
 * @property {boolean} dh      - double-height row (default false)
 * @property {boolean} conceal - hidden until Reveal (default false)
 */

/**
 * @typedef {Object} Fastext
 * @property {{label:string, page:number}|null} red
 * @property {{label:string, page:number}|null} green
 * @property {{label:string, page:number}|null} yellow
 * @property {{label:string, page:number}|null} cyan
 */
```

### Colour Enum

```js
const COLOURS = ['black','red','green','yellow','blue','magenta','cyan','white'];
```

## 4. Text-Wrap Algorithm (`src/teletext/wrap.js`)

```
wrapText(text, width = 38) -> string[]
```

1. Split `text` on whitespace into `words`.
2. Maintain `currentLine = ''`.
3. For each word:
   a. If `word.length > width`, hard-break it at `width` chars.
   b. If `currentLine` is empty: set `currentLine = word`.
   c. Else if `currentLine.length + 1 + word.length <= width`: append ` ` + word.
   d. Else: push `currentLine` to output, set `currentLine = word`.
4. Push the final `currentLine`.
5. Return the array of lines.

Properties verified by fast-check:
- No output line exceeds `width` characters.
- Joining all output lines with spaces yields the original whitespace-normalised text.
- For any `word` where `word.length <= width`, the word is never split mid-word.

## 5. Mosaic Algorithm (`src/teletext/mosaic.js`)

A mosaic cell covers a 2-column × 3-row pixel block. Each of the 6 pixels (bits 0–5, left-to-right, top-to-bottom) is either set or clear.

```
encode(bits: boolean[6]) -> string   // U+1FB00..U+1FB3B or ' ' or U+2588
decode(ch: string) -> boolean[6]
```

Mapping: `codePoint = 0x1FB00 + bitfield` where `bitfield` is the 6-bit integer from `bits`.
Special cases:
- All bits clear (0b000000) → `' '` (space, U+0020)
- All bits set  (0b111111) → `'█'` (U+2588 FULL BLOCK)

The round-trip property `decode(encode(bits)) === bits` must hold for all 64 combinations.

## 6. Fetcher Cache Design (`src/data/fetcher.js`)

```
fetchWithCache(url, ttlMs = 300_000) -> Promise<{data, stale: boolean}>
```

**Happy path:** `fetch(url)` with a 5-second `AbortController` timeout. On success, write `localStorage.setItem(cacheKey, JSON.stringify({ts: Date.now(), data}))`. Return `{data, stale: false}`.

**Stale path:** On network error or timeout, read the cache entry. If it exists, return `{data: entry.data, stale: true}`.

**Offline path:** If the cache entry is missing, return `{data: null, stale: true}` (callers render "NO SIGNAL").

Cache key: `gfx:{url}`. TTL is checked on read — entries older than `ttlMs` are considered stale but still returned (network still tried first).

## 7. Page Router (`src/teletext/router.js`)

```
parsePageInput(digits: string) -> number | null
```

- Accept exactly 3 digits.
- Leading digit must be 1–8 (i.e. result in range 100–899).
- Returns the integer, or `null` if invalid.

```
navigate(pageNumber, store) -> void
```

- Looks up `PAGE_REGISTRY[pageNumber]` (a map from page number to builder function).
- Calls the builder with the data store; stores the resulting `Page[]` array.
- Starts the subpage carousel timer (8 s interval, cancels on navigation).
- Fires a `pagechange` custom event on `window` with `{detail: {page, subpage}}`.

## 8. Header Row (`src/teletext/grid.js`)

```
buildHeaderRow(pageNumber, now: Date) -> Cell[40]
```

Template: `P{pageNumber} GHOSTFAX {Day} {DD} {Mon} {HH:MM:SS}`

- `P{pageNumber}`: 4 chars (`P` + 3-digit number).
- Single space separator.
- `GHOSTFAX`: 8 chars.
- Space.
- `{Day}`: 3-char abbreviated weekday (Mon–Sun).
- Space.
- `{DD}`: zero-padded 2-digit day.
- Space.
- `{Mon}`: 3-char abbreviated month.
- Space.
- `{HH:MM:SS}`: 8 chars.
- Total: 4+1+8+1+3+1+2+1+3+1+8 = **33 chars**. Pad with trailing spaces to exactly **40**.

## 9. URL-Hash Share (Page 700)

The Ghost Writer page encodes its state as a URL hash:

```
#700/{base64url(JSON.stringify(cells))}
```

`cells` is a flat array of `{ch, fg, bg}` objects for rows 1–22 (880 cells). On load, `router.js` checks `location.hash`; if it matches `#700/...` the encoded payload is decoded and passed directly to the writer page builder.

## 10. Correctness Properties (fast-check)

All properties live in `tests/` and run with `node --test`.

| Property | Generator | Assertion |
|----------|-----------|-----------|
| **Grid dimensions** | Any page builder called with stub data | `page.rows.length === 24` and every `page.rows[r].length === 40` |
| **Wrap width** | `fc.string()` + `fc.integer({min:1,max:40})` as width | All output lines `<= width` |
| **Wrap no mid-word split** | `fc.array(fc.string({minLength:1,maxLength:38}))` joined | Each input word appears intact in output lines |
| **Wrap lossless** | Any string | Joining output with spaces equals whitespace-normalised input |
| **Mosaic round-trip** | `fc.array(fc.boolean(), {minLength:6, maxLength:6})` | `decode(encode(bits))` deep-equals `bits` |
| **Page number parsing** | `fc.integer({min:100,max:899})` | `parsePageInput(String(n)) === n` |
| **Page number rejection** | `fc.integer({min:900,max:999})` and `fc.integer({min:0,max:99})` | `parsePageInput(String(n)) === null` |
| **Header row length** | `fc.integer({min:100,max:899})` + `fc.date()` | `buildHeaderRow(n, d).length === 40` |
| **Cell colour validity** | Any page builder | Every cell `fg` and `bg` is a member of `COLOURS` |
| **Fastext label length** | Any page with fastext defined | Each non-null label `<= 9` characters |
