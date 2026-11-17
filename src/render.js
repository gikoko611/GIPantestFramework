'use strict';
/* render.js — renders all 30 scenes to raw RGBA frames on stdout */
const E = require('./engine.js');
const S = require('./shapes.js');
const SC = require('./scenes.js');
const { m4trs, m4mul, gBox, gSphere, gPlane, buildMesh } = E;

const W = 854, H = 480;
const FPS = 24;
const SCENE_SEC = 10;
const SCENE_FRAMES = FPS * SCENE_SEC;
const MAX_SCENES = process.env.LIMIT_SCENES ? parseInt(process.env.LIMIT_SCENES, 10) : SC.SCENES.length;
const MAX_FRAMES = process.env.LIMIT_FRAMES ? parseInt(process.env.LIMIT_FRAMES, 10) : SCENE_FRAMES;

/* ---- merge helper ---- */
function mergeParts(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.mesh.vcount; ni += p.mesh.icount; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3);
  const idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  const tmp = [0, 0, 0];
  for (const p of parts) {
    const m = p.matrix || m4trs(0, 0, 0, 0, 0, 0, 1, 1, 1);
    const mp = p.mesh;
    for (let i = 0; i < mp.vcount; i++) {
      const x = mp.pos[i * 3], y = mp.pos[i * 3 + 1], z = mp.pos[i * 3 + 2];
      pos[(vo + i) * 3] = m[0] * x + m[1] * y + m[2] * z + m[3];
      pos[(vo + i) * 3 + 1] = m[4] * x + m[5] * y + m[6] * z + m[7];
      pos[(vo + i) * 3 + 2] = m[8] * x + m[9] * y + m[10] * z + m[11];
      const nx = mp.nrm[i * 3], ny = mp.nrm[i * 3 + 1], nz = mp.nrm[i * 3 + 2];
      let ax = m[0] * nx + m[1] * ny + m[2] * nz;
      let ay = m[4] * nx + m[5] * ny + m[6] * nz;
      let az = m[8] * nx + m[9] * ny + m[10] * nz;
      const l = Math.hypot(ax, ay, az) || 1;
      nrm[(vo + i) * 3] = ax / l; nrm[(vo + i) * 3 + 1] = ay / l; nrm[(vo + i) * 3 + 2] = az / l;
    }
    for (let i = 0; i < mp.icount; i++) idx[io + i] = mp.idx[i] + vo;
    vo += mp.vcount; io += mp.icount;
  }
  return buildMesh(pos, nrm, idx);
}

/* ---- static stage geometry (built once) ---- */
function buildStage() {
  // ground grid merged into one mesh
  const lines = [];
  const step = 1.4, N = 9;
  const t = 0.02;
  for (let k = -N; k <= N; k++) {
    lines.push({ mesh: gBox(step * 2 * N, 0.004, t), matrix: m4trs(0, 0, k * step, 0, 0, 0, 1, 1, 1) });
    lines.push({ mesh: gBox(t, 0.004, step * 2 * N), matrix: m4trs(k * step, 0, 0, 0, 0, 0, 1, 1, 1) });
  }
  return {
    ground: mergeParts([{ mesh: gPlane(90, 90, 1, 1), matrix: m4trs(0, -0.02, 0, 0, 0, 0, 1, 1, 1) }]),
    grid: mergeParts(lines),
    particle: gSphere(1, 8, 6),
  };
}

/* ---- background gradient (cached per accent) ---- */
const bgCache = new Map();
function makeBG(accent) {
  const key = accent.join(',');
  if (bgCache.has(key)) return bgCache.get(key);
  const b = new Uint32Array(W * H);
  const cx = W * 0.5, cy = H * 0.66;
  const maxd = Math.hypot(W * 0.5, H * 0.6);
  for (let y = 0; y < H; y++) {
    const vt = y / H;
    // vertical gradient: deep navy -> slightly lighter horizon
    let br = 6 + 10 * vt, bg = 10 + 18 * vt, bb = 20 + 30 * vt;
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / maxd, dy = (y - cy) / maxd;
      const d2 = dx * dx + dy * dy;
      const glow = Math.exp(-d2 * 3.4) * 0.22;
      const r = br + accent[0] * 255 * glow;
      const g = bg + accent[1] * 255 * glow;
      const bl = bb + accent[2] * 255 * glow;
      b[y * W + x] = ((255 << 24) | ((bl > 255 ? 255 : bl) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r)) >>> 0;
    }
  }
  bgCache.set(key, b);
  return b;
}

