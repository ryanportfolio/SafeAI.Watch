# Tech stack

> Non-default library choices and WHY they were made, so future sessions don't "fix" deliberate picks.

## Astro, rebuilding the prototype's design in our own code

Astro: static-first, zero JS by default; WebGL visuals and the timeline load as islands only where used. Deploys to Vercel without config.

The first prototype lives outside this repo: a local "replica" that serves Antimetal's harvested Next.js build (their JS chunks, fonts, WebGL visuals, layout) with SafeAI copy swapped in by regex (`replica/safeai-transform.mjs`, `replica/build-safeai.mjs` in the Harness-Firmware checkout). It cannot ship as is: the code and assets are Antimetal's, it still carries their PostHog/GTM/Google Ads loaders, and editing means regex over minified RSC payloads.

The design is a core part of the product. The rebuild keeps its identity: colors, layout, structure, section order, typography scale, and interactions. Never swap in a new palette, grid, or template. Inside that identity, the goal is to beat the prototype everywhere: anything broken, empty, or illogical gets fixed or rethought, not reproduced.

Baseline spec, measured from the running prototype at 1440px:

- Palette: paper background `#D7D7D0` (rgb 215 215 208), ink `#1A1614` (rgb 26 22 20) for text and the primary button; hero visual accents in orange, amber, and olive.
- Type: serif headlines (h1 54px, line-height 1.1, letter-spacing about -2px), Geist body, Geist Mono uppercase eyebrow labels.
- Chrome: frosted pill nav in three groups (Latest/Timeline/About left, centered crosshair mark + SafeAI.watch, Our approach/Explore latest right); dashed outlines with corner ticks on secondary buttons and cards; small floating scroll controls bottom right.
- Homepage sections in order: hero ("Keeping watch on AI"), GZERO interview intro, "From event to evidence" scroll sequence (dark "What happened" card, then "What the evidence shows", "What remains uncertain"), timeline card ("AI risk, in context"), "Four ways to follow the record" with a dark visual panel, FAQ ("Reading with care"), "From the research log" article cards with our artwork, closing CTA ("Stay close to the evidence") over a dark WebGL scene.

## 3D visuals: our own, then /wow-loop

The prototype's WebGL visuals are Antimetal's and get replaced by our own implementations of the same kinds of scene, in the same slots and palette: the hero radial burst of colored nodes on lines, the scroll-sequence visual beside the three cards, the dark starburst panel in "Four ways", the dark band behind the homepage timeline, and the dark closing CTA scene (five slots; `VisualSlot.astro` names them hero, sequence, coverage, record, closing). Once our versions work, run `/wow-loop` on them to push them past the reference. Respect `prefers-reduced-motion`.

## Prototype flaws to fix, not copy

All fixed in the rebuild; kept so nobody reintroduces them.

Found in the 2026-09-22 review of the running prototype:

- The scroll-sequence canvas renders at 0x0, leaving an empty half-screen beside the three cards (likely the local CSP blocking the module's `blob:` workers; unconfirmed). That slot needs a visual designed from scratch.
- The standalone `/timeline` page shows the homepage section label "03 · The public record".
- `/latest` prints raw ISO dates (`2026-09-18`); the timeline uses "18 September 2026".
- The homepage uses the pill nav; subpages use a different, simpler nav.
- `/about` and `/privacy` call the site a "local prototype".
- No real wordmark; favicon and app icons are Antimetal's.

## Rules for the rebuild

- Write our own components, CSS, and WebGL/canvas visuals. Match the design by observation; never copy Antimetal's bundles, CSS, SVGs, images, favicons, or manifest.
- No "antimetal" string (any case) in site code, assets, config, or build output (`src/`, `public/`, `dist/`, `package.json`, `astro.config.*`), including class names, comments, alt text, and metadata. These reference notes may name it.
- Fonts: Geist and Geist Mono are SIL OFL (Vercel), so they can ship. The serif is Klim's Signifier; the replica holds `TestSignifier` trial files, which are not licensed for production. Decision: use an open-licensed serif close to Signifier, set through one CSS variable so a licensed Signifier can replace it later.

Reusable from the replica because SafeAI authored them: `safeai-events.json` (dated, sourced entries), `safeai-copy.json` (site copy), `safeai-art/*.png` (custom artwork), `safeai.js` (`<safeai-timeline>` web component), and the `/latest`, `/timeline`, `/about`, `/privacy` page content in `build-safeai.mjs`. `safeai-mark.svg` (crosshair mark) is ours; `safeai-wordmark.svg` is only a "Source: PBS" text placeholder.

## Fonts as shipped

- Geist, Geist Mono, Newsreader, all SIL OFL 1.1, self-hosted through `@fontsource-variable/*` (Astro bundles the woff2 into `dist/_astro/`). Licence texts and notes: `LICENSES/`.
- Serif = Newsreader (Production Type) with the `opsz` axis. Picked 2026-09-22 by rendering "Keeping watch on AI" at 54px / -2px beside the prototype: Newsreader measured 447px wide against Signifier's 443px, and its display optical size gives the same sharp, higher-contrast strokes. Rejected: Source Serif 4 (too light at display size), Crimson Pro and EB Garamond (narrower, 400px, older-style), Libre Caslon Text and Spectral (too wide, 466 to 494px).
- Swap point: `--font-serif` in `src/styles/tokens.css`. Nothing else names the serif.
- Italic: only "the evidence" in the closing heading is italic, so `npm run brand` subsets Newsreader italic (`subset-font`) to lowercase plus light punctuation at weight 400, opsz kept: 13,536 bytes instead of the 146,872-byte latin italic. Its `@font-face` is in `global.css`. Italic capitals or other glyphs fall back to Georgia; add them to `ITALIC_TEXT` in the brand script if copy needs them.
- Preloaded faces (Geist latin, Newsreader latin) have their `@font-face` rules inline in the head (`BaseLayout.astro`, `?inline` imports), not in the bundled CSS. See pitfalls "Font preload warnings on every navigation after the first".
- OFL texts ship as `/licenses/OFL-*.txt` (`src/pages/licenses/[file].txt.ts` publishes `LICENSES/`), linked from About > Typefaces.

## Contrast deviations from the prototype

Measured prototype colours that fail WCAG AA text contrast were darkened just enough to pass (2026-09-23, axe-core + pixel checks): `--ink-60` (0.6 ink, 4.13:1 on paper) became `--ink-64` (4.66:1), and `--ink-55` merged into it; `--grey-muted` #706a63 (3.69:1) became #605b55 (4.65:1); `--chart-olive` #6e7a34 (4.21:1 on cream) became #677331 (4.65:1); `--accent-dropcap` #de4e1a (2.79:1, 50px glyph) became #ce4918 (3.16:1). Do not restore the measured values.
