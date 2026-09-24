/*
 * Minimal WebGL2 batcher for the visuals: antialiased lines (solid or dashed),
 * circles (filled, ring, soft disc or gaussian glow) and antialiased
 * four-corner fills, in device pixels, drawn as instanced quads. Scenes do
 * their own projection on the CPU and push 2D shapes here each frame. Colors
 * are straight RGB 0..1; the shaders premultiply.
 */

/*
 * Fills: each instance carries its four corners. The vertex shader grows the
 * quad by 1 device px (every edge moves out along its normal) and hands the
 * fragment shader the signed distance to each edge, so coverage is exact
 * along every edge at any angle.
 */
const FILL_VS = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 ab;
layout(location=2) in vec4 cd;
layout(location=3) in vec4 paint;
uniform vec2 uRes;
out vec4 vPaint;
out vec4 vEdge;
void main() {
  vec2 p[4] = vec2[4](ab.xy, ab.zw, cd.xy, cd.zw);
  float area = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 a = p[k];
    vec2 b = p[(k + 1) % 4];
    area += a.x * b.y - b.x * a.y;
  }
  float s = area < 0.0 ? -1.0 : 1.0;
  vec2 n[4];
  bool ok[4];
  for (int k = 0; k < 4; k++) {
    vec2 d = p[(k + 1) % 4] - p[k];
    float l = length(d);
    ok[k] = l > 1e-3;
    n[k] = ok[k] ? s * vec2(-d.y, d.x) / l : vec2(0.0);
  }
  int i = int(corner.x + 0.5);
  vec2 o = -n[(i + 3) % 4] - n[i];
  float den = 1.0 + dot(n[(i + 3) % 4], n[i]);
  o = den > 0.05 ? o / den : o;
  float ol = length(o);
  if (ol > 4.0) o *= 4.0 / ol;
  vec2 q = p[i] + o;
  float e[4];
  for (int k = 0; k < 4; k++) e[k] = ok[k] ? dot(q - p[k], n[k]) : 1e4;
  vEdge = vec4(e[0], e[1], e[2], e[3]);
  vPaint = paint;
  vec2 c = q / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const FILL_FS = `#version 300 es
precision highp float;
in vec4 vPaint;
in vec4 vEdge;
out vec4 color;
void main() {
  float a = vPaint.a * clamp(min(min(vEdge.x, vEdge.y), min(vEdge.z, vEdge.w)) + 0.5, 0.0, 1.0);
  color = vec4(vPaint.rgb * a, a);
}`;

const FILL_FLOATS = 12;

