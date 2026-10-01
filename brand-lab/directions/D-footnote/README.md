# D. Footnote

The name carries a reference mark: "SafeAI.watch" set in Newsreader with a blue superscript 1 after it, the way a sentence in a paper cites its source. The stacked masthead resolves the reference with a footnote rule and the note it points to: "1 Every entry links its source."

## What it means for SafeAI.watch

The site's first promise is that every entry links its original source. The logo states that promise in the grammar readers already know from books and papers, so it reads as a record with citations, not as a product or a campaign. The blue is the color of a link, and in the nav the superscript can be a real link to the sourcing policy, so the logo does what it depicts. The name stays whole: "SafeAI" and ".watch" are set as one word, and the reference belongs to both.

## Construction

- **Name.** Newsreader 400, optical size 72, tracking -0.015em. No altered letters.
- **The reference (the rule that defines the special element).** Newsreader "1", weight 600, optical size 18. Heavier and at a lower optical size than the name, so its stem matches the name's stems once it is small. Its figure height equals the name's x-height (0.426em); its top sits on the ascender line of the h (0.742em); its left edge sits one stem (0.05em) after the h. These proportions match Newsreader's own superior figure (U+00B9 is 0.39em tall with its top at 0.72em), so it is a real superscript, not a scaled numeral.
- **Stacked masthead.** Below the name, a footnote rule 0.02em thick, as long as "SafeAI", 0.34em under the baseline. Under it the note in Newsreader 400, optical size 14, at 0.3em, led by its own reference built by the same rule at note size. Minimum size 80 px tall; smaller, use the horizontal lockup.
- **Mark.** The S of the name with its reference, placed by the same rule. For avatars and large single-symbol use.
- **Favicon.** Drawn separately on a 32-unit grid: S in Newsreader 700, optical size 12, 24 units tall (y 6 to 30); reference 13 units tall from y 2, so it rises above the S like a superscript over a capital; 2.5-unit gap between them; the pair centred. `favicon.svg` switches to cream and the lifted blue under `prefers-color-scheme: dark`.
- **Motion (board only).** The reference rises from 38% below into place (0.7 s), the footnote rule draws left to right (0.8 s), the note settles (0.6 s), all on the site's `--ease-out`. Reduced motion shows the end state with no animation.
- All text is outlined from the repo's OFL font files with fontkit (`src/build.mjs`, `src/lib.mjs`); the SVGs contain no `<text>`. Rebuild: `node brand-lab/directions/D-footnote/src/build.mjs` (fonts and fontkit are read from the about-film worktree's `node_modules`; change `NM` in `src/lib.mjs` if that moves).

## Color

- Ink `#1a1614` for the name, the rule and the note; mark blue `#253e77` for the reference only, on paper `#d7d7d0`.
- On the dark ground `#181a15`: cream `#f4f4e7` with the reference in the site's lifted blue `#6a86c2` (`--accent-blue`), the same hue raised for dark scenes.
- One accent in the mark. Blue was chosen over orange because orange `#ff7733` on paper is about 1.7:1, too faint for a small numeral, and because blue is the link color.
- One color: all ink or all cream. The reference still reads as a reference by size and position.

## Why it avoids the Avoid table

- No eye, pupil, iris, lens ring, magnifier, spotlight or beam: nothing looks at anything. "Watch" is carried by the name and by the act of citing.
- No shield, globe, network, node mesh, ring or broken ring, gauge or dial, crosshair or target: the only shapes are letters, one numeral and one straight rule.
- No crossbar-less A or "AI" monogram: the A in the name keeps Newsreader's crossbar, and the mark is built on the S.
- No three slanted or stacked bars: there is one horizontal rule, in the stacked lockup only.
- No square brackets around the name (the citation is a superscript, not "[1]"), no question mark, no tracked caps in a colored square, no bold-versus-light caps device.
- Palette: warm paper, ink, one blue accent. Not navy and white only.
- Original: the nearest relative in the research is Common (godly-3), whose annotated wordmark carries a circled superscript "3" among dimension markers and coordinates on a blue field. This mark has no circle (a circled numeral would also brush the ring rule), no survey apparatus, a serif rather than caps setting, and a note that the reference resolves to. Center for Humane Technology's brackets are the other relative; there are none here.

## Weak points

- The mark alone, "S" with a raised "1", can read as "S1" or a code without the wordmark beside it. It works best next to the name or as a favicon, where the tab title supplies the context.
- At 16 px the reference is about 6 by 3 pixels of blue: it separates from the S and reads as a raised blue stroke, but not clearly as the digit 1. At 32 px it is clearly a 1.
- The idea depends on the reader knowing footnote conventions. Most readers of an editorial site do, but the joke of the stacked note is lost when the note is dropped.
- In the horizontal lockup at 12 px the reference drops to about 5 px tall; it stays visible as a blue tick but is no longer a legible numeral.
- The wordmark is plain Newsreader; its distinctiveness rests on the reference alone. A custom-cut numeral (for example, a flag angled to match the S terminals) would make it more ownable.
- The board loads fonts from `../../../node_modules/`, with a fallback to the about-film worktree; if neither exists the sample header text falls back to Georgia and system sans (the logos themselves are outlines and are unaffected).