/* ---- particle field (deterministic) ---- */
function makeParticles(n) {
  let seed = 1337;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: (rnd() - 0.5) * 14,
      y: rnd() * 5 - 0.8,
      z: (rnd() - 0.5) * 14,
      s: 0.02 + rnd() * 0.05,
      ph: rnd() * Math.PI * 2,
      sp: 0.3 + rnd() * 0.7,
    });
  }
  return out;
}

/* ---- main ---- */
async function main() {
  const stage = buildStage();
  const particles = makeParticles(26);
  const R = new E.Renderer(W, H);

  const out = process.stdout;
  const tmpU8 = new Uint8Array(4);
  const buf = Buffer.alloc(0);

  for (let s = 0; s < Math.min(MAX_SCENES, SC.SCENES.length); s++) {
    const scene = SC.SCENES[s];
    const accent = scene.accent;
    R.setBackground(makeBG(accent));
    const tScene0 = s * SCENE_SEC;

    for (let f = 0; f < Math.min(MAX_FRAMES, SCENE_FRAMES); f++) {
      const t = f / SCENE_FRAMES;           // 0..1 within scene
      const time = tScene0 + (f / FPS);      // absolute seconds
      // subtle dip-to-black at each 10s cut (cinematic)
      const bd = Math.min(time % SCENE_SEC, SCENE_SEC - (time % SCENE_SEC));
      R.dim = 1 - 0.5 * Math.max(0, 1 - bd / 0.10);
      const c = SC.cam(scene.def, t);
      const view = E.m4lookAt(c.p, c.t, [0, 1, 0]);
      const proj = E.m4perspective((c.fov * Math.PI) / 180, W / H, 0.1, 120);
      const vp = E.m4mul(proj, view);

      const env = {
        view, proj, vp, camPos: c.p,
        lights: [
          { dir: [0.45, 0.82, 0.35], col: [1.0, 0.97, 0.92], i: 1.0 },
          { dir: [-0.65, 0.30, 0.55], col: [0.45, 0.65, 1.0], i: 0.55 },
          { dir: [0.1, -0.35, -0.9], col: [accent[0], accent[1], accent[2]], i: 0.5 },
        ],
        fogColor: [0.02, 0.035, 0.07], fogStart: 7, fogEnd: 30,
      };

      R.clear();

      /* --- ground --- */
      R.draw(stage.ground, m4trs(0, -1.25, 0, 0, 0, 0, 1, 1, 1),
        { color: [0.10, 0.14, 0.22], spec: 0.25, shin: 24, ambient: 0.35 }, env, { cull: false });

      /* --- glowing grid --- */
      const gpulse = 0.55 + 0.45 * Math.sin(time * 1.5);
      R.draw(stage.grid, m4trs(0, -1.22, 0, 0, 0, 0, 1, 1, 1),
        { color: accent, spec: 0, shin: 2, emissive: 0.55 * gpulse, ambient: 1 }, env, { cull: false });

      /* --- particles --- */
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const y = p.y + Math.sin(time * p.sp + p.ph) * 0.35;
        const x = p.x + Math.cos(time * p.sp * 0.7 + p.ph) * 0.5;
        const z = p.z + Math.sin(time * p.sp * 0.5 + p.ph) * 0.5;
        const sc = p.s * (0.7 + 0.3 * Math.sin(time * 2 + p.ph));
        R.draw(stage.particle, m4trs(x, y, z, 0, 0, 0, sc, sc, sc),
          { color: accent, spec: 0, shin: 2, emissive: 0.9, ambient: 1 }, env, { cull: false });
      }

      /* --- hero --- */
      const heroParts = scene.hero(t) || [];
      for (const hp of heroParts) {
        const parts = hp.parts;
        const world = hp.world || m4trs(0, 0, 0, 0, 0, 0, 1, 1, 1);
        for (const pt of parts) {
          const model = m4mul(world, pt.local);
          R.draw(pt.mesh, model, pt.mat, env, pt.opts || { cull: false });
        }
      }
      if (scene.extra) {
        const extraParts = scene.extra(t) || [];
        for (const hp of extraParts) {
          for (const pt of hp.parts) {
            R.draw(pt.mesh, m4mul(hp.world, pt.local), pt.mat, env, pt.opts || { cull: false });
          }
        }
      }

      /* --- write frame --- */
      const bytes = Buffer.from(R.color.buffer, R.color.byteOffset, R.color.byteLength);
      if (!out.write(bytes)) {
        await new Promise((res) => out.once('drain', res));
      }
    }
    if (s % 5 === 0) process.stderr.write(`scene ${s + 1}/${SC.SCENES.length}\n`);
  }
  process.stderr.write('render done\n');
}

main().catch((e) => { console.error(e); process.exit(1); });