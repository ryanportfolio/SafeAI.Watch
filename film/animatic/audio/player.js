// Sound version of the animatic: a toggle, off by default, and playback of the one rendered
// buffer from offset t. While sound is off this module creates no AudioContext and no
// OfflineAudioContext and does not load the score, so the silent film stays silent.
// Browsers only let audio start after a user gesture: with ?sound=1 the buffer renders at load,
// and playback begins on the first click or key press.
const LEAD = 1 / 60; // the picture leads the heard audio by up to one frame, never trails it

export function createSound({ data, button, initial = false, getT, isPlaying }) {
  let on = false, buffer = null, rendering = null, failed = null;
  let ctx = null, src = null, srcGain = null, startAt = 0, offset = 0;

  function label() {
    button.setAttribute('aria-pressed', String(on));
    button.textContent = !on ? 'Sound off' : failed ? `Sound failed: ${failed.message || failed}` : buffer ? 'Sound on' : 'Sound: rendering';
  }

  function render() {
    rendering ||= import('./score.js')
      .then((m) => m.renderFilmAudio(data))
      .then((r) => { buffer = r.buffer; label(); sync(); })
      .catch((err) => { failed = err; label(); console.error(err); });
    return rendering;
  }

  // Only called from a user gesture (or once one has happened), and only while sound is on.
  function ensureCtx() {
    if (!ctx) {
      ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
      ctx.addEventListener('statechange', sync);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  }

  function stopSource() {
    if (!src) return;
    const now = ctx.currentTime;
    srcGain.gain.setTargetAtTime(0, now, 0.004); // 30 ms exponential fade, no click
    src.stop(now + 0.03);
    src = null;
  }

  function start(t) {
    stopSource();
    if (!on || !buffer || !ctx || ctx.state !== 'running' || !isPlaying()) return;
    const when = ctx.currentTime + 0.02;
    src = ctx.createBufferSource();
    src.buffer = buffer;
    srcGain = ctx.createGain();
    srcGain.gain.setValueAtTime(0, when);
    srcGain.gain.setTargetAtTime(1, when, 0.003);
    src.connect(srcGain).connect(ctx.destination);
    src.start(when, Math.min(t, buffer.duration));
    startAt = when;
    offset = t;
  }

  // Start (or restart) audio at the picture's current time whenever it becomes possible.
  function sync() {
    if (on && isPlaying() && buffer && ctx?.state === 'running') { if (!src) start(getT()); }
    else stopSource();
  }

  function setOn(v) {
    on = v;
    if (on) { render(); ensureCtx(); sync(); }
    else { stopSource(); if (ctx?.state === 'running') ctx.suspend(); }
    label();
  }

  button.addEventListener('click', () => setOn(!on));
  const gesture = () => { if (on) ensureCtx(); };
  addEventListener('pointerdown', gesture, true);
  addEventListener('keydown', gesture, true);
  if (initial) { on = true; render(); }
  label();

  return {
    // picture transport hooks
    setPlaying(p, t) { if (p && on) ensureCtx(); if (p) start(t); else stopSource(); sync(); },
    seek(t) { if (src) start(t); },
    // position of the heard audio, or null when audio is not driving the clock
    clock() {
      if (!src) return null;
      let now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      const ts = ctx.getOutputTimestamp?.();
      if (ts && ts.contextTime > 0) now = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      return offset + Math.max(0, now - startAt) + LEAD;
    },
    get state() { return { on, ready: !!buffer, context: ctx ? ctx.state : 'none', driving: !!src }; },
  };
}
