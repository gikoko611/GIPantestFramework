'use strict';
/* clean rasterizer self-test */
const E = require('./engine.js');
const W = 854, H = 480;
const R = new E.Renderer(W, H);
const bg = new Uint32Array(W * H);
bg.fill(((255 << 24) | (20 << 16) | (10 << 8) | 5) >>> 0);
R.setBackground(bg);

const view = E.m4lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
const proj = E.m4perspective(45 * Math.PI / 180, W / H, 0.1, 100);
const env = {
  view, proj, vp: E.m4mul(proj, view), camPos: [0, 0, 5],
  lights: [{ dir: [0.4, 0.8, 0.6], col: [1, 1, 1], i: 1 }],
  fogColor: [0, 0, 0], fogStart: 1000, fogEnd: 2000,
};
const count = () => {
  let n = 0;
  for (let i = 0; i < W * H; i++) if (R.color[i] !== bg[i]) n++;
  return n;
};

/* 1. sphere silhouette area */
R.clear();
R.draw(E.gSphere(1, 64, 48), E.m4trs(0, 0, 0, 0, 0, 0, 1, 1, 1), { color: [1, 0.2, 0.2] }, env, { cull: false });
const sph = count();
const expSphere = Math.PI * 118 * 118;
console.log(`sphere   px=${sph}  expected~${Math.round(expSphere)}  ratio=${(sph / expSphere).toFixed(3)}`);

/* 2. occlusion: red plane far, blue box near -> blue must win where they overlap */
R.clear();
R.draw(E.gPlane(40, 40, 1, 1), E.m4trs(0, 0, -8, 90, 0, 0, 1, 1, 1), { color: [1, 0, 0] }, env, { cull: false });
const farCount = count();
R.draw(E.gBox(1, 1, 1), E.m4trs(0, 0, 0, 0, 0, 0, 1, 1, 1), { color: [0, 0, 1] }, env, { cull: false });
const afterBox = count();
let blue = 0, red = 0;
for (let i = 0; i < W * H; i++) {
  const c = R.color[i];
  if (((c >> 16) & 255) > 150 && (c & 255) < 80) blue++;
  if ((c & 255) > 150 && ((c >> 8) & 255) < 80) red++;
}
console.log(`plane    px=${farCount}`);
console.log(`occlusion blue=${blue} red=${red} total=${afterBox}`);
console.log(blue > 5000 && red > 5000 && afterBox < farCount ? 'OCCLUSION OK' : 'OCCLUSION FAILED');

/* 3. near plane clip sanity: object crossing camera plane must not crash */
R.clear();
R.draw(E.gBox(4, 4, 4), E.m4trs(0, 0, 4.4, 0, 0.4, 0, 1, 1, 1), { color: [0, 1, 0] }, env, { cull: false });
console.log('clip test px=' + count() + ' (must be > 0, finite)');