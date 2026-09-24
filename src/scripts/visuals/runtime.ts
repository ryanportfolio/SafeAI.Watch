/*
 * Shared runtime for the homepage visuals.
 *
 * Each `.visual-slot[data-visual]` whose name has a loader below gets a WebGL2
 * canvas once it comes within 300px of the viewport. The scene module is only
 * downloaded then. The runtime owns the canvas size (DPR capped at 2), the
 * animation loop (runs only while the slot is on screen and the tab is
 * visible), reduced motion (one static frame, no loop) and teardown. When
 * WebGL2 is unavailable the canvas is dropped and the CSS fallback stays.
 */

export interface SceneContext {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  slot: HTMLElement;
  /**
   * Ask for one frame now when the loop is not running (reduced motion), for
   * scenes that follow page state such as scroll. No-op while the loop runs.
   */
  redraw(): void;
}

export interface Scene {
  /** Canvas size in CSS pixels and the device pixel ratio in use. */
  resize(width: number, height: number, dpr: number): void;
  /** Draw one frame. `time` is scene time in seconds; it stops while paused. */
  render(time: number, still: boolean): void;
  /** Optional pointer position relative to the slot: -1..1 inside it, beyond that outside. */
  pointer?(x: number, y: number): void;
  /**
   * Remove everything the scene added to the page. With `contextLost` the GL
   * context is already gone: clean up the DOM and skip every GL call.
   */
  dispose(contextLost: boolean): void;
}

export type SceneFactory = (ctx: SceneContext) => Scene;

const loaders: Record<string, () => Promise<{ default: SceneFactory }>> = {
  hero: () => import('./hero'),
  sequence: () => import('./sequence'),
  record: () => import('./record'),
  coverage: () => import('./coverage'),
  closing: () => import('./closing'),
};

const MAX_DPR = 2;
/** Scene time used for the reduced-motion still frame, per scene. */
const STILL_TIME: Record<string, number> = { hero: 3, record: 6, coverage: 2.2, closing: 9 };

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

interface Mounted {
  stop(): void;
}

const mounted = new Map<HTMLElement, Mounted>();

function mount(slot: HTMLElement, create: SceneFactory): Mounted | null {
  const name = slot.dataset.visual ?? '';
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false, // shapes are antialiased in the shaders
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  slot.prepend(canvas);

  let scene: Scene | null = null;
  let width = 0;
  let height = 0;
  let onScreen = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let drawn = false;

  const running = () => onScreen && !reduced.matches && document.visibilityState === 'visible' && scene !== null;

  const draw = (still: boolean) => {
    if (!scene || width === 0 || height === 0) return;
    scene.render(still ? (STILL_TIME[name] ?? 0) : time, still);
    if (!drawn) {
      drawn = true;
      slot.setAttribute('data-visual-ready', '');
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (!running()) return;
    // clamp the step so a long stall does not jump the animation
    time += last ? Math.min(now - last, 100) / 1000 : 0;
    last = now;
    draw(false);
    raf = requestAnimationFrame(frame);
  };

  const update = () => {
    if (running()) {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    } else {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (reduced.matches && onScreen) draw(true);
    }
  };

  const resize = (w: number, h: number) => {
    width = w;
    height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    scene?.resize(w, h, dpr);
    // a resize clears the drawing buffer; redraw now unless the loop will
    if (!running()) draw(reduced.matches);
  };

  const redraw = () => {
    if (scene && onScreen && !running() && document.visibilityState === 'visible') draw(reduced.matches);
  };
  try {
    scene = create({ gl, canvas, slot, redraw });
  } catch {
    canvas.remove();
    return null;
  }

  const ro = new ResizeObserver((entries) => {
    const box = entries[entries.length - 1].contentRect;
    resize(box.width, box.height);
  });
  ro.observe(slot);

  const io = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    update();
  });
  io.observe(slot);

  const onPointer = (e: PointerEvent) => {
    if (!raf || !scene?.pointer) return;
    const r = slot.getBoundingClientRect();
    scene.pointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };

  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
  };

  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  window.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('webglcontextlost', onLost);

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', update);
    reduced.removeEventListener('change', update);
    window.removeEventListener('pointermove', onPointer);
    canvas.removeEventListener('webglcontextlost', onLost);
    if (scene) {
      // after a context loss GL calls are pointless, but DOM the scene added must still go
      const lost = gl!.isContextLost();
      try {
        scene.dispose(lost);
      } catch {
        /* keep tearing down */
      }
      if (!lost) gl!.getExtension('WEBGL_lose_context')?.loseContext();
    }
    scene = null;
    canvas.remove();
    slot.removeAttribute('data-visual-ready');
    // the CSS still comes back right away (see VisualSlot.astro)
    slot.setAttribute('data-visual-still', '');
    mounted.delete(slot);
  }

  return { stop };
}

/** Watch every visual slot on the page and mount its scene when it nears the viewport. */
export function mountVisuals(root: ParentNode = document) {
  if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') return;
  const near = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const slot = entry.target as HTMLElement;
        near.unobserve(slot);
        const load = loaders[slot.dataset.visual ?? ''];
        load()
          .then((mod) => {
            if (!slot.isConnected || mounted.has(slot)) return;
            const handle = mount(slot, mod.default);
            if (handle) mounted.set(slot, handle);
            else slot.setAttribute('data-visual-still', '');
          })
          .catch(() => {
            // chunk failed to load: the CSS fallback stays
            slot.setAttribute('data-visual-still', '');
          });
      }
    },
    { rootMargin: '300px 0px' },
  );
  root.querySelectorAll<HTMLElement>('.visual-slot[data-visual]').forEach((slot) => {
    if (loaders[slot.dataset.visual ?? '']) near.observe(slot);
  });
  // leaving for good (not into the back/forward cache): release GL contexts now
  window.addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    near.disconnect();
    unmountVisuals();
  });
}

/** Stop every mounted scene and release its GL context. */
export function unmountVisuals() {
  for (const handle of [...mounted.values()]) handle.stop();
}
