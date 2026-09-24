/*
 * Shared pieces of the three dark scenes (record band, coverage panel,
 * closing call to action): a full-canvas backdrop pass (base color, soft
 * color fields, vignette) and a film-grain overlay pass, both from one small
 * fragment shader, plus the seeded random and easing helpers the scenes use.
 *
 * Draw order per frame: `field()` (sets the viewport and covers the whole
 * canvas), scene shapes, then `grain()` so the grain sits over the dots too.
 */

const VS = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform uint uSeed;
uniform int uMode;
uniform float uGrain;
uniform float uVignette;
uniform vec3 uBase;
uniform vec4 uBlob[5];
uniform vec4 uTint[5];
out vec4 color;

float hash(vec2 p) {
  uvec2 q = uvec2(p);
  uint h = q.x * 1664525u + q.y * 1013904223u + uSeed * 2654435761u;
  h ^= h >> 16; h *= 0x7feb352du;
  h ^= h >> 15; h *= 0x846ca68bu;
  h ^= h >> 16;
  return float(h) / 4294967295.0;
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;
  if (uMode == 1) {
    // grain: one sample per CSS pixel, lightening or darkening toward white or black
    float n = (hash(floor(gl_FragCoord.xy / uDpr)) - 0.5) * 2.0 * uGrain;
    color = n > 0.0 ? vec4(vec3(n), n) : vec4(0.0, 0.0, 0.0, -n);
    return;
  }
  vec3 c = uBase;
  for (int i = 0; i < 5; i++) {
    vec2 d = (uv - uBlob[i].xy) / max(uBlob[i].zw, vec2(1e-3));
    c = mix(c, uTint[i].rgb, uTint[i].a * exp(-dot(d, d)));
  }
  vec2 v = (uv - 0.5) * 2.0;
  c *= 1.0 - uVignette * smoothstep(0.35, 1.45, length(v));
  color = vec4(c, 1.0);
}`;

/** One soft color field: center and radii as fractions of the canvas, color 0..1, strength 0..1. */
export interface Blob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rgb: readonly number[];
  a: number;
}

const MAX_BLOBS = 5;

export class Backdrop {
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private blobs = new Float32Array(MAX_BLOBS * 4);
  private tints = new Float32Array(MAX_BLOBS * 4);

  constructor(private gl: WebGL2RenderingContext) {
    const p = gl.createProgram()!;
    for (const [type, src] of [
      [gl.VERTEX_SHADER, VS],
      [gl.FRAGMENT_SHADER, FS],
    ] as const) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(p, s);
      gl.deleteShader(s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link failed');
    this.prog = p;
    this.vao = gl.createVertexArray()!;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const name of ['uRes', 'uDpr', 'uSeed', 'uMode', 'uGrain', 'uVignette', 'uBase', 'uBlob', 'uTint']) {
      this.u[name] = gl.getUniformLocation(p, name);
    }
  }

  private use(mode: number, dpr: number) {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.u.uDpr, dpr);
    gl.uniform1i(this.u.uMode, mode);
  }

  /** Paint the whole canvas: base color, up to five color fields, vignette. */
  field(base: readonly number[], blobs: Blob[], vignette: number, dpr: number) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.use(0, dpr);
    this.tints.fill(0);
    blobs.slice(0, MAX_BLOBS).forEach((b, i) => {
      this.blobs.set([b.x, b.y, b.rx, b.ry], i * 4);
      this.tints.set([b.rgb[0], b.rgb[1], b.rgb[2], b.a], i * 4);
    });
    gl.uniform3f(this.u.uBase, base[0], base[1], base[2]);
    gl.uniform4fv(this.u.uBlob, this.blobs);
    gl.uniform4fv(this.u.uTint, this.tints);
    gl.uniform1f(this.u.uVignette, vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  /** Film grain over everything drawn so far; `seed` changes the pattern. */
  grain(amount: number, seed: number, dpr: number) {
    const gl = this.gl;
    this.use(1, dpr);
    gl.uniform1f(this.u.uGrain, amount);
    gl.uniform1ui(this.u.uSeed, seed >>> 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  dispose() {
    this.gl.deleteProgram(this.prog);
    this.gl.deleteVertexArray(this.vao);
  }
}

/** Grain pattern index: the grain changes 24 times a second, like film. Still frames keep one. */
export const grainSeed = (time: number, still: boolean) => (still ? 7 : Math.floor(time * 24) % 100000);

/** Seeded random in 0..1 (mulberry32). */
export function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 0..255 color to 0..1. */
export const c255 = (r: number, g: number, b: number): [number, number, number] => [r / 255, g / 255, b / 255];
