# B. The point

The full stop in "SafeAI.watch" is the one drawn element. Its left half is the round full stop of Newsreader and its right half is the square full stop of Geist Mono, so the point belongs to both words at once.

## What it means for SafeAI.watch

The serif carries the story (SafeAI) and the mono carries the record (watch); the site already pairs the two faces the same way, Newsreader for statements and Geist Mono for labels. The point sits where one voice stops and the other starts, and it takes the shape of each side it faces. That is the site's stance in one glyph: hold both at once, no camp. It is also the place where a reader stops and looks, and the only colour in the name.

## Files

| File | What |
|---|---|
| `lockup-horizontal.svg` | Master wordmark, ink on transparent, all text outlined |
| `lockup-stacked.svg` | "SafeAI" over the point and "watch", outlined |
| `mark.svg` | The point alone, 200 unit box |
| `favicon.svg` | The point on a 16 px grid; switches to cream under `prefers-color-scheme: dark` |
| `board.html` | Presentation board; open from disk (fonts load by relative path) |
| `build.mjs` | Regenerates every file above from the fonts: `node brand-lab/directions/B-the-point/build.mjs` |

All text is converted to outlines with fontkit, the same shaping `scripts/brand/build-brand.mjs` uses. No `<text>` in the deliverable SVGs. The board's own captions use the web fonts. `build.mjs` and the board fall back to the `about-film` worktree's `node_modules` when this worktree has none.

## Construction

One unit, **s = 0.092 em**: the stem of Newsreader Regular at opsz 72, measured on the right stem of "n".

- **Type.** "SafeAI" in Newsreader 400, opsz 72, tracking −0.02 em. "watch" in Geist Mono 350, tracking −0.02 em, sized so its x-height is 0.512 em − s (one stem below the serif x-height). Geist Mono has flat tops and wide letters, and at the same x-height it looked larger than the serif; one stem lower balances them.
- **The point.** 2s by 2s, sitting on the baseline. Left half: a semicircle of radius s. Right half: an s by 2s rectangle. At 100 units per em that is an 18.4 unit square.
- **Spacing.** Clear space of exactly s between the point and the nearest ink on each side, measured across the point's own height (the build intersects the glyph outlines at 41 heights between the baseline and 2s). This takes the "I" serif on the left and the upper arm of "w" on the right into account, so both gaps look equal.
- **Stacked.** Line 2 (point, then "watch") starts at the ink edge of the S. The clear gap from line 1's baseline to the top of the mono x-height is one serif x-height (line 2 baseline = 2 × 0.512 em − s).
- **Favicon.** 16 unit grid, shape 14 px tall: `M8 1H15V15H8A7 7 0 0 1 8 1Z`. Top, bottom and the flat side sit on whole pixels; only the curve antialiases. It scales exactly to 32 and 64.
- **In CSS.** The point can be set in running text without an image: `display:inline-block; width:.184em; height:.184em; margin-left:.092em; border-radius:.092em 0 0 .092em`. The board uses it to close one headline.

## Colour

- The point is the only accent: orange `#ff7733`. Everything else is ink `#1a1614` on paper `#d7d7d0`, or cream `#f4f4e7` on the dark ground `#181a15`.
- One-colour: the point takes the letter colour (all ink, or all cream). The shape still reads, so the lockup does not depend on orange.
- The deliverable SVGs are the one-colour ink masters; the orange version is on the board.

## Motion

About 3.5 s, once, on load: "SafeAI" rises 4 px and fades in; a round full stop scales in (the Newsreader period); its right half squares off (a rectangle scales out from the centre line); then the five letters of "watch" appear one mono cell at a time, 160 ms apart. Eased curves, no loop. Under `prefers-reduced-motion: reduce` the animations are removed and the finished lockup shows.

## Why it avoids the Avoid table

- No eye, pupil, iris, lens ring, magnifier, spotlight or beam: the point is a filled shape with no ring, no centre and no aperture.
- No shield (the round side faces sideways, not down), globe, network, nodes, ring or broken ring.
- No A or "AI" monogram; the letters are set as type, not redrawn.
- No bars or stripes (Epoch), no gauge or dial (a filled half-disc joined to a square, not a sector with a needle), no crosshair or target.
- No square brackets, no question mark, no tracked caps in a coloured square, and the two-part name is split by typeface, size and the point, not by bold against light caps alone (Climate Watch).
- Palette is ink, paper, cream and one orange, not navy and white.
- Against FAR.AI and "orange" (a round dot as brand): the point here has a shape no typeface ships, a size and spacing rule, and a reason for that shape.

## Weak points

- At small sizes the lockup's point is a plain orange dot. The shape reads at about 32 px lockup height and above; the 30 px nav lockup on the board shows only a dot. The favicon and mark carry the shape at small sizes.
- The favicon on its own is a simple silhouette (a square with its left side rounded). It is crisp and distinct at 16 px, but without context it could read as a generic tab or tag shape rather than a full stop.
- Orange `#ff7733` on paper `#d7d7d0` is about 1.8:1 contrast. That is fine for a logo accent, but the point should not be the only carrier of meaning in UI.
- The idea has to be explained once ("round half from Newsreader, square half from Geist Mono") before the reader sees it. Without that, it reads as a well-drawn, unusual full stop.
- Mono lowercase at display size is a new voice for this site, which elsewhere uses Geist Mono only for tiny uppercase labels.
- A pure wordmark direction: there is no symbol beyond the point, so large-format brand moments rely on the type.
