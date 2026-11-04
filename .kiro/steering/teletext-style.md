---
inclusion: fileMatch
fileMatchPattern: "src/**/*.js"
---
# Teletext style rules (for page builders)

- 8 colours only: black, red, green, yellow, blue, magenta, cyan, white. No gradients inside the grid.
- Row 0 header: `P{page}` left, service name `GHOSTFAX`, then `Day DD Mon` and `HH:MM:SS` right-aligned, exactly 40 chars.
- Titles use double-height rows (occupy 2 rows). Body text: white on black, wrapped at word boundaries to 38 chars (1 col margin each side).
- Fastext row (row 23): four coloured labels red/green/yellow/cyan, each max 9 chars, linking to real page numbers.
- Mosaic graphics use 2x3 sextant cells (Unicode Symbols for Legacy Computing U+1FB00–U+1FB3B, plus space and U+2588 full block).
- Copy tone: terse, BBC-Ceefax-like, upper case for headings, with a light haunted wink ("RISEN FROM THE GRAVE"), never gory.
