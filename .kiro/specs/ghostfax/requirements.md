# Requirements — GHOSTFAX

## REQ-1 Grid Rendering

**R1.1** WHEN the app renders any page, THE SYSTEM SHALL display a 40-column × 24-row character grid with no cell overflowing its bounds.

**R1.2** WHEN a page is rendered, THE SYSTEM SHALL display row 0 as the header row, formatted exactly as `P{page} GHOSTFAX {Day} {DD} {Mon} {HH:MM:SS}`, padded/trimmed to exactly 40 characters.

**R1.3** WHILE a page is displayed, THE SYSTEM SHALL update the `HH:MM:SS` clock in row 0 every second without re-rendering the page body.

**R1.4** WHEN rendering a cell, THE SYSTEM SHALL apply only the 8 permitted colours (black, red, green, yellow, blue, magenta, cyan, white) for `fg` and `bg`; no gradients or arbitrary hex values shall appear inside the grid.

**R1.5** WHEN a cell has `dh = true`, THE SYSTEM SHALL render that cell at double height, consuming the same row slot visually as two rows but occupying only one data row.

**R1.6** WHEN a cell has `flash = true` and the user has not activated the Exorcise toggle and `prefers-reduced-motion` is not set, THE SYSTEM SHALL flash the cell at approximately 1 Hz.

**R1.7** WHEN a cell has `conceal = true` and Reveal has not been activated, THE SYSTEM SHALL render the cell character as a space (invisible), with `fg` matching `bg`.

## REQ-2 Page Navigation

**R2.1** WHEN the user types three digits on the keypad or keyboard, THE SYSTEM SHALL accept only digits 1–8 as the leading digit (pages 100–899) and 0–9 for the remaining two, rejecting incomplete or out-of-range sequences.

**R2.2** WHILE the user is entering a page number, THE SYSTEM SHALL display a rolling counter on row 0 in the style of classic Ceefax (cycling through all pages between current and target) before settling on the target page.

**R2.3** WHEN the target page is not yet loaded, THE SYSTEM SHALL show a "PLEASE WAIT" interim page with the rolling counter animation running until data is available.

**R2.4** WHEN the user presses Backspace during digit entry, THE SYSTEM SHALL cancel the entry and return to the current page.

## REQ-3 Fastext Buttons

**R3.1** WHEN row 23 is rendered, THE SYSTEM SHALL display four labelled Fastext links: red, green, yellow, cyan, each with a label of at most 9 characters, linking to the page numbers declared by the active page.

**R3.2** WHEN the user activates a Fastext button (click, Enter, or F1–F4 shortcut), THE SYSTEM SHALL navigate to the linked page as if the user had typed that page number.

**R3.3** WHEN a Fastext target is undefined for an active page, THE SYSTEM SHALL render that button as blank (space-filled) with no action.

## REQ-4 Subpage Carousels

**R4.1** WHEN a page has more than one subpage, THE SYSTEM SHALL display a `{n}/{total}` indicator (e.g. `1/4`) in the header area.

**R4.2** WHILE displaying a multi-subpage sequence, THE SYSTEM SHALL auto-advance to the next subpage every 8 seconds unless the user has activated Hold.

**R4.3** WHEN the user presses Hold, THE SYSTEM SHALL freeze the current subpage and display a "HOLD" indicator; pressing Hold again shall resume auto-rotation.

## REQ-5 Reveal Button

**R5.1** WHEN the user activates Reveal, THE SYSTEM SHALL un-conceal all cells with `conceal = true` on the current page, showing their true `ch` and `fg`.

**R5.2** WHEN the user navigates away and returns, THE SYSTEM SHALL reset Reveal to the concealed state.

## REQ-6 Page 100 — Index

**R6.1** WHEN the user navigates to page 100, THE SYSTEM SHALL display a directory listing all available section pages (101, 110, 300, 400, 500, 666, 700, 888, 199) with section titles, formatted in the 40×24 grid.

**R6.2** WHEN page 100 is rendered, THE SYSTEM SHALL set Fastext links to 101 (NEWS), 110 (TECH), 300 (WEATHER), 400 (HISTORY).

