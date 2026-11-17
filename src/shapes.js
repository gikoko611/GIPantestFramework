'use strict';
/* shapes.js — reusable 3D motifs (icons built from primitives) */
const E = require('./engine.js');
const { m4trs, m4mul, gBox, gSphere, gCylinder, gCone, gPlane, gTorus, gRing, gExtrude, buildMesh } = E;

/* ---- materials ---- */
const M = {
  matte: (c) => ({ color: c, spec: 0.35, shin: 28, ambient: 0.30 }),
  metal: (c) => ({ color: c, spec: 1.0, shin: 90, ambient: 0.22 }),
  glow: (c) => ({ color: c, spec: 0.0, shin: 2, emissive: 1.0, ambient: 1.0 }),
  soft: (c) => ({ color: c, spec: 0.15, shin: 12, ambient: 0.42 }),
  glass: (c) => ({ color: c, spec: 1.0, shin: 120, ambient: 0.18, emissive: 0.12 }),
};

/* palette */
const C = {
  cyan: [0.25, 0.85, 0.95],
  teal: [0.20, 0.95, 0.75],
  amber: [1.0, 0.62, 0.16],
  red: [1.0, 0.28, 0.32],
  green: [0.35, 0.95, 0.55],
  violet: [0.64, 0.46, 1.0],
  blue: [0.35, 0.60, 1.0],
  white: [0.92, 0.95, 1.0],
  steel: [0.55, 0.62, 0.75],
  dark: [0.16, 0.22, 0.34],
};

function P(mesh, x, y, z, rx, ry, rz, sx, sy, sz, mat, opts) {
  return { mesh, local: m4trs(x, y, z, rx || 0, ry || 0, rz || 0, sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz), mat, opts };
}
function Pm(mesh, mat4, mat, opts) {
  return { mesh, local: mat4, mat, opts };
}

