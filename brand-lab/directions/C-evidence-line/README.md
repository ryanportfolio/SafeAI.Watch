# C. Evidence line

One stroke that loses ink in three equal steps: solid, then dashed, then dotted. A tick stands at its start, marking the dated moment an entry begins.

## What it means for SafeAI.watch

Every entry on the site separates what happened, what the evidence shows, and what remains uncertain. The mark draws that structure as a single line: solid for the account of the event, dashed for what the sources support, dotted for the open questions. It does not end in a full stop; it trails off, because the record stays open. The same line works as a site device: a 9w run of it can label each of the three parts of an entry (shown on the board's sample entry).

## Files

| File | What |
|---|---|
| `mark.svg` | Symbol alone, 216 x 56 (w = 8) |
| `lockup-horizontal.svg` | Mark beside the name |
| `lockup-stacked.svg` | Name over the mark, one left edge |
| `favicon.svg` | 16 px grid; ink, cream under `prefers-color-scheme: dark` |
| `board.html` | Presentation board (fonts loaded by relative path from `node_modules`) |
| `build.mjs` | Generates all of the above; `node build.mjs` |
| `shoot.mjs` | Headed-Chrome stills to `D:\screenshots\SafeAI.Watch\logo-lab\C\` |

All SVG text is converted to outlines (fontkit, Newsreader variable at wght 450, opsz 60). The SVGs are all rects and paths; no `<text>`, no font dependency.

## Construction

- Unit: w = the stroke width. Grid 27w x 7w.
- Three runs of 9w each:
  - what happened: solid, 9 of 9 units inked
  - what the evidence shows: dash 2w, gap 1w, three times; 6 of 9 inked
  - what remains uncertain: dot 1w, gap 2w, three times; 3 of 9 inked
- The rule: each run carries one third less ink than the one before. Dashes and dots are the same stroke cut shorter (square ends, no round caps), so nothing new is added along the line; only gaps grow.
- Tick: 1w wide, 7w tall, the full grid height, centred on the line at its left end.
- Lockups: the tick height equals the name's cap height, so the tick runs from baseline to cap line and w = cap height / 7 (about 0.096 em in Newsreader, close to the name's stem weight). The line sits at half cap height. Horizontal: 4w from the last dot to the S's ink. Stacked: the same parts at the same scale, turned from beside to under; 4w from the baseline to the tick's top, both flush to the S's left ink edge.
- Wordmark: `SafeAI.watch` in Newsreader, weight 450, optical size 60, default spacing, one word. The type is left plain on purpose so the line carries the identity.
- Favicon: redrawn on a 16 px grid, 3 px monoline, integer edges so 16 and 32 render crisp. Tick 3 x 11, solid 7, dash 3, dot 2; gaps 1 then 2. It keeps the thinning but drops to one dash and one dot.

## Color

- Default: line and name in ink `#1a1614` on paper `#d7d7d0`; cream `#f4f4e7` on the dark ground `#181a15`.
- One accent, optional: the tick in orange `#ff7733`. The event is the one element in color; the evidence and the uncertainty stay in ink.
- One color: everything in ink, cream, or orange. The delivered SVG files are all-ink; the board shows the accent and inverse versions.

## Motion

Draw-on, once, 4.7 s: the tick rises (0.5 s, ease-out), the solid run draws left to right (1.1 s, ease-in-out), dashes follow at 0.25 to 0.3 s spacing, and the three dots fade in at widening intervals (0.6 s, then 0.8 s). The line slows as the evidence thins. The name fades in under it. `prefers-reduced-motion: reduce` shows the finished mark with no animation. CSS only, transforms and opacity.

## Against the Avoid table

- No eye, pupil, iris, lens ring, magnifier, spotlight or beam: nothing round, nothing that looks or shines.
- No shield, globe, network, nodes or mesh: one straight line, no joins between points.
- No ring or broken ring: no curves at all.
- No A or AI monogram: the letters are set as plain type; the symbol uses no letterform.
- Not three slanted or stacked bars (Epoch AI): one horizontal line on one axis, level, never stacked, never slanted.
- No gauge, dial or chart: no axis values, no rise or fall, no scale ticks after the first.
- Not a heartbeat: the line stays flat; the only vertical is at the start, not a spike mid-line.
- No square brackets, question marks, tracked caps in a square, or bold-versus-light caps.
- Not a crosshair or target: one tick crossing the end of one line, not four arms around a centre.
- Palette is ink, paper and orange; no navy.

## Weak points

- Morse code: dashes then dots can read as Morse to anyone who knows it (the dash-to-dot ratio is 2:1, not Morse's 3:1, and the pattern spells nothing alarming, but the association exists).
- The favicon is legible at 16 px as a distinct glyph (tick, bar, dash, dot), but the dash and dot differ by one pixel, so the three states are more implied than read. Heavy shapes at 16 px also read a little like a plug or a "T".
- The mark is wide (27:7). It is weak in square slots (avatars, app icons) unless the favicon form is used.
- At nav size the dots are about 2 to 3 px. On 1x screens they soften; the board's nav sample is 21 px tall and holds.
- A line with a start tick can read as a timeline or a ruler. That fits a dated record, but it is a common graphic, so the mark depends on the exact solid-dashed-dotted rhythm to be ownable.
- The wordmark is unmodified Newsreader; the name alone has no custom move.
