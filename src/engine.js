'use strict';
/* ============================================================
   engine.js — minimal software 3D engine
   mat4 math / mesh primitives / z-buffered Gouraud rasterizer
   ============================================================ */

/* ---------------- mat4 (row-major, length 16) ---------------- */
function m4identity() {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}
function m4mul(a, b) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    const ai = i * 4;
    const a0 = a[ai], a1 = a[ai + 1], a2 = a[ai + 2], a3 = a[ai + 3];
    for (let j = 0; j < 4; j++) {
      o[ai + j] = a0 * b[j] + a1 * b[4 + j] + a2 * b[8 + j] + a3 * b[12 + j];
    }
  }
  return o;
}
function m4perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}
function m4lookAt(eye, center, up) {
  let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const m = new Float32Array(16);
  m[0] = xx; m[1] = xy; m[2] = xz; m[3] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  m[4] = yx; m[5] = yy; m[6] = yz; m[7] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  m[8] = zx; m[9] = zy; m[10] = zz; m[11] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  m[15] = 1;
  return m;
}
function m4trs(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
  if (sx === undefined) sx = 1;
  if (sy === undefined) sy = 1;
  if (sz === undefined) sz = 1;
  // R = Rz * Ry * Rx  (degrees)
  const cx = Math.cos(rx * Math.PI / 180), sxr = Math.sin(rx * Math.PI / 180);
  const cy = Math.cos(ry * Math.PI / 180), syr = Math.sin(ry * Math.PI / 180);
  const cz = Math.cos(rz * Math.PI / 180), szr = Math.sin(rz * Math.PI / 180);
  // Rx
  const m = new Float32Array(16);
  // R = Rz*Ry*Rx
  const r00 = cz * cy, r01 = cz * syr * sxr - szr * cx, r02 = cz * syr * cx + szr * sxr;
  const r10 = szr * cy, r11 = szr * syr * sxr + cz * cx, r12 = szr * syr * cx - cz * sxr;
  const r20 = -syr, r21 = cy * sxr, r22 = cy * cx;
  m[0] = r00 * sx; m[1] = r01 * sy; m[2] = r02 * sz; m[3] = tx;
  m[4] = r10 * sx; m[5] = r11 * sy; m[6] = r12 * sz; m[7] = ty;
  m[8] = r20 * sx; m[9] = r21 * sy; m[10] = r22 * sz; m[11] = tz;
  m[15] = 1;
  return m;
}
function m4normal(mat3src, m) {
  // rotation part of model matrix, normalized per row-ish; assume TRS
  return m;
}
function xfP(m, x, y, z, out) {
  out[0] = m[0] * x + m[1] * y + m[2] * z + m[3];
  out[1] = m[4] * x + m[5] * y + m[6] * z + m[7];
  out[2] = m[8] * x + m[9] * y + m[10] * z + m[11];
  return out;
}
function xfDir(m, x, y, z, out) {
  out[0] = m[0] * x + m[1] * y + m[2] * z;
  out[1] = m[4] * x + m[5] * y + m[6] * z;
  out[2] = m[8] * x + m[9] * y + m[10] * z;
  return out;
}