## REQ-7 Pages 101–104 — In the News

**R7.1** WHEN the user navigates to pages 101–104, THE SYSTEM SHALL fetch the Wikimedia featured feed (`/feed/v1/wikipedia/en/featured/YYYY/MM/DD`) and display the "In the news" items across up to 4 subpages, each headline and summary wrapped at 38 characters.

**R7.2** IF the Wikimedia feed request fails or times out, THE SYSTEM SHALL display the last cached copy and show a `CACHED HH:MM` tag on row 1; if no cache exists, display an error message.

**R7.3** WHEN page 101 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 110 (TECH), 400 (HISTORY), 500 (MARKETS).

## REQ-8 Pages 110–114 — Tech (Hacker News)

**R8.1** WHEN the user navigates to pages 110–114, THE SYSTEM SHALL fetch the HN top-stories list and the top 20 story items, displaying titles and scores across up to 5 subpages, each line wrapped at 38 characters.

**R8.2** IF any HN fetch fails, THE SYSTEM SHALL fall back to the localStorage cache and display `CACHED HH:MM`; if no cache exists, display an error message.

**R8.3** WHEN page 110 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 101 (NEWS), 300 (WEATHER), 500 (MARKETS).

## REQ-9 Page 300 — Weather

**R9.1** WHEN the user navigates to page 300, THE SYSTEM SHALL display current conditions and a 5-day forecast for the user's selected city, fetched from Open-Meteo.

**R9.2** WHEN no city is stored, THE SYSTEM SHALL attempt browser geolocation; if geolocation is denied, THE SYSTEM SHALL prompt the user to type a city name, resolved via the Open-Meteo geocoding API.

**R9.3** WHEN rendering the forecast, THE SYSTEM SHALL draw a mosaic temperature bar chart using sextant characters (U+1FB00–U+1FB3B) showing daily high/low across columns.

**R9.4** IF Open-Meteo requests fail, THE SYSTEM SHALL fall back to cached data and display `CACHED HH:MM`.

**R9.5** WHEN page 300 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 101 (NEWS), 110 (TECH), 400 (HISTORY).

## REQ-10 Page 400 — On This Day

**R10.1** WHEN the user navigates to page 400, THE SYSTEM SHALL fetch the Wikimedia featured feed and display the "On this day" events for today's date, wrapped at 38 characters, paginated into subpages if needed.

**R10.2** IF the feed fails, THE SYSTEM SHALL apply the standard cached/offline fallback with `CACHED HH:MM`.

**R10.3** WHEN page 400 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 101 (NEWS), 500 (MARKETS), 666 (GHOST).

## REQ-11 Page 500 — Markets

**R11.1** WHEN the user navigates to page 500, THE SYSTEM SHALL fetch BTC, ETH, and SOL prices in USD and INR from the CoinGecko simple-price endpoint and display them in a tabular layout.

**R11.2** WHEN displaying prices, THE SYSTEM SHALL show the 24-hour percentage change alongside each price, coloured green for positive and red for negative.

**R11.3** IF CoinGecko returns an error or times out, THE SYSTEM SHALL display cached prices with `CACHED HH:MM`.

**R11.4** WHEN page 500 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 101 (NEWS), 110 (TECH), 300 (WEATHER).

## REQ-12 Page 666 — Ghost of Ceefax

**R12.1** WHEN the user navigates to page 666, THE SYSTEM SHALL display a mosaic ghost figure rendered in sextant cells, together with flavour text in Ceefax tone ("RISEN FROM THE GRAVE").

**R12.2** WHEN page 666 is displayed, THE SYSTEM SHALL show a live countdown (days, hours, minutes, seconds) to the next Halloween (31 Oct), updated every second.

**R12.3** WHEN `prefers-reduced-motion` is not set and Exorcise is off, THE SYSTEM SHALL apply a flicker/flash animation to selected cells on page 666.

**R12.4** WHEN page 666 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 700 (GHOST WRITER), 888 (SUBTITLES), 199 (HELP).

