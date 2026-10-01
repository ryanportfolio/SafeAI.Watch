# Direction E: Ledger

The name is entered into a ruled record, one character per square cell, like a register or a form filled in by hand. One cell is flagged: the cell of the point, filled orange, where "SafeAI" ends and "watch" begins.

## What it means for SafeAI.watch

The site is a record: every entry is written down in the same format and links its source. The cells say that each item gets the same treatment and the same space, with nothing enlarged for effect. The flag is the one entry that calls for attention, and it sits on the point, so reading the name also means stopping at the place where you look. "SafeAI" and ".watch" each have six characters, so the stacked lockup is an exact 6 by 2 ledger and the flag opens the second row.

## Files

| File | What |
|---|---|
| `lockup-stacked.svg` | Primary lockup, 6 cells over 6 cells. Display cut. |
| `lockup-horizontal.svg` | One row of 12 cells; the flag is cell 7. Display cut, for use at about 40 px tall and up. |
| `lockup-horizontal-text.svg` | Same row in the text cut (Newsreader 520 at opsz 16, rule 0.046 em, pitch 0.88 em), for nav and small use under about 40 px. |
| `mark.svg` | The flagged cell alone: comb, orange square, point. |
| `favicon.svg` | The flagged cell redrawn on a 16 px grid with whole-pixel rules; the comb turns cream under `prefers-color-scheme: dark`. |
| `board.html` | Presentation board. Fonts load from `../../../node_modules` (this worktree after `npm ci`), with a fallback to the sibling `about-film` worktree. |
| `build.mjs` | Generates every SVG and the board. `node build.mjs`. |

All lettering is outlined from Newsreader with fontkit; the SVGs use no fonts. Ink `#1a1614` on transparent.

## Construction

Units in em of the Newsreader size (display cut: wght 400, opsz 72; cap height 0.67 em).

- Cell pitch W = 0.86 em, the narrowest pitch that holds A and w with clearance.
- Rule s = 0.024 em. The comb: one baseline rule under the row, plus a tick at every cell boundary, tick height T = 0.3 W. Only T-joints, no crossings.
- Cells are square: cell height H = W minus s, measured from the rule up to the cap line plus the inset.
- Letters are centred on their outline bounds in each cell and float above the rule by the lift (H minus cap minus g, 0.118 em).
- Stacked row pitch P = 1.3 W.
- **The flag rule:** the flag is the cell of the point, filled, inset from the ticks and the rule by g = 2 s. So it is a square of side W minus s minus 2 g (0.74 em), and its top lands exactly on the cap line. The point inside is Newsreader's own full stop, on the letter baseline. There is one flag, never more.
- Text cut: same rules with pitch 0.88 em, rule 0.046 em, inset 1.5 s.
- Favicon: 16 px grid. Comb 1 px (rule y 14, ticks x 1 and 14, 3 px tall); flag 10 by 10 at x 3, y 3; point 2 by 2 at x 7, y 10.

## Colour

- Ink letters and comb, orange `#ff7733` flag, ink point. The orange is the only accent, and it appears in one cell.
- On dark `#181a15`: cream `#f4f4e7` letters and comb; the flag stays orange and the point stays ink, so it reads as a hole through the flag.
- One colour: the flag takes the letter colour and the point is cut out of it (even-odd), so paper or ground shows through.

## Motion

On load, played once over 3.6 s on the site's ease-out: the rules draw left to right, the ticks rise, letters are entered cell by cell, then the flag fills from the rule up and the point is set. `prefers-reduced-motion` shows the final state.

## Avoid table check

- No eye, pupil, iris, lens ring, magnifier, spotlight, shield, globe, network or node mesh: the only shapes are rules, ticks, letters and one square.
- No ring or broken ring and no circle except the font's full stop.
- No crossbar-less A or "AI" monogram: A and I are Newsreader's own, with crossbar and serifs, and the design is built on cells, not on those letters.
- No three slanted or stacked bars: the stacked lockup has two horizontal rules, each broken by ticks and carrying letters.
- No gauge or dial, no crosshair or target: the comb has T-joints only, no crossing lines.
- No square brackets around the name: each tick is a single upright shared by two cells, and the comb sits under the letters, not around the name.
- No question mark, no tracked caps in a coloured square, no bold versus light caps: the name stays in mixed case, one weight.
- Palette is ink, paper, cream and orange, not navy and white.
- Not a variant of the grid wordmark it grew from (godly-4, Wood Mood): that design boxes capitals with full-height rules that cross between rows. This one is an open comb with short ticks, mixed-case serif, square cells by rule, and a filled flag cell with no letter in it.

## Weak points

- Word shape. One character per 0.86 em cell spaces the narrow letters (f, I, t) wide. The name reads as spelled out rather than as a word, most of all in the horizontal lockup. The stacked lockup reads best.
- Small sizes. Below about 20 px tall the comb gets busy and the display cut's hairlines go thin; the text cut helps down to about 14 px, below that use the favicon.
- Tile games. A row of letter cells with one coloured cell can recall Wordle or Scrabble. The open comb and the empty flag (no letter in it) reduce this but do not remove it.
- The mark alone is abstract: an orange square with a point in a tray. It carries no letter. At 16 px it reads clearly, but it only means SafeAI.watch once people have seen the wordmark.
- Favicon on a dark tab bar: the favicon's colour-scheme query follows the OS setting, not the browser theme, so on a dark tab with a light OS the ink comb disappears and only the orange square shows.
- Neighbour: the flag sits on the point, which direction B also works on. Here the point stays the font's own full stop and the design element is the cell around it.
