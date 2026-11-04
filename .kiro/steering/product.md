---
inclusion: always
---
# Product: GHOSTFAX — Teletext, risen from the grave

Ghostfax resurrects Teletext / Ceefax (UK TV text service, 1974–2012) as a modern, installable web app.

## Who it is for
- People who want a calm, ad-free, glanceable digest (news, weather, history, markets) without feeds, tracking or infinite scroll.
- Low-bandwidth / low-end-device users: whole app is a few hundred KB, works offline from cache.
- Keyboard, TV-remote and screen-reader users: every page is reachable by typing a 3-digit number; colour Fastext buttons give one-key navigation.
- Deaf and hard-of-hearing users: page 888 (the classic subtitles page) shows live captions from the microphone using the browser speech API.

## Non-negotiables
- Every page renders on the authentic 40 x 24 character grid (row 0 = header row). Never overflow the grid.
- Real data only from free, keyless, CORS-friendly public APIs; if a source fails, show the last cached copy with a "CACHED hh:mm" tag, never fake numbers.
- The spooky theme (CRT glow, ghost flicker, page 666) must never hurt readability; respect prefers-reduced-motion and offer a "Exorcise" toggle that turns effects off.
- Kiroween 2026 hackathon entry, category Resurrection. Solo author: Abdul AmberNeel.
