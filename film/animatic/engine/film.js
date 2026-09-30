// The film as a pure function of t. frame(t) paints the picture layer, paints the text layer,
// and composites both into the output canvas. No dt, no Math.random(), no state carried
// between frames: seek(t) and a fresh ?t= load produce the same pixels.
import { clamp, qt, easeInOut, smooth } from './util.js';
import { makeCamera, projector, STAGE_W, STAGE_H } from './camera.js';
import { palette, DUSK_LEN } from './palette.js';
import { makeCues, cameraKeys, drawWorld, anchorFor, STEPS } from './world.js';
import { drawText, FONTS } from './captions.js';
import { rgba } from './util.js';

// Graft 1 (blue caret): statements whose limit is inserted by the caret.
const CARETS = {}; // the script states each limit in the caption itself
// Statements drawn faint (none in this cut).
const FAINT = {};
// Dusk sweeps in from the fog corner as a soft front, so no frame is a flat mid-grey.
const FRONT = { x: STAGE_W, y: 0, soft: 700, reach: 2900 };
const CAPTION_AT = { x: 520, y: 860 };
const DISSOLVE = 0.4; // reduced motion: designed stills per beat, 0.4 s dissolves

function layer(doc) {
  const c = doc.createElement('canvas');
  c.width = STAGE_W; c.height = STAGE_H;
  return c;
}

export function createFilm(data, { canvas, reducedMotion = false, doc = document }) {
  const out = canvas.getContext('2d', { alpha: false });
  const pic = layer(doc), pic2 = layer(doc), txt = layer(doc);
  const pctx = pic.getContext('2d', { alpha: false }), pctx2 = pic2.getContext('2d'), tctx = txt.getContext('2d');
  // measure type in world units for the lines laid on the water (fonts are loaded before this)
  const measure = (text, size, track) => {
    tctx.font = `400 ${size}px ${FONTS.serif}`;
    tctx.letterSpacing = '0px';
    const adv = [...text].map((ch) => tctx.measureText(ch).width + track * size);
    return { adv, len: adv.reduce((a, b) => a + b, 0) - track * size };
  };
  const cues = makeCues(data, measure);
  const cam = makeCamera(cameraKeys(cues));
  const duration = data.duration;
  const beats = data.beats;
  const beatIndex = (t) => { let i = 0; for (let j = 0; j < beats.length; j++) if (beats[j].start <= t) i = j; return i; };
  // Reduced motion: each beat holds one designed still, taken once the beat has settled.
  const stillTime = (b) => (b === beats.length - 1 ? duration : beats[b].end - 0.6);

  function paintPicture(ctx, t, still, duskOverride = null) {
    const pal = palette(t, cues, duskOverride);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = rgba(pal.ground, 1);
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    // closing ground: warm corner glows (K52)
    if (pal.close > 0) {
      for (const [x, y] of [[0, 0], [STAGE_W, STAGE_H], [STAGE_W, 0], [0, STAGE_H]]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 900);
        g.addColorStop(0, rgba(pal.T.closingRed, 0.8 * pal.close));
        g.addColorStop(1, rgba(pal.T.closingRed, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      }
    }
    const pr = projector(cam.at(t, { still }));
    drawWorld(ctx, t, pr, pal, cues, { still });
    return { pal, pr };
  }

  // radius of the dusk front at t; null outside the sweep
  function frontR(t) {
    const u = (t - cues.dusk) / DUSK_LEN;
    if (u <= 0 || u >= 1) return null;
    return -FRONT.soft + easeInOut(u) * (FRONT.reach + FRONT.soft);
  }
  const coverAt = (r, p) => smooth((r - Math.hypot(p.x - FRONT.x, p.y - FRONT.y)) / FRONT.soft);

  function frame(tIn) {
    const t = qt(clamp(tIn, 0, duration));
    let pal, pr, tChart = t;
    const r = reducedMotion ? null : frontR(t);
    if (r != null) {
      // day chart under, night chart over, masked by a soft radial front from the fog corner
      ({ pr } = paintPicture(pctx, t, false, 0));
      paintPicture(pctx2, t, false, 1);
      const g = pctx2.createRadialGradient(FRONT.x, FRONT.y, Math.max(0, r), FRONT.x, FRONT.y, Math.max(1, r + FRONT.soft));
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      pctx2.globalCompositeOperation = 'destination-in';
      pctx2.fillStyle = r + FRONT.soft <= 0 ? 'rgba(0,0,0,0)' : g;
      pctx2.fillRect(0, 0, STAGE_W, STAGE_H);
      pctx2.globalCompositeOperation = 'source-over';
      pctx.drawImage(pic2, 0, 0);
      pal = palette(t, cues, coverAt(r + FRONT.soft, CAPTION_AT));
    } else if (!reducedMotion) {
      ({ pal, pr } = paintPicture(pctx, t, false));
    } else {
      const b = beatIndex(t);
      const tp = stillTime(b);
      ({ pal, pr } = paintPicture(pctx, tp, true));
      const u = easeInOut((t - beats[b].start) / DISSOLVE);
      if (b > 0 && u < 1) {
        paintPicture(pctx2, stillTime(b - 1), true);
        pctx2.globalAlpha = u; pctx2.drawImage(pic, 0, 0); pctx2.globalAlpha = 1;
        pctx.drawImage(pic2, 0, 0);
      }
      pal = palette(tp, cues);
      tChart = tp;
    }
    drawText(tctx, data, t, pal, { pr, tChart, rm: reducedMotion, carets: CARETS, faint: FAINT, steps: STEPS, cues, anchorFor });
    out.drawImage(pic, 0, 0);
    out.drawImage(txt, 0, 0);
    return t;
  }

  return { duration, chapters: data.chapters, beats, frame, reducedMotion };
}
