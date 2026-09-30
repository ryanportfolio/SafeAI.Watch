// The film as a pure function of t. frame(t) paints the picture layer, paints the text layer,
// and composites both into the output canvas. No dt, no Math.random(), no state carried
// between frames: seek(t) and a fresh ?t= load produce the same pixels.
import { clamp, qt, easeInOut } from './util.js';
import { makeCamera, projector, STAGE_W, STAGE_H } from './camera.js';
import { palette } from './palette.js';
import { makeCues, cameraKeys, drawWorld, anchorFor, clusterRadius } from './world.js';
import { drawText } from './captions.js';
import { rgba } from './util.js';

// Graft 1 (blue caret): statements whose limit is inserted by the caret.
const CARETS = { B5a: 'during a cyber test', B9: 'in tests' };
const DISSOLVE = 0.4; // reduced motion: designed stills per beat, 0.4 s dissolves

function layer(doc) {
  const c = doc.createElement('canvas');
  c.width = STAGE_W; c.height = STAGE_H;
  return c;
}

export function createFilm(data, { canvas, reducedMotion = false, doc = document }) {
  const out = canvas.getContext('2d', { alpha: false });
  const pic = layer(doc), pic2 = layer(doc), txt = layer(doc);
  const pctx = pic.getContext('2d', { alpha: false }), pctx2 = pic2.getContext('2d', { alpha: false }), tctx = txt.getContext('2d');
  const cues = makeCues(data);
  const cam = makeCamera(cameraKeys(cues));
  const duration = data.duration;
  const beats = data.beats;
  const beatIndex = (t) => { let i = 0; for (let j = 0; j < beats.length; j++) if (beats[j].start <= t) i = j; return i; };
  // Reduced motion: each beat holds one designed still, taken once the beat has settled.
  const stillTime = (b) => (b === beats.length - 1 ? duration : beats[b].end - 0.6);

  function paintPicture(ctx, t, still) {
    const pal = palette(t, cues);
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

  function frame(tIn) {
    const t = qt(clamp(tIn, 0, duration));
    let pal, pr;
    if (!reducedMotion) {
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
    }
    drawText(tctx, data, t, pal, { pr, rm: reducedMotion, carets: CARETS, cues, anchorFor, clusterRadius });
    out.drawImage(pic, 0, 0);
    out.drawImage(txt, 0, 0);
    return t;
  }

  return { duration, chapters: data.chapters, beats, frame, reducedMotion };
}
