'use strict';
/* logo.js — draw the watermark icon (shield + check) into a PNG */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- minimal PNG writer ---------- */
const CRC_T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function writePNG(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

/* ---------- SDF helpers (y-down canvas coords) ---------- */
function polySDF(px, py, pts) {
  let d = Infinity, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    const ex = xj - xi, ey = yj - yi;
    const l2 = ex * ex + ey * ey || 1;
    let t = ((px - xi) * ex + (py - yi) * ey) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - (xi + t * ex), dy = py - (yi + t * ey);
    const dd = dx * dx + dy * dy;
    if (dd < d) d = dd;
  }
  d = Math.sqrt(d);
  return inside ? -d : d;
}
function segDist(px, py, ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay;
  const l2 = ex * ex + ey * ey || 1;
  let t = ((px - ax) * ex + (py - ay) * ey) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * ex), py - (ay + t * ey));
}
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/* ---------- draw ---------- */
const SIZE = 44;
const SS = 4;
const W = SIZE * SS;

/* shield outline in canvas-normalised coords (y down) */
const SH = [[-0.56, -0.58], [0.56, -0.58], [0.56, 0.02], [0.40, 0.34], [0.0, 0.64], [-0.40, 0.34], [-0.56, 0.02]]
  .map(([x, y]) => [x * 0.86, y * 0.86]);

const rgba = Buffer.alloc(W * W * 4);
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const px = (x + 0.5) / W - 0.5;
    const py = (y + 0.5) / W - 0.5;
    const d = polySDF(px, py, SH);           // <0 inside
    let cov = 1 - smooth(-0.006, 0.006, d);
    if (cov <= 0) continue;

    /* vertical gradient fill */
    const g = Math.max(0, Math.min(1, (py + 0.64) / 1.28));
    let r = 62 + (30 - 62) * g;
    let gg = 224 + (123 - 224) * g;
    let b = 255 + (255 - 255) * g;

    /* inner rim highlight */
    if (d > -0.035) { r = r * 0.6 + 255 * 0.4; gg = gg * 0.6 + 255 * 0.4; b = b * 0.6 + 255 * 0.4; }

    /* check mark */
    const cd = Math.min(
      segDist(px, py, -0.20, 0.01, -0.03, 0.17),
      segDist(px, py, -0.03, 0.17, 0.25, -0.17)
    );
    const checkCov = 1 - smooth(0.055, 0.085, cd);
    if (checkCov > 0) {
      r = r * (1 - checkCov) + 255 * checkCov;
      gg = gg * (1 - checkCov) + 255 * checkCov;
      b = b * (1 - checkCov) + 255 * checkCov;
    }

    const i = (y * W + x) * 4;
    rgba[i] = r | 0; rgba[i + 1] = gg | 0; rgba[i + 2] = b | 0;
    rgba[i + 3] = Math.round(cov * 255);
  }
}

/* box-downsample SS -> SIZE */
const out = Buffer.alloc(SIZE * SIZE * 4);
const inv = 1 / (SS * SS);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * W + (x * SS + dx)) * 4;
        const al = rgba[i + 3];
        r += rgba[i] * al; g += rgba[i + 1] * al; b += rgba[i + 2] * al; a += al;
      }
    }
    const o = (y * SIZE + x) * 4;
    if (a > 0) {
      out[o] = Math.min(255, Math.round(r / a));
      out[o + 1] = Math.min(255, Math.round(g / a));
      out[o + 2] = Math.min(255, Math.round(b / a));
    }
    out[o + 3] = Math.round(a * inv);
  }
}

const p = path.join(__dirname, '..', 'build', 'logo.png');
fs.mkdirSync(path.dirname(p), { recursive: true });
writePNG(p, SIZE, SIZE, out);
console.log('logo.png written', SIZE + 'x' + SIZE);