## REQ-13 Page 700 — Ghost Writer

**R13.1** WHEN the user navigates to page 700, THE SYSTEM SHALL display an editable 40×22 text canvas (rows 1–22) where the user can type characters and select foreground/background colours from the 8-colour palette.

**R13.2** WHEN the user activates "Share", THE SYSTEM SHALL encode the page state (characters + colours) into the URL hash and update `location.hash` without navigation, so the URL can be copied and shared.

**R13.3** WHEN the app loads with a non-empty hash that decodes to a valid page-700 state, THE SYSTEM SHALL restore and display that state automatically.

**R13.4** WHEN page 700 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 666 (GHOST), 888 (SUBTITLES), 199 (HELP).

## REQ-14 Page 888 — Live Subtitles

**R14.1** WHEN the user navigates to page 888, THE SYSTEM SHALL request microphone access via the Web Speech API and display recognised speech as rolling captions, word-wrapped to 38 characters, on rows 18–22.

**R14.2** WHEN the browser does not support the Web Speech API or microphone permission is denied, THE SYSTEM SHALL display a clear fallback message explaining the limitation without crashing.

**R14.3** WHEN the user navigates away from page 888, THE SYSTEM SHALL stop the speech recognition session immediately.

**R14.4** WHEN page 888 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 666 (GHOST), 700 (GHOST WRITER), 199 (HELP).

## REQ-15 Page 199 — Help

**R15.1** WHEN the user navigates to page 199, THE SYSTEM SHALL display keyboard shortcuts, button labels, and a brief description of all pages, paginated into subpages if needed.

**R15.2** WHEN page 199 is rendered, THE SYSTEM SHALL set Fastext links to 100 (INDEX), 101 (NEWS), 300 (WEATHER), 666 (GHOST).

## REQ-16 Caching and Offline

**R16.1** WHEN any fetcher call succeeds, THE SYSTEM SHALL store the response in localStorage with a timestamp key.

**R16.2** WHEN a fetcher call fails (network error or timeout > 5 s), THE SYSTEM SHALL return the cached entry if one exists and mark the data source as stale; the rendered page SHALL display `CACHED HH:MM` on row 1.

**R16.3** IF no cached entry exists and the network is unavailable, THE SYSTEM SHALL display a "NO SIGNAL" placeholder page.

**R16.4** WHEN the service worker is installed, THE SYSTEM SHALL cache the app shell (HTML, CSS, JS, font) so the app loads on subsequent visits with no network.

## REQ-17 Accessibility

**R17.1** WHEN any page is rendered, THE SYSTEM SHALL maintain an off-screen `aria-live="polite"` region containing the plain-text content of the page (without mosaic characters), updated on each page change.

**R17.2** WHEN the user operates the keypad by keyboard, THE SYSTEM SHALL support numeric keys 0–9 for digit entry, Enter to confirm, Backspace to cancel, F1–F4 for Fastext, H for Hold, and R for Reveal.

**R17.3** WHEN `prefers-reduced-motion: reduce` is detected, THE SYSTEM SHALL disable all flashing and animation effects regardless of the Exorcise toggle state.

**R17.4** WHEN the user activates the Exorcise toggle, THE SYSTEM SHALL disable all CRT glow, ghost flicker, and flash effects for the session and persist the preference to localStorage.

**R17.5** WHEN rendered, the grid element THE SYSTEM SHALL carry `role="document"` and each Fastext button SHALL carry an accessible label matching its text plus target page number.

## REQ-18 PWA

**R18.1** WHEN the app is served over HTTPS, THE SYSTEM SHALL provide a Web App Manifest (`manifest.json`) with name, short name, icons (192 px and 512 px), theme colour, and `display: standalone`.

**R18.2** WHEN the service worker is registered, THE SYSTEM SHALL use a cache-first strategy for app-shell assets and a network-first strategy (with cache fallback) for API responses.

**R18.3** WHEN the service worker receives a `fetch` event for an API URL that fails, THE SYSTEM SHALL return the cached response if available, otherwise return a synthetic offline JSON response.