/* ---------------- geometry primitives ---------------- */
function buildMesh(pos, nrm, idx) {
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    idx: new Uint32Array(idx),
    vcount: pos.length / 3,
    icount: idx.length,
  };
}
function gBox(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  const p = [], n = [], i = [];
  const faces = [
    { n: [0, 0, 1], v: [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]] },
    { n: [0, 0, -1], v: [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]] },
    { n: [1, 0, 0], v: [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]] },
    { n: [-1, 0, 0], v: [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]] },
    { n: [0, 1, 0], v: [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]] },
    { n: [0, -1, 0], v: [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]] },
  ];
  for (const f of faces) {
    const b = p.length / 3;
    for (const v of f.v) { p.push(v[0], v[1], v[2]); n.push(f.n[0], f.n[1], f.n[2]); }
    i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return buildMesh(p, n, i);
}
function gSphere(r, seg, rings) {
  const p = [], n = [], i = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, phi = v * Math.PI;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, th = u * Math.PI * 2;
      const nx = sp * Math.cos(th), ny = cp, nz = sp * Math.sin(th);
      p.push(nx * r, ny * r, nz * r);
      n.push(nx, ny, nz);
    }
  }
  const row = seg + 1;
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) {
      const a = y * row + x, b = a + 1, c = a + row, d = c + 1;
      i.push(a, c, b, b, c, d);
    }
  }
  return buildMesh(p, n, i);
}
function gCylinder(r1, r2, h, seg, caps) {
  const p = [], n = [], i = [];
  const hy = h / 2;
  const slope = (r1 - r2) / h;
  for (let x = 0; x <= seg; x++) {
    const th = (x / seg) * Math.PI * 2;
    const ct = Math.cos(th), st = Math.sin(th);
    // side top (r2) & bottom (r1)
    let nx = ct, ny = slope, nz = st;
    let l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    p.push(ct * r1, -hy, st * r1); n.push(nx, ny, nz);
    p.push(ct * r2, hy, st * r2); n.push(nx, ny, nz);
  }
  for (let x = 0; x < seg; x++) {
    const a = x * 2, b = a + 1, c = a + 2, d = a + 3;
    i.push(a, c, b, b, c, d);
  }
  if (caps && r2 > 0.0001) {
    let base = p.length / 3;
    p.push(0, hy, 0); n.push(0, 1, 0);
    for (let x = 0; x <= seg; x++) {
      const th = (x / seg) * Math.PI * 2;
      p.push(Math.cos(th) * r2, hy, Math.sin(th) * r2); n.push(0, 1, 0);
    }
    for (let x = 0; x < seg; x++) i.push(base, base + 1 + x, base + 2 + x);
  }
  if (caps && r1 > 0.0001) {
    let base = p.length / 3;
    p.push(0, -hy, 0); n.push(0, -1, 0);
    for (let x = 0; x <= seg; x++) {
      const th = (x / seg) * Math.PI * 2;
      p.push(Math.cos(th) * r1, -hy, Math.sin(th) * r1); n.push(0, -1, 0);
    }
    for (let x = 0; x < seg; x++) i.push(base, base + 1 + x, base + 2 + x);
  }
  return buildMesh(p, n, i);
}
function gCone(r, h, seg) { return gCylinder(r, 0.0001, h, seg, true); }
function gPlane(w, d, sx, sz) {
  const p = [], n = [], i = [];
  for (let z = 0; z <= sz; z++) {
    for (let x = 0; x <= sx; x++) {
      p.push((x / sx - 0.5) * w, 0, (z / sz - 0.5) * d);
      n.push(0, 1, 0);
    }
  }
  const row = sx + 1;
  for (let z = 0; z < sz; z++) {
    for (let x = 0; x < sx; x++) {
      const a = z * row + x, b = a + 1, c = a + row, dd = c + 1;
      i.push(a, c, b, b, c, dd);
    }
  }
  return buildMesh(p, n, i);
}
function gTorus(R, r, su, sv) {
  const p = [], n = [], i = [];
  for (let u = 0; u <= su; u++) {
    const tu = (u / su) * Math.PI * 2, cu = Math.cos(tu), suu = Math.sin(tu);
    for (let v = 0; v <= sv; v++) {
      const tv = (v / sv) * Math.PI * 2, cv = Math.cos(tv), svv = Math.sin(tv);
      const nx = cu * cv, ny = svv, nz = suu * cv;
      p.push((R + r * cv) * cu, r * svv, (R + r * cv) * suu);
      n.push(nx, ny, nz);
    }
  }
  const row = sv + 1;
  for (let u = 0; u < su; u++) {
    for (let v = 0; v < sv; v++) {
      const a = u * row + v, b = a + 1, c = a + row, d = c + 1;
      i.push(a, c, b, b, c, d);
    }
  }
  return buildMesh(p, n, i);
}
function gRing(ri, ro, seg) {
  const p = [], n = [], i = [];
  for (let x = 0; x <= seg; x++) {
    const th = (x / seg) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    p.push(c * ri, 0, s * ri); n.push(0, 1, 0);
    p.push(c * ro, 0, s * ro); n.push(0, 1, 0);
  }
  for (let x = 0; x < seg; x++) {
    const a = x * 2, b = a + 1, c = a + 2, d = a + 3;
    i.push(a, c, b, b, c, d);
  }
  return buildMesh(p, n, i);
}
/* signed area of 2D polygon (positive = CCW) */
function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function pointInTri(p, a, b, c) {
  const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
  const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
  const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}
function triangulate(pts) {
  const n = pts.length, idx = [];
  for (let i = 0; i < n; i++) idx.push(i);
  const out = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 4000) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k - 1 + idx.length) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cr <= 1e-9) continue;
      let ok = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (pointInTri(pts[j], a, b, c)) { ok = false; break; }
      }
      if (!ok) continue;
      out.push(i0, i1, i2);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}
