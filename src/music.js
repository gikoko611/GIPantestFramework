'use strict';
/* music.js — synthesize a 5-minute cinematic ambient bed as stereo WAV */
const fs = require('fs');
const path = require('path');

const SR = 44100;
const DUR = 300;                 // seconds
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

/* wavetable sine */
const TS = 4096;
const SIN = new Float32Array(TS + 1);
for (let i = 0; i <= TS; i++) SIN[i] = Math.sin((i / TS) * Math.PI * 2);
function osc(phase) {
  // phase in turns [0,1)
  const p = phase - Math.floor(phase);
  const x = p * TS;
  const i = x | 0;
  const f = x - i;
  return SIN[i] * (1 - f) + SIN[i + 1] * f;
}

/* note renderer with slow attack / release, stereo spread */
function addNote(freq, start, dur, amp, pan, attack, release, detune) {
  const s0 = Math.max(0, Math.floor(start * SR));
  const s1 = Math.min(N, Math.floor((start + dur) * SR));
  const n = s1 - s0;
  if (n <= 0) return;
  const atk = Math.max(1, attack * SR);
  const rel = Math.max(1, release * SR);
  const gl = Math.cos(((pan + 1) / 2) * Math.PI * 0.5);
  const gr = Math.sin(((pan + 1) / 2) * Math.PI * 0.5);
  const inc = freq / SR;
  let ph = 0;
  let ph2 = 0.25;
  const inc2 = (freq * (1 + (detune || 0))) / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 1;
    if (i < atk) env = 0.5 - 0.5 * Math.cos(Math.PI * (i / atk));
    const rem = n - i;
    if (rem < rel) env *= 0.5 - 0.5 * Math.cos(Math.PI * (rem / rel));
    // gentle tremolo
    const trem = 0.92 + 0.08 * osc(t * 0.17);
    const v = (osc(ph) * 0.72 + osc(ph2) * 0.28) * env * trem * amp;
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
    ph += inc;
    ph2 += inc2;
    if (ph > 1) ph -= 1;
    if (ph2 > 1) ph2 -= 1;
  }
}

/* airy noise pad */
function addAir(start, dur, amp) {
  const s0 = Math.max(0, Math.floor(start * SR));
  const s1 = Math.min(N, Math.floor((start + dur) * SR));
  let lp = 0, lp2 = 0;
  let seed = 12345;
  for (let i = s0; i < s1; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const w = (seed / 2147483648) - 1;
    lp += (w - lp) * 0.02; lp2 += (lp - lp2) * 0.02;
    const t = (i - s0) / SR;
    let env = Math.min(1, t / 2) * Math.min(1, (dur - t) / 3);
    if (env < 0) env = 0;
    L[i] += lp2 * amp * env;
    R[i] += lp2 * amp * env * 0.9;
  }
}

/* soft heartbeat pulse */
function addPulse(start, amp) {
  const dur = 1.4;
  const s0 = Math.max(0, Math.floor(start * SR));
  const s1 = Math.min(N, Math.floor((start + dur) * SR));
  const inc = 52 / SR;
  let ph = 0;
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const env = Math.exp(-t * 3.2) * Math.min(1, t / 0.02);
    const v = osc(ph) * env * amp;
    L[i] += v; R[i] += v;
    ph += inc; if (ph > 1) ph -= 1;
  }
}

/* ---- arrangement: Am - F - C - G, 7.5s per chord ---- */
const CH = [
  { bass: 55.00, notes: [220.00, 261.63, 329.63, 440.00] }, // Am
  { bass: 43.65, notes: [174.61, 220.00, 261.63, 349.23] }, // F
  { bass: 65.41, notes: [196.00, 261.63, 329.63, 392.00] }, // C
  { bass: 49.00, notes: [196.00, 246.94, 293.66, 392.00] }, // G
];
const CHORD = 7.5;
const NCH = Math.ceil(DUR / CHORD);

for (let c = 0; c < NCH; c++) {
  const ch = CH[c % CH.length];
  const st = c * CHORD;
  const dur = CHORD + 3.0;
  // pad chord (detuned pairs for width)
  for (let k = 0; k < ch.notes.length; k++) {
    const f = ch.notes[k];
    const pan = [-0.55, 0.5, -0.25, 0.35][k % 4];
    addNote(f, st, dur, 0.075, pan, 2.0, 3.2, 0.0025);
    addNote(f * 1.0, st + 0.05, dur, 0.05, -pan, 2.2, 3.4, -0.0022);
  }
  // bass drone
  addNote(ch.bass, st, dur, 0.11, 0.0, 1.2, 2.5, 0.0);
  addNote(ch.bass * 2, st, dur, 0.045, 0.0, 1.5, 2.5, 0.0);
}

/* sparkles */
for (let i = 0; i < 40; i++) {
  const st = 3 + i * 7.3;
  if (st > DUR - 2) break;
  const ch = CH[Math.floor(st / CHORD) % CH.length];
  const f = ch.notes[i % ch.notes.length] * (i % 3 === 0 ? 4 : 2);
  addNote(f, st, 2.6, 0.028, i % 2 ? 0.6 : -0.6, 0.35, 2.0, 0.001);
}

/* heartbeat */
for (let t = 1.0; t < DUR - 2; t += 3.75) addPulse(t, 0.05);

/* air bed */
addAir(0, DUR, 0.05);

/* ---- master: soft clip, normalize, fades ---- */
let peak = 0;
for (let i = 0; i < N; i++) {
  // gentle lowpass to remove harshness
  L[i] = Math.tanh(L[i] * 1.1);
  R[i] = Math.tanh(R[i] * 1.1);
  const a = Math.abs(L[i]), b = Math.abs(R[i]);
  if (a > peak) peak = a;
  if (b > peak) peak = b;
}
const g = 0.72 / (peak || 1);
const fadeIn = 4 * SR, fadeOut = 6 * SR;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  let env = 1;
  if (i < fadeIn) env = i / fadeIn;
  if (i > N - fadeOut) env = Math.min(env, (N - i) / fadeOut);
  // smooth
  env = env * env * (3 - 2 * env);
  let l = L[i] * g * env;
  let r = R[i] * g * env;
  l = Math.max(-1, Math.min(1, l));
  r = Math.max(-1, Math.min(1, r));
  pcm.writeInt16LE((l * 32767) | 0, i * 4);
  pcm.writeInt16LE((r * 32767) | 0, i * 4 + 2);
}

const out = path.join(__dirname, '..', 'build', 'music.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28);
hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(out, Buffer.concat([hdr, pcm]));
console.log('music.wav written', (pcm.length / 1e6).toFixed(1), 'MB', DUR + 's');