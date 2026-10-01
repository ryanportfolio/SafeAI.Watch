# G · Valley

The owner's pick from direction F (F4): the S as a valley floor on a map sheet, the ground rising both ways from it. This folder holds three refinements of it. Direction F is unchanged.

## Construction

`node build.mjs` writes every SVG and `board.html`. Geometry is in `variants.mjs` on `geo.mjs` (a copy of F's marching-squares core). The build prints the smallest gap between lines and the point's clearance, and stops if either is too small.

- **Sheet.** Square, 100 x 100 units. F4 was 94 x 102.
- **Elevation.** `e = 40 * (1 - exp(-d / 19)) + four low hills`, where d is the distance to the S spine (the valley floor). The wall is steep at the floor and eases with height. Levels sit at equal steps of 5.5, so line density shows slope: the lines next to the S are 3.6 to 4.5 units apart, the outer ones 6 to 9.
- **S reads first.** The first contour sits about 4.5 units from the floor. That makes the valley 9 units wide, the widest open band on the sheet, so the eye finds the S before it finds the lines.
- **No stripe field.** F4's outer lines ran as near-parallel arcs to the edge. Here the wall levels off and four low hills take over the open ground: one beyond each terminal, and one on each shoulder, elongated so it runs off the sheet as a ridge. The outer lines bend around them or close into loops, so their curvature keeps changing.
- **Clean edges.** Lines are traced 2 units past the sheet and cut flush by a clip path at the edge, so every end is square to it. Pieces that only graze the sheet (reaching less than 4.5 units in) and crowns under 16 units around are dropped.
- **Counters.** The upper bowl is drawn a little smaller than the lower (rx 21.5 / 22.5, ry 18 / 18.8), so the two counters look equal.
- **The point.** On the valley floor where it crosses the sheet's vertical centre line: the middle of the S, with equal ground rising either way.
- **Favicon.** The ink square with the valley cut out at elevation 13.5 (about 2 px wide at 16 px), plus one orange point. The knockout is an SVG mask, so the file is transparent. Under `prefers-color-scheme: dark` it switches to a cream square.
- **Small lockup.** Below 48 px the contours fill in. `G<n>-lockup-small.svg` puts the favicon's ink square beside the wordmark.
- **Wordmark.** Newsreader 420, opsz 36, outlined. It was chosen in F because Geist's capital I has no serifs, so "SafeAI" reads as "SafeAl".

Measured clear gap between line edges: G1 and G3 2.21 units, G2 0.96 (its noise pulls lines closer in places). Point clearance: G1 1.81, G2 1.46, G3 0.58.

## Files

Per variant: `G<n>-mark.svg`, `G<n>-lockup-horizontal.svg`, `G<n>-lockup-stacked.svg`, `G<n>-lockup-small.svg`, `G<n>-favicon.svg`, all in ink on transparent with one orange point. Cream-on-dark and one-colour versions are in `board.html`. `shoot.mjs` takes the stills.

## The three

- **G1 · Polished.** F4 refined as above: square sheet, balanced counters, wide valley, steep walls that ease outward, flush edges, the point at the centre of the floor.
- **G2 · Surveyed.** The same valley on irregular ground. Seeded value noise is added to the height, a seeded domain wobble moves the sample point by up to 2.2 units, and the wall is steeper on one bank (lambda 15) than the other (23). The floor also rises and falls a little along its length. A closed hollow sits in the lower bend. It reads as land first, and the S is still legible from across the room.
- **G3 · Marker.** G1's ground with two additions. The point becomes a triangulation mark: a hairline orange triangle around a small orange dot, the survey-map symbol for a fixed position. The sheet gets a 0.45-unit neatline with corner ticks running 4 units past each corner. The favicon carries a solid orange triangle.

## Recommendation: G3

- The neatline and ticks deal with the stripe-field risk most directly. Framed and ticked, the lines read as a cut map sheet, and the edge stops looking like the end of a pattern.
- The triangulation mark says "a surveyed position" more exactly than a dot. It is still one orange point, and at small sizes it reads as a dot again.
- Its ground is G1's, so the S reads first and the lines stay calm.
- G2 is the best drawing of land, but its S takes a beat longer to see. It would suit a large format (the About page, a poster).

## Weak points

- **Stripe field, partly.** The left and right edges still carry two or three long, gently curving lines where the shoulder ridges run off the sheet. They bend, but at a glance they are the closest thing to parallel stripes. G2 breaks them most; G3's neatline frames them as map content.
- **Small sizes.** No contour survives below about 48 px. The tab and the nav use the ink square with the valley cut out, which shows an S and the point but not terrain. That makes it a two-drawing system.
- **Marker size.** G3's triangle is legible from about 200 px. In a 64 px lockup it is an orange speck, and the fine triangle carries no meaning there.
- **Crosshair distance.** A plain triangle with a centre dot avoids the crosshair and target on the Avoid list. A fine cross through the point would have read as a crosshair, so it was not used.
- **Neatline and brackets.** The corner ticks are close to the site's frame idiom, which is wanted, and a step away from brackets around the name. They frame the mark, never the wordmark.
- **G2 spacing.** Its noise brings two lines within 0.96 units of each other in one bend. They do not touch, but it is the tightest spot in the set.
- **Generic map risk.** Contour tiles are common in outdoor and "explore" branding. The S valley and the single point are what make this one SafeAI.watch's.