/* extrude a 2D polygon ([[x,y],...]) along Z by `depth`, centered */
function gExtrude(points, depth) {
  let pts = points.map(p => [p[0], p[1]]);
  if (polyArea(pts) < 0) pts.reverse();
  const hz = depth / 2;
  const pos = [], nrm = [], idx = [];
  const N = pts.length;
  // front (+z)
  const frontStart = pos.length / 3;
  for (const p of pts) { pos.push(p[0], p[1], hz); nrm.push(0, 0, 1); }
  const ftri = triangulate(pts);
  for (let t = 0; t < ftri.length; t += 3) idx.push(frontStart + ftri[t], frontStart + ftri[t + 1], frontStart + ftri[t + 2]);
  // back (-z), reversed winding
  const backStart = pos.length / 3;
  for (const p of pts) { pos.push(p[0], p[1], -hz); nrm.push(0, 0, -1); }
  for (let t = 0; t < ftri.length; t += 3) idx.push(backStart + ftri[t], backStart + ftri[t + 2], backStart + ftri[t + 1]);
  // walls
  for (let k = 0; k < N; k++) {
    const a = pts[k], b = pts[(k + 1) % N];
    let ex = b[0] - a[0], ey = b[1] - a[1];
    const l = Math.hypot(ex, ey) || 1; ex /= l; ey /= l;
    const nx = ey, ny = -ex; // outward for CCW
    const s = pos.length / 3;
    pos.push(a[0], a[1], hz); nrm.push(nx, ny, 0);
    pos.push(b[0], b[1], hz); nrm.push(nx, ny, 0);
    pos.push(a[0], a[1], -hz); nrm.push(nx, ny, 0);
    pos.push(b[0], b[1], -hz); nrm.push(nx, ny, 0);
    idx.push(s, s + 2, s + 1, s + 1, s + 2, s + 3);
  }
  return buildMesh(pos, nrm, idx);
}
function gGridLines(size, step) {
  // thin boxes forming a grid — returns mesh in XZ plane
  const t = 0.012, h = 0.001;
  const parts = [];
  const count = Math.round(size / step);
  for (let k = -count; k <= count; k++) {
    const o = k * step;
    parts.push({ m: m4trs(0, 0, o, 0, 0, 0, size * 2, h, t) });
    parts.push({ m: m4trs(o, 0, 0, 0, 0, 0, t, h, size * 2) });
  }
  return parts; // handled by scene as many thin boxes
}

/* ---------------- rasterizer ---------------- */
function packRGB(r, g, b) {
  return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) (r & 255);
}
// (kept simple / explicit to avoid precedence mistakes)
function pack(r, g, b) {
  return (255 << 24) | ((clamp255(b)) << 16) | ((clamp255(g)) << 8) | (clamp255(r));
}
function clamp255(v) { v = v | 0; return v < 0 ? 0 : v > 255 ? 255 : v; }