const LINE_VS = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 ends;
layout(location=2) in vec4 paint;
layout(location=3) in vec2 alphas;
layout(location=4) in vec3 dash;
uniform vec2 uRes;
out vec3 vRgb;
out float vAlpha;
out float vDist;
out float vAlong;
flat out float vWidth;
flat out vec3 vDash;
void main() {
  vec2 d = ends.zw - ends.xy;
  float len = length(d);
  vec2 t = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  float h = max(paint.w, 1.0) * 0.5 + 1.0;
  vec2 p = ends.xy + d * corner.x + n * corner.y * h;
  vDist = corner.y * h;
  vAlong = corner.x * len;
  vWidth = paint.w;
  vDash = dash;
  vRgb = paint.rgb;
  vAlpha = mix(alphas.x, alphas.y, corner.x);
  vec2 c = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const LINE_FS = `#version 300 es
precision highp float;
in vec3 vRgb;
in float vAlpha;
in float vDist;
in float vAlong;
flat in float vWidth;
flat in vec3 vDash;
out vec4 color;
void main() {
  float w = max(vWidth, 1.0);
  float a = vAlpha * clamp(w * 0.5 + 0.5 - abs(vDist), 0.0, 1.0) * (vWidth / w);
  if (vDash.x > 0.0) {
    float per = vDash.x + vDash.y;
    float m = mod(vAlong + vDash.z, per);
    a *= clamp(max(min(m, vDash.x - m), m - per) + 0.5, 0.0, 1.0);
  }
  color = vec4(vRgb * a, a);
}`;

/** `ring` value that marks a gaussian glow instead of a disc or ring. */
const GLOW = 9000;

const DOT_VS = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 geo;
layout(location=2) in vec4 paint;
uniform vec2 uRes;
out vec2 vLocal;
out vec2 vShape;
out vec4 vPaint;
void main() {
  float ext = geo.w > 8000.0 ? geo.z * 1.4 : geo.z + abs(geo.w) * 0.5 + 1.5;
  vLocal = corner * ext;
  vShape = geo.zw;
  vPaint = paint;
  vec2 c = (geo.xy + vLocal) / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

const DOT_FS = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vShape;
in vec4 vPaint;
out vec4 color;
void main() {
  float d = length(vLocal);
  float cov;
  if (vShape.y > 8000.0) {
    float u = d / max(vShape.x, 1e-3);
    cov = max(exp(-3.0 * u * u) - 0.0028, 0.0);
  } else if (vShape.y > 0.0) {
    cov = clamp(vShape.y * 0.5 + 0.5 - abs(d - vShape.x), 0.0, 1.0);
  } else if (vShape.y < 0.0) {
    cov = 1.0 - smoothstep(vShape.x + vShape.y * 0.5, vShape.x - vShape.y * 0.5, d);
  } else {
    cov = clamp(vShape.x + 0.5 - d, 0.0, 1.0);
  }
  float a = vPaint.a * cov;
  color = vec4(vPaint.rgb * a, a);
}`;

const LINE_FLOATS = 13;
const DOT_FLOATS = 8;

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
    gl.deleteShader(s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link failed');
  return p;
}

interface Batch {
  prog: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buf: WebGLBuffer;
  corners: WebGLBuffer;
  res: WebGLUniformLocation | null;
  data: Float32Array;
  stride: number;
  count: number;
}

function batch(
  gl: WebGL2RenderingContext,
  vs: string,
  fs: string,
  corners: number[],
  stride: number,
  max: number,
  attribs: number[],
): Batch {
  const prog = program(gl, vs, fs);
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const cornerBuf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const data = new Float32Array(max * stride);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  let offset = 0;
  attribs.forEach((size, i) => {
    gl.enableVertexAttribArray(i + 1);
    gl.vertexAttribPointer(i + 1, size, gl.FLOAT, false, stride * 4, offset * 4);
    gl.vertexAttribDivisor(i + 1, 1);
    offset += size;
  });
  gl.bindVertexArray(null);
  return { prog, vao, buf, corners: cornerBuf, res: gl.getUniformLocation(prog, 'uRes'), data, stride, count: 0 };
}

export class Shapes {
  private lines: Batch;
  private dots: Batch;
  private fills: Batch | null;
  private w = 1;
  private h = 1;

  constructor(
    private gl: WebGL2RenderingContext,
    maxLines: number,
    maxDots: number,
    maxFills = 0,
  ) {
    this.lines = batch(gl, LINE_VS, LINE_FS, [0, -1, 0, 1, 1, -1, 1, 1], LINE_FLOATS, maxLines, [4, 4, 2, 3]);
    this.dots = batch(gl, DOT_VS, DOT_FS, [-1, -1, 1, -1, -1, 1, 1, 1], DOT_FLOATS, maxDots, [4, 4]);
    // strip order a, b, d, c turns the corners a b c d (in turn) into two triangles
    this.fills = maxFills > 0 ? batch(gl, FILL_VS, FILL_FS, [0, 0, 1, 0, 3, 0, 2, 0], FILL_FLOATS, maxFills, [4, 4, 4]) : null;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
  }

  /** Start a frame: clear to transparent and set the target size in device pixels. */
  begin(width: number, height: number) {
    const gl = this.gl;
    this.w = width;
    this.h = height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Line from a to b, `width` in device px, alpha ramps from `a0` at a to `a1`
   * at b. With `dash` > 0 the line is dashed: `dash` px on, `gap` px off,
   * shifted along the line by `phase` px (animate it to march the dashes).
   */
  line(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    width: number,
    rgb: readonly number[],
    a0: number,
    a1: number,
    dash = 0,
    gap = 0,
    phase = 0,
  ) {
    const b = this.lines;
    if ((b.count + 1) * b.stride > b.data.length) return;
    const o = b.count++ * b.stride;
    const d = b.data;
    d[o] = ax;
    d[o + 1] = ay;
    d[o + 2] = bx;
    d[o + 3] = by;
    d[o + 4] = rgb[0];
    d[o + 5] = rgb[1];
    d[o + 6] = rgb[2];
    d[o + 7] = width;
    d[o + 8] = a0;
    d[o + 9] = a1;
    d[o + 10] = dash;
    d[o + 11] = gap;
    d[o + 12] = phase;
  }

  /**
   * Filled circle, or a ring of `ring` device px stroke when ring > 0. A
   * negative `ring` draws a soft (out of focus) disc whose edge fades over
   * -ring device px, centred on `radius`.
   */
  circle(x: number, y: number, radius: number, rgb: readonly number[], alpha: number, ring = 0) {
    const b = this.dots;
    if ((b.count + 1) * b.stride > b.data.length) return;
    const o = b.count++ * b.stride;
    const d = b.data;
    d[o] = x;
    d[o + 1] = y;
    d[o + 2] = radius;
    d[o + 3] = ring;
    d[o + 4] = rgb[0];
    d[o + 5] = rgb[1];
    d[o + 6] = rgb[2];
    d[o + 7] = alpha;
  }

  /**
   * Soft light: `alpha * exp(-3 d^2 / radius^2)`, fading to nothing at 1.4
   * radius. Shares the circle batch (count it in `maxDots`); for lights only,
   * keep radii small (fill rate).
   */
  glow(x: number, y: number, radius: number, rgb: readonly number[], alpha: number) {
    this.circle(x, y, radius, rgb, alpha, GLOW);
  }

  /** Fill of the convex four-corner shape a b c d (corners in turn), antialiased along every edge. */
  fill(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number,
    rgb: readonly number[],
    alpha: number,
  ) {
    const b = this.fills;
    if (!b || (b.count + 1) * b.stride > b.data.length) return;
    const o = b.count++ * b.stride;
    const d = b.data;
    d[o] = ax;
    d[o + 1] = ay;
    d[o + 2] = bx;
    d[o + 3] = by;
    d[o + 4] = cx;
    d[o + 5] = cy;
    d[o + 6] = dx;
    d[o + 7] = dy;
    d[o + 8] = rgb[0];
    d[o + 9] = rgb[1];
    d[o + 10] = rgb[2];
    d[o + 11] = alpha;
  }

  private batches() {
    return this.fills ? [this.fills, this.lines, this.dots] : [this.lines, this.dots];
  }

  /** Draw everything queued since the last flush: fills first, then lines, then circles. */
  flush() {
    for (const b of this.batches()) {
      if (!b.count) continue;
      const gl = this.gl;
      gl.useProgram(b.prog);
      gl.uniform2f(b.res, this.w, this.h);
      gl.bindVertexArray(b.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.data, 0, b.count * b.stride);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b.count);
      b.count = 0;
    }
    this.gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    for (const b of this.batches()) {
      gl.deleteBuffer(b.buf);
      gl.deleteBuffer(b.corners);
      gl.deleteVertexArray(b.vao);
      gl.deleteProgram(b.prog);
    }
  }
}

/** '#rrggbb' or '#rgb' (the CSS minifier shortens tokens) to [r, g, b] in 0..1. */
export const rgb = (hex: string): [number, number, number] => {
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
