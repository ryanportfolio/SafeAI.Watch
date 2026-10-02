# Architecture

> System flow, auth strategy, state management, cross-cutting structure. Keep it terse: pointers into code, not essays.

## Output

- Static site: `astro.config.mjs` sets `output: 'static'`, `site: 'https://safeai.watch'`. No server code, no auth, no runtime data fetch.
- Pages: `src/pages/index.astro` (home), `about.astro`, `latest.astro`, `timeline.astro`, `privacy.astro`.
- Layouts: `src/layouts/BaseLayout.astro` (fonts, `src/styles/global.css`, inlined `tokens.css`, `SiteNav`, `SiteFooter`); `PageLayout.astro` wraps it for the inner pages.

## The record

- Data: `src/data/events.json`, an array of entries with exactly the keys `date`, `category`, `title`, `happened`, `evidence`, `uncertain`, `source`, `url`.
- `src/data/record.ts` validates every entry at build time and throws on a missing, empty or extra key, a malformed date, a category outside `CATEGORIES` (Research, Incidents, Warnings, Governance) or a non-https `url`. Exports `events` (oldest first), `eventsNewestFirst`, `lastUpdated` (date of the newest entry) and the date formatters.
- Consumers: `src/pages/index.astro` (`events`, `lastUpdated`), `src/pages/latest.astro` (`eventsNewestFirst`), `src/components/Timeline.astro` (used by `index.astro` and `timeline.astro`), `src/components/SiteFooter.astro` (`lastUpdated`).
- `Timeline.astro` renders every tab and panel at build time; its client script only switches the selected one.

## About film

- `src/components/FilmPlayer.astro`, mounted by `src/pages/about.astro`: a 1920x1080 canvas, transport controls, text captions for narrow players and a transcript, all built from `film/beats.json`.
- `src/scripts/film/player.js` owns the clock, controls and page lifecycle; animation frames run only while the film plays and is on screen. No audio.
- Engine `src/scripts/film/engine/`: `film.js` is `frame(t)`, a pure function of time (no frame-to-frame state, no `Math.random()`), so seeking gives the same pixels. `world.js` draws the chart, `captions.js` the text layer (strings only from `beats.json`), `camera.js`, `palette.js`, `draw.js` (canvas 2D primitives), `util.js`, `logo-g3.js` (generated mark geometry, do not edit).
- `scripts/film/lint-beats.mjs` checks `beats.json` against `film/facts.md` and `film/SCRIPT.md` before every build (`prebuild`). `scripts/film/export-video.mjs` and `check-export.mjs` export and check a video of the film; they are not part of the build.

## Homepage visuals (WebGL2)

- Mount: `src/components/VisualSlot.astro` with `name` = `hero`, `sequence`, `record`, `coverage` or `closing`, all placed in `src/pages/index.astro`. Each slot ships a build-time SVG still as the fallback.
- `src/scripts/visuals/runtime.ts` (`mountVisuals()`, called from `VisualSlot`): lazy-loads the named scene module when the slot comes within 300px of the viewport, gives it a WebGL2 canvas (DPR capped at 2), runs the loop only while on screen and the tab is visible, draws one static frame under reduced motion, and keeps the SVG still when WebGL2 is missing.
- Scenes: `hero.ts`, `sequence.ts`, `record.ts`, `coverage.ts`, `closing.ts`. Shared: `shapes.ts` (instanced line, circle and fill batcher), `backdrop.ts` (background field and grain pass for the dark scenes).
- `sequence.ts` reads reading progress from the `seq:progress` event dispatched by the inline script in `index.astro`.
- The scenes draw from seeded random geometry; none imports the record.

## Brand

- `npm run brand` runs `scripts/brand/build-brand.mjs`, which takes the mark geometry from `scripts/brand/valley.mjs` and colours from `src/styles/tokens.css`. It writes the logo SVGs to `src/assets/brand/`, the favicons, app icons, `site.webmanifest` and `og-image.png` to `public/`, and the Newsreader italic subset to `src/assets/fonts/`. Outputs are committed; the site build does not run it.
- `src/components/Mark.astro` inlines `mark-small.svg` below 48px and loads `mark.svg` at 48px and up.
