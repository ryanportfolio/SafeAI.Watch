// Site tokens (facts.md K rows) and the colour script: day paper, a 4 s dusk into the
// record slate, then the closing ground for the end card.
import { hexRgb, mixRgb, easeInOut } from './util.js';

export const TOKENS = {
  paper: hexRgb('#d7d7d0'), // K1
  ink: hexRgb('#1a1614'), // K2
  cream: hexRgb('#f4f4e7'), // K3
  orange: hexRgb('#ff7733'), // K10
  amber: hexRgb('#e5a700'), // K11
  olive: hexRgb('#a89a1a'), // K12
  markBlue: hexRgb('#253e77'), // K13
  accentBlue: hexRgb('#6a86c2'), // K13, blue lifted for dark grounds
  slate: hexRgb('#161f29'), // K16 record ground
  closing: hexRgb('#181a15'), // K16, K17 closing ground
  closingRed: hexRgb('#341616'), // K17 warm corner glow
  chip: [242, 242, 236], // K47 chip label fill
};

export const DUSK_LEN = 2.6;
export const CLOSE_LEN = 1.5;

// dusk: 0 = day paper, 1 = slate. close: 0..1 into the closing ground.
export function palette(t, cues, duskOverride = null) {
  const dusk = duskOverride ?? easeInOut((t - cues.dusk) / DUSK_LEN);
  const close = easeInOut((t - cues.close) / CLOSE_LEN);
  const T = TOKENS;
  const ground = mixRgb(mixRgb(T.paper, T.slate, dusk), T.closing, close);
  const ink = mixRgb(T.ink, T.cream, dusk); // line and text colour on the current ground
  const blue = mixRgb(T.markBlue, T.accentBlue, dusk);
  return { dusk, close, ground, ink, blue, orange: T.orange, amber: T.amber, olive: T.olive, cream: T.cream, chip: mixRgb(T.chip, [44, 52, 62], dusk), T };
}
