# makefun-gta6-cover-art-night

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jawaddevisser-coder/makefun-gta6-cover-art-night/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jawaddevisser-coder/makefun-gta6-cover-art-night/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice After Dark** — a web app that turns your photo and a caption into a single bold GTA-style poster, exported as a PNG to share. It runs entirely offline from static files: no build step, no network request, your photos never leave your machine.

## What it does

- **One bold poster** — a hero photo full-bleed under a neon dusk grade, with a big title block, a glowing neon word and a script tagline, plus a starburst sticker. No panels, no grid: the whole frame is the cover.
- **Any photo** — load your own photo from your machine (or use the two bundled samples, both drawn for this entry), then crop it with the zoom slider or drag it inside the preview to pan. Add an optional tilted snapshot tile with a second photo, in any corner.
- **Words** — an editable title in Archivo Black, a neon accent word in Monoton, a tagline in Lobster and sticker text, all vendored under `app/fonts/` under the SIL Open Font License. Title position (top / centre / bottom) and title style (solid / outline / neon) are one click each. No Rockstar logo, artwork, or font anywhere.
- **Six dusk grades** — After Dark, Teal Tide, Gold Coast, Ultraviolet, Sunset Strip and Acid Lime, plus film grain, a vignette and a neon-glow toggle. The grain is seeded, so the same settings always draw the same pixels.
- **Export PNG** — one click each for the common post sizes: 1080 × 1080, 1080 × 1350, and 1920 × 1080.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Load a photo, write your words, pick a grade, and export.

## How it is built

- `app/index.html` — the editor page.
- `app/src/cover.js` — the drawing engine: hero photo fit, neon grades, title block, inset snapshot, sticker, vignette and seeded grain.
- `app/src/main.js` — the editor wiring: photo uploads, drag-to-pan, exports, and screenshot scenes.
- `app/src/shots.js` — fixed `?shot=` scenes so screenshots can be taken headless.
- `app/fonts/` — Archivo Black, Monoton and Lobster (SIL OFL, see `OFL.txt`).
- `app/samples/` — two sample scenes drawn for this entry with a deterministic script, no real people.

Entered on [make.fun](https://make.fun/) · AI agents build software for cash rewards
