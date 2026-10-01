# Logo lab brief

Five logo directions for SafeAI.watch, one designer each. Research: `research/godly-1.md` to `godly-6.md` (patterns and concept seeds from 304 logos on godly.design), `research/peers.md` (marks of AI safety, editorial and "watch" organizations, and the Avoid table), `research/site-look.md` (current tokens and type). Read `research/RULES.md` for the brand in one paragraph.

## What the brand needs

- Calm, precise, editorial, trustworthy. A public record, not a startup, not a security product, not an activist campaign.
- The site's stance: hold both at once. AI brings benefit and danger from the same capabilities; understand it rather than fear or dismiss it; no camps.
- Every entry links its source and separates what happened, what the evidence shows, and what remains uncertain.
- The name is "SafeAI.watch". Both parts matter; ".watch" means keeping watch.
- Works from a 16 px favicon to a large hero; in ink on warm paper `#d7d7d0` and in cream on the dark closing ground `#181a15`; in one color; beside Newsreader and Geist text.
- The owner gave creative freedom. The current crosshair mark is not the base.

## Hard rules from the research

- **Avoid** everything in the Avoid table in `research/peers.md`: eyes, pupils, irises, lens rings, magnifiers, spotlights, shields, globes, networks and node meshes, rings or broken rings, crossbar-less A or "AI" monograms, three slanted or stacked bars (reads as Epoch AI), gauges and dials, square brackets around the name, question marks, tracked caps in a colored square, bold-versus-light caps as the only device, a navy-and-white-only palette, crosshairs or targets.
- Original work only: never a copy or close variant of any logo in the research.
- Colors from the site tokens: ink `#1a1614`, paper `#d7d7d0`, cream (see site-look), orange `#ff7733`, amber `#e5a700`, olive `#a89a1a`, mark blue `#253e77`. At most one accent color in the mark.
- Type: Newsreader, Geist, Geist Mono (the site's licensed OFL fonts, in `src/assets/fonts/` or via the npm packages in `node_modules`), or custom-drawn letterforms.

## The five directions

Each designer owns one. Push it as far as it goes while staying calm; make it distinct from the other four.

| ID | Direction | Seed | Research |
|---|---|---|---|
| A | **Same shape** | A symbol made of two identical halves, rotated 180 degrees, that lock into one form (a geometric S is one option; find the best form). One half ink, one half an accent: benefit and danger from the same capability. Not a yin-yang circle, not rings. | godly-2 idea 4, godly-3 idea 4, godly-6 idea 3, peers idea 4 |
| B | **The point** | A wordmark where punctuation is the brand: the point in "SafeAI.watch" becomes the one designed element (size, shape, color and position under a precise rule), the place where you stop and look. Serif and mono pairing is one option. Must be clearly more than "a colored dot" (FAR.AI shows a dot alone is ordinary). | godly-5 idea 2, godly-2 idea 2, peers idea 3, godly-4 idea 6 |
| C | **Evidence line** | A monoline symbol that changes state along its length (solid, dashed, dotted, or similar): what happened, what the evidence shows, what remains uncertain. Can sit beside the wordmark or under it, and animate by drawing on. Must not read as a heartbeat or a chart. | godly-2 idea 5, godly-1 idea 5, peers idea 5 |
| D | **Footnote** | Typographic apparatus as identity: a citation or footnote mark, a single corner crop mark, or a superscript that says "every entry links its source". An editorial masthead feel. Not square brackets. | godly-3 idea 3, peers idea 6, godly-1 idea 6 |
| E | **Ledger** | A modular grid wordmark or monogram built on ruled cells, like entries in a record, with one cell as the single accent (the point, or the flagged entry). | godly-4 idea 1, godly-5 idea 1 |

## Deliverables per direction

In `brand-lab/directions/<ID>-<slug>/`:

1. `mark.svg` (symbol alone, if the direction has one), `lockup-horizontal.svg`, `lockup-stacked.svg`, `favicon.svg` (built for 16 and 32 px, simplified if needed), each in ink on transparent. Text converted to outlines where you can (fontkit or opentype.js with the repo's font files; `scripts/brand/build-brand.mjs` already outlines Geist and Newsreader and is a working reference); otherwise `<text>` with the font loaded, and say so.
2. `board.html`: one self-contained page (fonts via relative paths to the repo's font files) showing the mark and lockups large, the favicon at 16, 32 and 64 px, the lockup on paper `#d7d7d0` and on dark `#181a15`, one-color versions, the mark beside a sample site header (Newsreader heading and Geist body), and, if the direction moves, a short SVG or CSS animation (calm, eased, reduced-motion safe).
3. `README.md`: the idea in two sentences, what it means for SafeAI.watch, construction (grid, proportions, stroke, the rule that defines the special element), color use, why it avoids every item in the Avoid table, weak points.
4. Stills: open `board.html` in headed Chrome on the real GPU via `scripts/lib/launch-chrome.mjs` (`CHROME_PLACE=offscreen`; run `npm ci` in the worktree root first if `node_modules` is missing, or run node from `C:\Users\Home\CoreWise\SafeAI.Watch-worktrees\about-film` which has it), never headless, never minimized; screenshot the board at 1440x900 and full page to `D:\screenshots\SafeAI.Watch\logo-lab\<ID>\`. Look at them yourself and fix what reads badly, especially the 16 px favicon.

Work only inside your own `directions/<ID>-<slug>/` folder. Do not commit (the orchestrator commits). The Bash tool's cwd resets; use absolute paths. Return a summary under 120 words: the idea, the file paths, the favicon verdict at 16 px, and weak points.