class Renderer {
  constructor(W, H) {
    this.W = W; this.H = H;
    this.color = new Uint32Array(W * H);
    this.depth = new Float32Array(W * H);
    this.vx = new Float32Array(3 * 3 * 3); // scratch
    this.bgCtx = null;
  }
  setBackground(u32buf) { this.bg = u32buf; }
  clear() {
    this.color.set(this.bg);
    this.depth.fill(Infinity);
  }
  /**
   * draw a mesh instance
   * mesh : geometry
   * model : mat4
   * mat  : {color:[r,g,b] 0..1, emissive:0..1, spec:0..1, shin:1..200, ambient:0..1}
   * env  : {viewProj, camPos, lights:[{dir:[x,y,z], col:[r,g,b], i}], fogColor:[r,g,b], fogStart, fogEnd}
   * opts : {cull:true/false}
   */
  draw(mesh, model, mat, env, opts) {
    const W = this.W, H = this.H;
    const col = this.color, dep = this.depth;
    const n = mesh.vcount;
    const P = mesh.pos, N = mesh.nrm, I = mesh.idx;
    const vp = env.vp;
    // scratch arrays reused via closure-level fields
    if (!this._sx) {
      this._sx = new Float32Array(n * 3);
      this._sz = new Float32Array(n);
      this._scr = new Float32Array(n * 3);
      this._ok = new Uint8Array(n);
    }
    if (this._sx.length < n * 3) {
      this._sx = new Float32Array(n * 3);
      this._sz = new Float32Array(n);
      this._scr = new Float32Array(n * 3);
      this._ok = new Uint8Array(n);
    }
    const SX = this._sx, SZ = this._sz, SC = this._scr, OK = this._ok;
    const wp = this._wp || (this._wp = new Float32Array(3));
    const wn = this._wn || (this._wn = new Float32Array(3));
    const view = env.view;
    const lights = env.lights;
    const nl = lights.length;
    const baseR = mat.color[0], baseG = mat.color[1], baseB = mat.color[2];
    const amb = mat.ambient !== undefined ? mat.ambient : 0.28;
    const specK = mat.spec !== undefined ? mat.spec : 0.35;
    const shin = mat.shin !== undefined ? mat.shin : 32;
    const emissive = mat.emissive || 0;
    const fogC = env.fogColor, fogS = env.fogStart, fogE = env.fogEnd;
    const dim = this.dim === undefined ? 1 : this.dim;
    const cam = env.camPos;
    const m0 = model[0], m1 = model[1], m2 = model[2];
    const m4 = model[4], m5 = model[5], m6 = model[6];
    const m8 = model[8], m9 = model[9], m10 = model[10];
    const m12 = model[3], m13 = model[7], m14 = model[11];
    // ---- transform + shade vertices ----
    for (let vi = 0; vi < n; vi++) {
      const px = P[vi * 3], py = P[vi * 3 + 1], pz = P[vi * 3 + 2];
      const wx = m0 * px + m1 * py + m2 * pz + m12;
      const wy = m4 * px + m5 * py + m6 * pz + m13;
      const wz = m8 * px + m9 * py + m10 * pz + m14;
      // normal (rotation part)
      let nx = m0 * N[vi * 3] + m1 * N[vi * 3 + 1] + m2 * N[vi * 3 + 2];
      let ny = m4 * N[vi * 3] + m5 * N[vi * 3 + 1] + m6 * N[vi * 3 + 2];
      let nz = m8 * N[vi * 3] + m9 * N[vi * 3 + 1] + m10 * N[vi * 3 + 2];
      const nl2 = Math.hypot(nx, ny, nz) || 1; nx /= nl2; ny /= nl2; nz /= nl2;
      // view space
      const vx = view[0] * wx + view[1] * wy + view[2] * wz + view[3];
      const vy = view[4] * wx + view[5] * wy + view[6] * wz + view[7];
      const vz = view[8] * wx + view[9] * wy + view[10] * wz + view[11];
      // clip
      const cw = -vz;
      if (cw <= 0.01) { OK[vi] = 0; continue; }
      const cx = vp[0] * wx + vp[1] * wy + vp[2] * wz + vp[3];
      const cy = vp[4] * wx + vp[5] * wy + vp[6] * wz + vp[7];
      const ccz = vp[8] * wx + vp[9] * wy + vp[10] * wz + vp[11];
      const iw = 1 / cw;
      SX[vi * 3] = ((cx * iw) * 0.5 + 0.5) * W;
      SX[vi * 3 + 1] = (1 - ((cy * iw) * 0.5 + 0.5)) * H;
      SZ[vi] = -vz;
      OK[vi] = 1;
      // lighting
      let lr = amb, lg = amb, lb = amb;
      // view dir (approx from world pos to cam)
      let vx2 = cam[0] - wx, vy2 = cam[1] - wy, vz2 = cam[2] - wz;
      const vl = Math.hypot(vx2, vy2, vz2) || 1; vx2 /= vl; vy2 /= vl; vz2 /= vl;
      for (let li = 0; li < nl; li++) {
        const L = lights[li];
        const lx = L.dir[0], ly = L.dir[1], lz = L.dir[2];
        let diff = nx * lx + ny * ly + nz * lz;
        if (diff < 0) diff = 0;
        const lc = L.col, li2 = L.i;
        lr += diff * lc[0] * li2; lg += diff * lc[1] * li2; lb += diff * lc[2] * li2;
        if (specK > 0) {
          let hx = lx + vx2, hy = ly + vy2, hz = lz + vz2;
          const hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
          let sp = nx * hx + ny * hy + nz * hz;
          if (sp < 0) sp = 0;
          sp = Math.pow(sp, shin) * specK * li2;
          lr += sp * lc[0]; lg += sp * lc[1]; lb += sp * lc[2];
        }
      }
      let r = (baseR * lr + emissive * baseR * 1.6) * 255;
      let g = (baseG * lg + emissive * baseG * 1.6) * 255;
      let b = (baseB * lb + emissive * baseB * 1.6) * 255;
      // emissive boost
      if (emissive > 0) { r += emissive * 140; g += emissive * 140; b += emissive * 140; }
      // fog by view distance
      const dist = -vz;
      let f = (dist - fogS) / (fogE - fogS);
      f = f < 0 ? 0 : f > 1 ? 1 : f;
      r = r + (fogC[0] * 255 - r) * f;
      g = g + (fogC[1] * 255 - g) * f;
      b = b + (fogC[2] * 255 - b) * f;
      if (dim !== 1) { r *= dim; g *= dim; b *= dim; }
      SC[vi * 3] = r; SC[vi * 3 + 1] = g; SC[vi * 3 + 2] = b;
    }
    // ---- rasterize ----
    const cull = opts && opts.cull;
    const cullSign = (opts && opts.cullSign) || 1;
    const idxCount = I.length;
    for (let t = 0; t < idxCount; t += 3) {
      const i0 = I[t], i1 = I[t + 1], i2 = I[t + 2];
      if (!OK[i0] || !OK[i1] || !OK[i2]) continue;
      const x0 = SX[i0 * 3], y0 = SX[i0 * 3 + 1], z0 = SZ[i0];
      const x1 = SX[i1 * 3], y1 = SX[i1 * 3 + 1], z1 = SZ[i1];
      const x2 = SX[i2 * 3], y2 = SX[i2 * 3 + 1], z2 = SZ[i2];
      let area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
      if (area === 0) continue;
      if (cull) { if (area * cullSign <= 0) continue; }
      // bbox
      let minx = Math.floor(Math.min(x0, x1, x2));
      let maxx = Math.ceil(Math.max(x0, x1, x2));
      let miny = Math.floor(Math.min(y0, y1, y2));
      let maxy = Math.ceil(Math.max(y0, y1, y2));
      if (maxx < 0 || minx >= W || maxy < 0 || miny >= H) continue;
      if (minx < 0) minx = 0; if (miny < 0) miny = 0;
      if (maxx >= W) maxx = W - 1; if (maxy >= H) maxy = H - 1;
      if (minx > maxx || miny > maxy) continue;
      const inv = 1 / area;
      // barycentric increments
      const dy1 = y1 - y2, dx2 = x2 - x1;
      const dy2 = y2 - y0, dx0 = x0 - x2;
      const a0dx = dy1 * inv, a0dy = dx2 * inv;
      const a1dx = dy2 * inv, a1dy = dx0 * inv;
      let w0 = (dy1 * (minx + 0.5 - x2) + dx2 * (miny + 0.5 - y2)) * inv;
      let w1 = (dy2 * (minx + 0.5 - x2) + dx0 * (miny + 0.5 - y2)) * inv;
      let w2 = 1 - w0 - w1;
      const c0r = SC[i0 * 3], c0g = SC[i0 * 3 + 1], c0b = SC[i0 * 3 + 2];
      const c1r = SC[i1 * 3], c1g = SC[i1 * 3 + 1], c1b = SC[i1 * 3 + 2];
      const c2r = SC[i2 * 3], c2g = SC[i2 * 3 + 1], c2b = SC[i2 * 3 + 2];
      for (let y = miny; y <= maxy; y++) {
        let a0 = w0, a1 = w1, a2 = w2;
        let idx = y * W + minx;
        for (let x = minx; x <= maxx; x++, idx++, a0 += a0dx, a1 += a1dx, a2 = 1 - a0 - a1) {
          if (a0 < 0 || a1 < 0 || a2 < 0) continue;
          const z = a0 * z0 + a1 * z1 + a2 * z2;
          if (z >= dep[idx]) continue;
          dep[idx] = z;
          const r = a0 * c0r + a1 * c1r + a2 * c2r;
          const g = a0 * c0g + a1 * c1g + a2 * c2g;
          const b = a0 * c0b + a1 * c1b + a2 * c2b;
          col[idx] = (255 << 24) | ((b < 0 ? 0 : b > 255 ? 255 : b) << 16) |
            ((g < 0 ? 0 : g > 255 ? 255 : g) << 8) |
            (r < 0 ? 0 : r > 255 ? 255 : r);
        }
        w0 += a0dy; w1 += a1dy;
      }
    }
  }
}

module.exports = {
  m4identity, m4mul, m4perspective, m4lookAt, m4trs, xfDir, xfP,
  gBox, gSphere, gCylinder, gCone, gPlane, gTorus, gRing, gGridLines, buildMesh,
  gExtrude, triangulate, polyArea,
  Renderer,
};