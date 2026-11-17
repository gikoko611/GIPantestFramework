'use strict';
/* validate.js — render 1 frame per scene, report image statistics */
const E = require('./engine.js');
const S = require('./shapes.js');
const SC = require('./scenes.js');
const { m4trs, m4mul, gBox, gPlane, buildMesh } = E;

const W = 854, H = 480;
const stage = {
  ground: buildMesh(new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]), new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), new Uint32Array([0, 2, 1, 0, 3, 2])),
  grid: buildMesh(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 0, 0.02, -1, 0, 0.02]), new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), new Uint32Array([0, 2, 1, 0, 3, 2])),
  particle: E.gSphere(1, 6, 4),
};

function stats(R, bg) {
  let n = 0, sr = 0, sg = 0, sb = 0, mn = 255, mx = 0;
  const hist = new Array(8).fill(0);
  for (let i = 0; i < W * H; i++) {
    const c = R.color[i];
    const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    const l = (r * 0.3 + g * 0.6 + b * 0.1);
    if (l < mn) mn = l;
    if (l > mx) mx = l;
    hist[Math.min(7, (l / 32) | 0)]++;
    if (c !== bg[i]) n++;
    sr += r; sg += g; sb += b;
  }
  const tot = W * H;
  return { nonbg: (100 * n / tot).toFixed(1), lum: (sr * 0.3 + sg * 0.6 + sb * 0.1).toFixed(1), min: mn | 0, max: mx | 0, hist: hist.map(v => (100 * v / tot).toFixed(0)).join('/') };
}

function makeBG(accent) {
  const b = new Uint32Array(W * H);
  for (let y = 0; y < H; y++) {
    const vt = y / H;
    const br = 6 + 10 * vt, bg = 10 + 18 * vt, bb = 20 + 30 * vt;
    for (let x = 0; x < W; x++) {
      const dx = (x - W * 0.5) / (W * 0.7), dy = (y - H * 0.66) / (H * 0.7);
      const glow = Math.exp(-(dx * dx + dy * dy) * 3.4) * 0.22;
      const r = br + accent[0] * 255 * glow, g = bg + accent[1] * 255 * glow, bl = bb + accent[2] * 255 * glow;
      b[y * W + x] = ((255 << 24) | ((Math.min(255, bl) | 0) << 16) | ((Math.min(255, g) | 0) << 8) | (Math.min(255, r) | 0)) >>> 0;
    }
  }
  return b;
}

const R = new E.Renderer(W, H);
let bad = 0;
for (let s = 0; s < SC.SCENES.length; s++) {
  const scene = SC.SCENES[s];
  R.setBackground(makeBG(scene.accent));
  R.clear();
  const t = 0.6;
  const c = SC.cam(scene.def, t);
  const view = E.m4lookAt(c.p, c.t, [0, 1, 0]);
  const proj = E.m4perspective((c.fov * Math.PI) / 180, W / H, 0.1, 120);
  const env = { view, proj, vp: E.m4mul(proj, view), camPos: c.p, lights: [{ dir: [0.45, 0.82, 0.35], col: [1, 0.97, 0.92], i: 1 }, { dir: [-0.65, 0.3, 0.55], col: [0.45, 0.65, 1], i: 0.55 }, { dir: [0.1, -0.35, -0.9], col: scene.accent, i: 0.5 }], fogColor: [0.02, 0.035, 0.07], fogStart: 7, fogEnd: 30 };
  let draws = 0;
  const hero = scene.hero(t) || [];
  for (const hp of hero) for (const pt of hp.parts) { R.draw(pt.mesh, m4mul(hp.world, pt.local), pt.mat, env, { cull: false }); draws++; }
  const st = stats(R, R.bg);
  const nan = Array.from(R.color.slice(0, 200)).some(v => Number.isNaN(v));
  console.log(String(s + 1).padStart(2), 'draws', String(draws).padStart(2), 'nonbg%', st.nonbg.padStart(5), 'lum', st.lum.padStart(6), 'max', String(st.max).padStart(4), 'hist', st.hist);
  if (parseFloat(st.nonbg) < 3) { console.log('   !! low coverage'); bad++; }
}
console.log(bad ? `WARNING: ${bad} scenes with low coverage` : 'all scenes have content');