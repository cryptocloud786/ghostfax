---
inclusion: always
---
# Repo structure

```
index.html            app shell (TV + remote)
styles/ghostfax.css   CRT + teletext styling
src/teletext/         pure: grid.js, wrap.js, mosaic.js, pages registry
src/pages/            pure page builders: (data) => Page (40x24 cells)
src/data/             fetcher.js + one module per source
src/ui/               DOM renderer, keypad/remote, speech captions
tests/                node:test unit + fast-check property tests
.kiro/                specs, steering, hooks, agents (keep committed!)
```
Never add `.kiro/` to .gitignore.
