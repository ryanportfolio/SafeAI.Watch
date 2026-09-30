# A. Same shape

Two identical halves, one turned 180 degrees about the centre, lock into a geometric S. One half is ink and one is orange, so the benefit and the danger are visibly the same outline, and neither half makes the mark alone.

## What it means for SafeAI.watch

The site's stance is that AI's benefit and danger come from the same capabilities. The mark states that as geometry: there is only one shape, drawn twice. The S stands for Safe without using the letters A or I. The motion (the orange half starts on top of the ink half, then turns into place) shows the claim instead of labelling it, and the turn is a quiet nod to a watch hand.

## Files

| File | What |
|---|---|
| `mark.svg` | Symbol, ink and orange, transparent ground |
| `mark-mono.svg` | Symbol, one colour (ink) |
| `lockup-horizontal.svg` | Mark and name, side by side |
| `lockup-horizontal-mono.svg` | Same, one colour |
| `lockup-stacked.svg` | Mark above name |
| `favicon.svg` | 16-px pixel-snapped redraw; ink switches to cream under `prefers-color-scheme: dark` |
| `board.html` | Presentation board (generated) |
| `build.mjs` | Builds every file above from one geometry: `node build.mjs` |

The name is converted to outlines (fontkit shaping of Newsreader from `@fontsource-variable/newsreader`, as in `scripts/brand/build-brand.mjs`). No SVG deliverable contains `<text>`. `board.html` loads Geist, Geist Mono and Newsreader for its own captions from `../../../node_modules/@fontsource-variable/`, falling back to the `about-film` worktree's copy because the logo-lab worktree has no `node_modules`.

## Construction

- Box 10 wide by 12 tall (mark units). Band 1.5. Three horizontal runs at y 0 to 1.5, 5.25 to 6.75 (the spine) and 10.5 to 12; counters 3.75.
- Bends: inner radius 0.5, outer radius 2, concentric, so the band keeps its width through each turn. Terminals are cut square.
- One half is the top run, the left drop and half the spine. The other half is that outline rotated 180 degrees about (5, 6).
- **The rule for the special element, the seam:** it lies on the diagonal from the top terminal's outer corner (10, 0) to the bottom terminal's outer corner (0, 12). That line passes through the centre of rotation, so it maps onto itself under the turn and the two halves meet flush. It is the only diagonal in the mark. Gap across the seam: 0.24 units, measured square to the seam.
- Horizontal lockup: mark height 1.5 times the name's cap height, centred on the caps; space between mark and name equals one counter (3.75 units). Stacked: mark height 3 times cap height, one counter above the cap line.
- Name: "SafeAI.watch" in Newsreader, weight 460, optical size 48, tracking -0.012 em, one colour. The mark carries the idea, so the name stays plain.
- Favicon: redrawn on whole pixels of a 16 grid. Mark x 2 to 14; top and bottom runs 3 px, spine 4 px (heavier spine is the usual optical correction for an S), counters 3 px, outer bends radius 3, no seam gap, seam on the same diagonal. At 32 px it scales 2x cleanly.

## Colour

- Paper `#d7d7d0`: top half ink `#1a1614`, bottom half orange `#ff7733`, name ink.
- Dark `#181a15`: ink becomes cream `#f4f4e7`; orange stays.
- One colour: both halves in ink or cream; the seam gap keeps the two halves readable.
- Orange is the only accent. Ink sits on top because the reading starts with the record; the orange half completes it.

## Motion

On first load the orange half starts exactly on top of the ink half (the same outline) and turns 180 degrees about the centre into place: 1.4 s, `cubic-bezier(0.65, 0, 0.35, 1)` (the site's `--ease-in-out`), once, after a 0.5 s delay. Under `prefers-reduced-motion: reduce` the finished mark shows with no motion. The board also shows an 8 s loop for review only. Mid-turn the orange half sweeps up to 2.8 units outside the mark box, so any container needs `overflow: visible` or that much padding.

## The Avoid table, item by item

- Eye, pupil, iris, lens ring, magnifier, spotlight: no circle, no aperture, no beam.
- Shield, globe, network or node mesh: none; the form is one bent band.
- Ring or broken ring: the bends are small (outer radius 2 on a 12-unit height) and joined by straight runs; the bowls are flat-topped, not arcs of a circle. Not a yin-yang: no circle and no curved S-divide.
- Crossbar-less A or AI monogram: the mark is an S; A and I appear only in the typeset name.
- Three slanted or stacked bars (Epoch AI): the runs are horizontal and joined by drops into one continuous S; nothing is slanted except the single seam.
- Gauge, dial, protractor: no scale, needle or sector.
- Square brackets around the name: none. Each half alone looks like a squared C, but the halves are never shown around the name.
- Question marks, tracked caps in a coloured square, bold-versus-light caps: none; the name is one weight in upper and lower case.
- Navy and white only: paper, ink and orange.
- Crosshair or target: none.
- Flame, tree, flag colours: none.

## Weak points

- **Orange on paper is low contrast:** about 1.8:1 against `#d7d7d0`, under the 3:1 guideline for graphics. The S still reads from the ink half and the silhouette, but the orange half looks light on paper. The one-colour ink version is the fallback where contrast matters. Mark blue would pass but reads as a second near-black, which loses the two halves.
- **Genre risk:** a squared, bent-band S can read as sport or gaming branding. The light band (1.5 of 12), the Newsreader name and the slow motion pull it back toward editorial, but the risk is real at large sizes in isolation.
- **Redundant S** in the horizontal lockup ("S SafeAI.watch"). The two colours make it read as a symbol, not a letter, but it is there.
- **Squared S versus the digit 5:** the rounded top-left bend separates it from a seven-segment 5; it still leans that way in the favicon at 16 px, where the S reads mainly from context.
- **The seam gap** (0.24 units) is below a pixel under about 50 px of mark height and fades into a plain S. Intended, but it means the "two halves" reading at small sizes rests on colour alone.
- The favicon's two-tone split at 16 px is legible in both tab themes, but the diagonal seam becomes a 2-pixel stair.