/* partial torus (arc) in XY plane */
function gArc(R, r, su, sv, a0, a1) {
  const pos = [], nrm = [], idx = [];
  for (let u = 0; u <= su; u++) {
    const tu = a0 + (a1 - a0) * (u / su), cu = Math.cos(tu), suu = Math.sin(tu);
    for (let v = 0; v <= sv; v++) {
      const tv = (v / sv) * Math.PI * 2, cv = Math.cos(tv), svv = Math.sin(tv);
      pos.push((R + r * cv) * cu, (R + r * cv) * suu, r * svv);
      nrm.push(cv * cu, cv * suu, svv);
    }
  }
  const row = sv + 1;
  for (let u = 0; u < su; u++) {
    for (let v = 0; v < sv; v++) {
      const a = u * row + v, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return buildMesh(pos, nrm, idx);
}

/* ---------------- motifs ---------------- */
/* shield: extruded crest */
const SHIELD_PTS = [[-0.56, 0.58], [0.56, 0.58], [0.56, -0.02], [0.40, -0.34], [0.0, -0.64], [-0.40, -0.34], [-0.56, -0.02]];
function mShield(color, scale) {
  const s = scale || 1;
  const parts = [P(gExtrude(SHIELD_PTS, 0.16 * s), 0, 0, 0, 0, 0, 0, s, s, s, M.metal(color || C.cyan))];
  // inner border glow
  parts.push(P(gExtrude(SHIELD_PTS, 0.02), 0, 0, 0.085 * s, 0, 0, 0, 0.78 * s, 0.78 * s, s, M.glow(C.white)));
  return parts;
}
function mCheck(color, scale) {
  const s = scale || 1;
  const pts = [[-0.34, 0.02], [-0.10, -0.24], [0.38, 0.26], [0.24, 0.40], [-0.10, 0.04], [-0.24, 0.20]];
  return [P(gExtrude(pts, 0.08), 0, 0, 0, 0, 0, 0, s, s, s, M.glow(color || C.green))];
}
function mShieldCheck(color, scale) {
  return mShield(color, scale).concat(mCheck(C.white, (scale || 1) * 0.62));
}
function mLock(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(0.72, 0.56, 0.30), 0, -0.16, 0, 0, 0, 0, s, s, s, M.metal(color || C.amber)),
    P(gArc(0.24, 0.06, 28, 12, 0, Math.PI), 0, 0.16, 0, 0, 0, 0, s, s, s, M.metal(C.steel)),
    P(gCylinder(0.05, 0.05, 0.10, 16, true), 0, -0.02, 0.17, 90, 0, 0, s, s, s, M.glow(C.dark)),
  ];
}
function mKey(color, scale) {
  const s = scale || 1;
  const parts = [
    P(gTorus(0.20, 0.07, 24, 12), 0, 0, 0, 90, 0, 0, s, s, s, M.metal(color || C.amber)),
    P(gCylinder(0.05, 0.05, 0.62, 16, true), 0.52, 0, 0, 0, 0, 90, s, s, s, M.metal(color || C.amber)),
    P(gBox(0.08, 0.18, 0.08), 0.66, -0.10, 0, 0, 0, 0, s, s, s, M.metal(color || C.amber)),
    P(gBox(0.08, 0.14, 0.08), 0.80, -0.12, 0, 0, 0, 0, s, s, s, M.metal(color || C.amber)),
  ];
  return parts;
}
function mEnvelope(color, scale) {
  const s = scale || 1;
  const flap = [[-0.5, 0.5], [0.5, 0.5], [0.0, 0.02]];
  return [
    P(gBox(1.05, 0.68, 0.06), 0, 0, 0, 0, 0, 0, s, s, s, M.matte(color || C.white)),
    P(gExtrude(flap, 0.05), 0, 0.17, 0.03, 0, 0, 0, s, s, s, M.metal(C.steel)),
    P(gBox(0.22, 0.10, 0.02), 0.30, -0.06, 0.05, 0, 0, 0, s, s, s, M.glow(C.red)),
  ];
}
function mPhone(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(0.46, 0.86, 0.06), 0, 0, 0, 0, 0, 0, s, s, s, M.metal(C.dark)),
    P(gBox(0.40, 0.74, 0.01), 0, 0.02, 0.035, 0, 0, 0, s, s, s, M.glow(color || C.cyan)),
    P(gCylinder(0.02, 0.02, 0.02, 12, true), 0, -0.38, 0.04, 90, 0, 0, s, s, s, M.metal(C.steel)),
  ];
}
function mCloud(color, scale) {
  const s = scale || 1;
  const m = M.matte(color || C.cyan);
  return [
    P(gSphere(0.34, 24, 16), -0.26, -0.06, 0, 0, 0, 0, s, s * 0.82, s, m),
    P(gSphere(0.44, 24, 16), 0.02, 0.10, 0, 0, 0, 0, s, s * 0.82, s, m),
    P(gSphere(0.30, 24, 16), 0.30, -0.08, 0, 0, 0, 0, s, s * 0.82, s, m),
    P(gBox(0.92, 0.24, 0.42), 0.02, -0.24, 0, 0, 0, 0, s, s, s, m),
  ];
}
function mFolder(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(1.0, 0.66, 0.10), 0, -0.02, 0, 0, 0, 0, s, s, s, M.matte(color || C.amber)),
    P(gBox(0.42, 0.14, 0.10), -0.28, 0.36, 0, 0, 0, 0, s, s, s, M.matte(color || C.amber)),
    P(gBox(0.86, 0.46, 0.02), 0.02, -0.02, 0.06, 0, 0, 0, s, s, s, M.soft(C.white)),
  ];
}
function mDocument(color, scale) {
  const s = scale || 1;
  const parts = [P(gBox(0.62, 0.86, 0.03), 0, 0, 0, 0, 0, 0, s, s, s, M.matte(color || C.white))];
  for (let i = 0; i < 4; i++) {
    const w = i === 0 ? 0.36 : 0.40 - (i % 2) * 0.06;
    parts.push(P(gBox(w, 0.045, 0.01), -0.02, 0.24 - i * 0.13, 0.03, 0, 0, 0, s, s, s, M.glow(C.steel)));
  }
  return parts;
}
function mIdCard(color, scale) {
  const s = scale || 1;
  const parts = [
    P(gBox(1.06, 0.66, 0.05), 0, 0, 0, 0, 0, 0, s, s, s, M.matte(color || C.white)),
    P(gBox(0.26, 0.30, 0.02), -0.30, 0.0, 0.035, 0, 0, 0, s, s, s, M.soft(C.steel)),
    P(gSphere(0.09, 16, 10), -0.30, 0.06, 0.05, 0, 0, 0, s, s, s, M.glow(C.dark)),
    P(gBox(0.42, 0.05, 0.01), 0.14, 0.16, 0.035, 0, 0, 0, s, s, s, M.glow(C.steel)),
    P(gBox(0.34, 0.05, 0.01), 0.10, 0.03, 0.035, 0, 0, 0, s, s, s, M.glow(C.steel)),
    P(gBox(0.30, 0.05, 0.01), 0.08, -0.10, 0.035, 0, 0, 0, s, s, s, M.glow(C.steel)),
  ];
  return parts;
}
function mWifi(color, scale) {
  const s = scale || 1;
  return [
    P(gArc(0.30, 0.045, 20, 10, Math.PI * 0.22, Math.PI * 0.78), 0, 0.02, 0, 0, 0, 0, s, s, s, M.glow(color || C.cyan)),
    P(gArc(0.50, 0.045, 24, 10, Math.PI * 0.24, Math.PI * 0.76), 0, 0.02, 0, 0, 0, 0, s, s, s, M.glow(color || C.cyan)),
    P(gArc(0.70, 0.045, 28, 10, Math.PI * 0.25, Math.PI * 0.75), 0, 0.02, 0, 0, 0, 0, s, s, s, M.glow(color || C.cyan)),
    P(gSphere(0.055, 12, 8), 0, -0.06, 0, 0, 0, 0, s, s, s, M.glow(color || C.cyan)),
  ];
}
function mEye(color, scale) {
  const s = scale || 1;
  return [
    P(gSphere(0.42, 28, 18), 0, 0, 0, 0, 0, 0, s, s * 0.72, s * 0.7, M.soft(C.white)),
    P(gSphere(0.17, 20, 14), 0, 0, 0.24, 0, 0, 0, s, s, s * 0.6, M.glow(color || C.teal)),
    P(gSphere(0.07, 14, 10), 0, 0, 0.30, 0, 0, 0, s, s, s * 0.5, M.glow(C.dark)),
  ];
}
function mPerson(color, scale) {
  const s = scale || 1;
  return [
    P(gSphere(0.20, 20, 14), 0, 0.42, 0, 0, 0, 0, s, s, s, M.soft(color || C.white)),
    P(gCylinder(0.26, 0.34, 0.56, 20, true), 0, -0.10, 0, 0, 0, 0, s, s, s, M.matte(color || C.blue)),
  ];
}
function mServer(color, scale) {
  const s = scale || 1;
  const parts = [];
  for (let i = 0; i < 3; i++) {
    parts.push(P(gBox(0.62, 0.20, 0.52), 0, 0.26 - i * 0.26, 0, 0, 0, 0, s, s, s, M.metal(C.dark)));
    parts.push(P(gSphere(0.028, 8, 6), 0.20, 0.26 - i * 0.26, 0.27, 0, 0, 0, s, s, s, M.glow(i === 1 ? C.amber : C.green)));
    parts.push(P(gBox(0.30, 0.03, 0.01), -0.08, 0.26 - i * 0.26, 0.27, 0, 0, 0, s, s, s, M.glow(C.steel)));
  }
  return parts;
}
function mGear(color, scale) {
  const s = scale || 1;
  const parts = [
    P(gCylinder(0.32, 0.32, 0.12, 28, true), 0, 0, 0, 90, 0, 0, s, s, s, M.metal(color || C.steel)),
    P(gCylinder(0.12, 0.12, 0.16, 18, true), 0, 0, 0, 90, 0, 0, s, s, s, M.metal(C.dark)),
  ];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    parts.push(P(gBox(0.10, 0.14, 0.13), Math.cos(a) * 0.40, Math.sin(a) * 0.40, 0, 0, 0, (a * 180) / Math.PI, s, s, s, M.metal(color || C.steel)));
  }
  return parts;
}
function mGlobe(color, scale) {
  const s = scale || 1;
  const parts = [P(gSphere(0.46, 30, 20), 0, 0, 0, 0, 0, 0, s, s, s, M.glass(color || C.blue))];
  for (let i = -1; i <= 1; i++) {
    parts.push(P(gTorus(0.462, 0.008, 40, 8), 0, 0, 0, 90, 0, 0, s, s * (0.4 + 0.3 * (i + 1)), s, M.glow(C.cyan)));
  }
  for (let i = 0; i < 3; i++) {
    parts.push(P(gTorus(0.462, 0.008, 40, 8), 0, 0, 0, 90, i * 60, 0, s, s, s, M.glow(C.cyan)));
  }
  return parts;
}
function mCamera(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(0.5, 0.34, 0.72), 0, 0, 0, 0, 0, 0, s, s, s, M.matte(color || C.white)),
    P(gCylinder(0.13, 0.16, 0.18, 20, true), 0, 0, 0.42, 90, 0, 0, s, s, s, M.metal(C.dark)),
    P(gSphere(0.08, 14, 10), 0, 0, 0.52, 0, 0, 0, s, s, s, M.glow(C.red)),
    P(gBox(0.10, 0.10, 0.30), 0, 0.22, -0.1, 0, 0, 0, s, s, s, M.metal(C.steel)),
  ];
}
function mUsb(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(0.26, 0.44, 0.12), 0, 0, 0, 0, 0, 0, s, s, s, M.matte(color || C.steel)),
    P(gBox(0.20, 0.16, 0.08), 0, 0.30, 0, 0, 0, 0, s, s, s, M.metal(C.white)),
    P(gBox(0.06, 0.02, 0.02), -0.05, 0.35, 0.05, 0, 0, 0, s, s, s, M.glow(C.dark)),
    P(gBox(0.06, 0.02, 0.02), 0.05, 0.35, 0.05, 0, 0, 0, s, s, s, M.glow(C.dark)),
  ];
}
function mLink(color, scale) {
  const s = scale || 1;
  return [
    P(gArc(0.20, 0.055, 20, 10, -Math.PI * 0.42, Math.PI * 0.42), -0.16, 0.04, 0, 0, 0, 0, s, s, s, M.metal(color || C.violet)),
    P(gArc(0.20, 0.055, 20, 10, Math.PI * 0.58, Math.PI * 1.42), 0.16, -0.04, 0, 0, 0, 0, s, s, s, M.metal(color || C.violet)),
  ];
}
function mDatabase(color, scale) {
  const s = scale || 1;
  const parts = [];
  for (let i = 0; i < 3; i++) {
    parts.push(P(gCylinder(0.34, 0.34, 0.20, 24, true), 0, 0.22 - i * 0.22, 0, 0, 0, 0, s, s, s, M.metal(color || C.cyan)));
    parts.push(P(gTorus(0.34, 0.012, 26, 8), 0, 0.32 - i * 0.22, 0, 90, 0, 0, s, s, s, M.glow(C.white)));
  }
  return parts;
}
function mClock(color, scale) {
  const s = scale || 1;
  const parts = [
    P(gCylinder(0.40, 0.40, 0.10, 30, true), 0, 0, 0, 90, 0, 0, s, s, s, M.metal(color || C.white)),
    P(gBox(0.03, 0.24, 0.02), 0, 0.10, 0.06, 0, 0, 0, s, s, s, M.glow(C.dark)),
    P(gBox(0.16, 0.03, 0.02), 0.06, 0, 0.06, 0, 0, 0, s, s, s, M.glow(C.red)),
  ];
  return parts;
}
function mWarning(color, scale) {
  const s = scale || 1;
  const tri = [[0, 0.5], [0.56, -0.44], [-0.56, -0.44]];
  const parts = [
    P(gExtrude(tri, 0.10), 0, 0, 0, 0, 0, 0, s, s, s, M.metal(color || C.amber)),
    P(gBox(0.09, 0.24, 0.02), 0, 0.02, 0.06, 0, 0, 0, s, s, s, M.glow(C.dark)),
    P(gSphere(0.05, 10, 8), 0, -0.18, 0.06, 0, 0, 0, s, s, s, M.glow(C.dark)),
  ];
  return parts;
}
function mCursor(color, scale) {
  const s = scale || 1;
  const pts = [[0, 0.5], [0.34, -0.34], [0.10, -0.22], [0.22, -0.50], [0.04, -0.58], [-0.06, -0.28], [-0.30, -0.36]];
  return [P(gExtrude(pts, 0.10), 0, 0, 0, 0, 0, 0, s, s, s, M.metal(color || C.white))];
}
function mFingerprint(color, scale) {
  const s = scale || 1;
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const r = 0.12 + i * 0.10;
    parts.push(P(gArc(r, 0.022, 26, 8, Math.PI * (0.15 + i * 0.05), Math.PI * (1.55 - i * 0.02)), 0, 0.06, 0, 0, 0, 0, s, s, s, M.glow(color || C.teal)));
  }
  parts.push(P(gBox(0.03, 0.30, 0.02), 0.0, -0.10, 0, 0, 0, 0, s, s, s, M.glow(color || C.teal)));
  return parts;
}
function mStar(color, scale) {
  const s = scale || 1;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 0.46 : 0.19;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return [P(gExtrude(pts, 0.09), 0, 0, 0, 0, 0, 0, s, s, s, M.metal(color || C.amber))];
}
function mPin(color, scale) {
  const s = scale || 1;
  return [
    P(gSphere(0.26, 22, 16), 0, 0.18, 0, 0, 0, 0, s, s, s, M.metal(color || C.red)),
    P(gCone(0.22, 0.46, 20), 0, -0.16, 0, 180, 0, 0, s, s, s, M.metal(color || C.red)),
  ];
}
function mBriefcase(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(1.0, 0.66, 0.30), 0, 0, 0, 0, 0, 0, s, s, s, M.matte(color || C.dark)),
    P(gArc(0.20, 0.04, 18, 10, 0, Math.PI), 0, 0.34, 0, 0, 0, 0, s, s, s, M.metal(C.steel)),
    P(gBox(0.16, 0.10, 0.02), 0, 0.10, 0.16, 0, 0, 0, s, s, s, M.glow(C.amber)),
  ];
}
function mTablet(color, scale) {
  const s = scale || 1;
  return [
    P(gBox(0.70, 0.96, 0.05), 0, 0, 0, 0, 0, 0, s, s, s, M.metal(C.dark)),
    P(gBox(0.62, 0.86, 0.01), 0, 0, 0.03, 0, 0, 0, s, s, s, M.glow(color || C.violet)),
  ];
}

module.exports = {
  M, C, P, Pm, gArc,
  mShield, mShieldCheck, mCheck, mLock, mKey, mEnvelope, mPhone, mCloud, mFolder,
  mDocument, mIdCard, mWifi, mEye, mPerson, mServer, mGear, mGlobe, mCamera, mUsb,
  mLink, mDatabase, mClock, mWarning, mCursor, mFingerprint, mStar, mPin, mBriefcase, mTablet,
};