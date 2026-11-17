'use strict';
/* scenes.js — 30 cinematic 3D scenes (personal-data protection @ work) */
const S = require('./shapes.js');
const E = require('./engine.js');
const { C, M, P } = S;
const { m4trs } = E;

const ease = (t) => t * t * (3 - 2 * t);                 // smoothstep
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;

function cam(def, t) {
  const e = easeInOut(t);
  const a = lerp(def.a0, def.a1, e) * Math.PI / 180;
  const r = lerp(def.r0, def.r1, e) * 0.85;
  const h = lerp(def.h0, def.h1, e);
  return {
    p: [Math.cos(a) * r, h, Math.sin(a) * r],
    t: [0, lerp(def.ty0, def.ty1, e), 0],
    fov: def.fov || 42,
  };
}
/* entrance scale (pop-in) */
function popIn(t, dur) {
  const d = dur || 0.16;
  if (t >= d) return 1;
  return Math.max(0.001, easeOutBack(Math.max(0, t) / d));
}

/* Each scene: { id, sub, accent, def(camera), hero(t)->parts, extra?(t)->parts } */
const SCENES = [];
function S_(id, sub, accent, def, hero, extra) {
  SCENES.push({ id, sub, accent, def, hero, extra });
}

/* 01 — title: shield + orbiting rings */
S_(1, 'ကိုယ်ရေးအချက်အလက် လုံခြုံရေး — အလုပ်ခွင်လမ်းညွှန်', C.cyan,
  { r0: 6.2, r1: 5.2, h0: 2.4, h1: 2.0, a0: 25, a1: -25, ty0: 0.85, ty1: 0.9, fov: 42 },
  (t) => {
    const p = popIn(t) * 1.5;
    return [
      { parts: S.mShieldCheck(C.cyan, p), world: m4trs(0, 0.85 + Math.sin(t * 6.28) * 0.06, 0, 0, t * 20, 0) },
      { parts: S.mGear(C.steel, 0.55), world: m4trs(-1.9, -0.5, 0.4, 0, -t * 160, 0) },
      { parts: S.mGear(C.steel, 0.40), world: m4trs(1.9, 0.9, -0.3, 0, t * 220, 0) },
      { parts: S.mLock(C.amber, 0.42), world: m4trs(1.6, -0.7, 0.8, 0, -t * 90, 0) },
    ];
  });

/* 02 — what is personal data: id card */
S_(2, 'ကိုယ်ရေးအချက်အလက် ဆိုတာ ဘာလဲ', C.cyan,
  { r0: 5.0, r1: 4.2, h0: 1.6, h1: 1.2, a0: -30, a1: 20, ty0: 0.0, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t) * 1.45;
    return [
      { parts: S.mIdCard(C.white, p), world: m4trs(0, 0.1, 0, 8, t * 360 * 0.25, -6) },
      { parts: S.mPerson(C.blue, 0.5), world: m4trs(-1.7, -0.5, 0.6, 0, t * 60, 0) },
    ];
  });

/* 03 — name, ID, phone, photo */
S_(3, 'အမည်၊ မှတ်ပုံတင်၊ ဖုန်းနံပါတ်၊ ဓာတ်ပုံ အားလုံး ပါဝင်သည်', C.cyan,
  { r0: 5.4, r1: 4.6, h0: 2.2, h1: 1.6, a0: 40, a1: -10, ty0: 0.1, ty1: 0.2, fov: 42 },
  (t) => {
    const parts = [];
    const items = [S.mIdCard(C.white, 0.62), S.mPhone(C.cyan, 0.62), S.mDocument(C.white, 0.7), S.mCamera(C.white, 0.6)];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 1.2;
      const s = 0.9 + Math.sin(t * 6.28 + i) * 0.06;
      parts.push({ parts: items[i], world: m4trs(Math.cos(a) * 1.8, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.8, 0, -a * 57.3 + 90, 0, s, s, s) });
    }
    return parts;
  });

/* 04 — where data lives: server + devices */
S_(4, 'အလုပ်ခွင်တွင် ဒေတာများ ဘယ်နေရာတွင် ရှိသနည်း', C.cyan,
  { r0: 6.0, r1: 4.8, h0: 2.0, h1: 2.6, a0: -20, a1: 35, ty0: 0.3, ty1: 0.2, fov: 44 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mServer(C.cyan, 1.15 * p), world: m4trs(0, 0.1, 0, 0, t * 40, 0) },
      { parts: S.mTablet(C.violet, 0.7), world: m4trs(-1.9, -0.3, 1.0, 0, 25, 0) },
      { parts: S.mPhone(C.teal, 0.7), world: m4trs(1.9, -0.2, 0.8, 0, -30, 0) },
      { parts: S.mCloud(C.blue, 0.7), world: m4trs(0.2, 1.6, -0.6, 0, t * 30, 0) },
    ];
  });

/* 05 — device, email, cloud all risky */
S_(5, 'စက်ပစ္စည်း၊ အီးမေးလ်၊ ကလောင်းတိုက် သုံးမျိုးလုံး အန္တရာယ်ရှိသည်', C.cyan,
  { r0: 5.6, r1: 4.8, h0: 2.4, h1: 1.8, a0: 30, a1: -20, ty0: 0.1, ty1: 0.2, fov: 42 },
  (t) => {
    const parts = [];
    const items = [S.mPhone(C.teal, 0.72), S.mEnvelope(C.white, 0.72), S.mCloud(C.blue, 0.78)];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + t * 0.9;
      parts.push({ parts: items[i], world: m4trs(Math.cos(a) * 1.7, Math.sin(a * 1.5) * 0.3, Math.sin(a) * 1.7, 0, -a * 57.3 + 90, 0) });
    }
    return parts;
  });

/* 06 — what if it leaks */
S_(6, 'အချက်အလက် မလုံခြုံပါက ဘာဖြစ်နိုင်သနည်း', C.red,
  { r0: 5.2, r1: 4.4, h0: 1.8, h1: 2.2, a0: -35, a1: 15, ty0: 0.0, ty1: 0.15, fov: 42 },
  (t) => {
    const p = popIn(t) * 1.35;
    return [
      { parts: S.mWarning(C.red, p), world: m4trs(0, 0.2, 0, 0, t * 45, 0) },
      { parts: S.mEnvelope(C.white, 0.55), world: m4trs(-1.8, -0.6, 0.5, 0, 20, -12) },
      { parts: S.mIdCard(C.white, 0.5), world: m4trs(1.8, -0.5, 0.3, 0, -25, 10) },
    ];
  });

/* 07 — identity theft / fraud */
S_(7, 'အထောက်အထား ယိုစိမ့်ခြင်းနှင့် လိမ့်လည်မှု အန္တရာယ်', C.red,
  { r0: 5.4, r1: 4.6, h0: 2.0, h1: 1.4, a0: 20, a1: -30, ty0: 0.2, ty1: 0.1, fov: 42 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mFingerprint(C.red, 1.1 * p), world: m4trs(0, 0.1, 0, 0, t * 30, 0) },
      { parts: S.mKey(C.amber, 0.55), world: m4trs(1.7, -0.6, 0.6, 0, t * 120, 0) },
      { parts: S.mPerson(C.steel, 0.5), world: m4trs(-1.7, -0.5, 0.5, 0, -t * 50, 0) },
    ];
  });

/* 08 — strong password */
S_(8, 'ခိုင်မာသော စကားဝှက် သုံးပါ', C.green,
  { r0: 4.8, r1: 4.0, h0: 1.4, h1: 1.1, a0: -25, a1: 20, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t) * 1.3;
    return [
      { parts: S.mLock(C.green, p), world: m4trs(0, 0.1, 0, 0, t * 30, 0) },
      { parts: S.mKey(C.amber, 0.6), world: m4trs(1.5, -0.5, 0.7, 0, t * 100, 0) },
      { parts: S.mShieldCheck(C.green, 0.5), world: m4trs(-1.7, 0.6, -0.4, 0, -t * 40, 0) },
    ];
  });

/* 09 — don't share password */
S_(9, 'စကားဝှက်ကို ဘယ်သူ့ကိုမှ မမျှဝေပါနှင့်', C.red,
  { r0: 5.0, r1: 4.2, h0: 1.8, h1: 2.0, a0: 35, a1: -15, ty0: 0.1, ty1: 0.2, fov: 42 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mLock(C.amber, 0.95 * p), world: m4trs(0, 0.1, 0, 0, t * 20, 0) },
      { parts: S.mPerson(C.steel, 0.5), world: m4trs(-1.8, -0.5, 0.5, 0, 0, 0) },
      { parts: S.mPerson(C.steel, 0.5), world: m4trs(1.8, -0.5, 0.5, 0, 0, 0) },
      { parts: S.mWarning(C.red, 0.35), world: m4trs(0, -0.9, 1.0, 0, 0, 0) },
    ];
  });

/* 10 — 2FA */
S_(10, 'နှစ်ဆင့် အတည်ပြုခြင်း (2FA) ဖွင့်ထားပါ', C.green,
  { r0: 4.8, r1: 4.0, h0: 1.6, h1: 1.2, a0: -30, a1: 25, ty0: 0.1, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mPhone(C.green, 0.95 * p), world: m4trs(0, 0.1, 0, 0, t * 40, 0) },
      { parts: S.mShieldCheck(C.green, 0.55), world: m4trs(-1.5, 0.7, 0.4, 0, -t * 60, 0) },
      { parts: S.mKey(C.amber, 0.45), world: m4trs(1.6, -0.6, 0.5, 0, t * 80, 0) },
    ];
  });

/* 11 — phishing email */
S_(11, 'Phishing အီးမေးလ်များကို သတိပြုပါ', C.amber,
  { r0: 5.2, r1: 4.4, h0: 1.6, h1: 1.2, a0: 25, a1: -25, ty0: 0.1, ty1: 0.2, fov: 42 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mEnvelope(C.white, 1.15 * p), world: m4trs(0, 0.15, 0, 0, t * 35, 0) },
      { parts: S.mWarning(C.red, 0.45), world: m4trs(-1.7, 0.7, 0.5, 0, -t * 50, 0) },
      { parts: S.mCursor(C.white, 0.6), world: m4trs(1.6, -0.5, 0.8, 0, 0, -15) },
    ];
  });

/* 12 — suspicious link */
S_(12, 'သံသယဖြစ်သော လင့်ခ်များကို မနှိပ်ပါနှင့်', C.red,
  { r0: 4.9, r1: 4.1, h0: 1.5, h1: 1.3, a0: -20, a1: 30, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mLink(C.red, 1.1 * p), world: m4trs(0, 0.15, 0, 0, t * 40, 0) },
      { parts: S.mCursor(C.white, 0.75), world: m4trs(-1.4, -0.5, 0.9, 0, 0, -12) },
      { parts: S.mWarning(C.amber, 0.4), world: m4trs(1.7, 0.6, 0.4, 0, -t * 60, 0) },
    ];
  });

/* 13 — public wifi */
S_(13, 'အများသုံး Wi-Fi တွင် အလုပ်မလုပ်ပါနှင့်', C.red,
  { r0: 5.3, r1: 4.5, h0: 2.0, h1: 1.5, a0: 30, a1: -20, ty0: 0.2, ty1: 0.1, fov: 42 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mWifi(C.cyan, 1.0 * p), world: m4trs(0, 0.3, 0, 0, t * 25, 0) },
      { parts: S.mPhone(C.steel, 0.7), world: m4trs(-1.6, -0.6, 0.5, 0, 20, 0) },
      { parts: S.mWarning(C.red, 0.45), world: m4trs(1.6, 0.5, 0.4, 0, -t * 40, 0) },
    ];
  });

/* 14 — screen privacy */
S_(14, 'မျက်နှာပြင်ကို လူမမြင်သော နေရာတွင် အလုပ်လုပ်ပါ', C.violet,
  { r0: 4.8, r1: 4.0, h0: 1.5, h1: 1.2, a0: -30, a1: 20, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mTablet(C.violet, 1.0 * p), world: m4trs(0, 0.15, 0, 0, t * 30, 0) },
      { parts: S.mEye(C.teal, 0.6), world: m4trs(-1.6, 0.8, 0.5, 0, -t * 50, 0) },
      { parts: S.mEye(C.teal, 0.4), world: m4trs(1.6, -0.6, 0.5, 0, t * 50, 0) },
    ];
  });

/* 15 — screen lock */
S_(15, 'စက်ကို ပြင်ပန်းခါ အမြဲ လော့ခ်ချပါ', C.green,
  { r0: 4.7, r1: 4.0, h0: 1.6, h1: 1.2, a0: 25, a1: -25, ty0: 0.1, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mLock(C.green, 1.0 * p), world: m4trs(0, 0.15, 0, 0, t * 30, 0) },
      { parts: S.mClock(C.white, 0.6), world: m4trs(-1.6, 0.7, 0.4, 0, -t * 60, 0) },
      { parts: S.mPerson(C.steel, 0.45), world: m4trs(1.7, -0.6, 0.4, 0, 0, 0) },
    ];
  });

/* 16 — clean desk */
S_(16, 'စားပွဲပေါ်တွင် ဒေတာ မကျန်စေနှင့်', C.green,
  { r0: 5.2, r1: 4.4, h0: 2.2, h1: 1.7, a0: -25, a1: 25, ty0: 0.0, ty1: 0.1, fov: 42 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mBriefcase(C.dark, 0.9 * p), world: m4trs(0, -0.2, 0, 0, t * 20, 0) },
      { parts: S.mDocument(C.white, 0.55), world: m4trs(-1.5, 0.2, 0.6, 0, 15, 0) },
      { parts: S.mCheck(C.green, 0.5), world: m4trs(1.5, 0.7, 0.3, 0, -t * 40, 0) },
    ];
  });

/* 17 — encryption */
S_(17, 'စက်များကို Encrypt လုပ်ထားပါ', C.cyan,
  { r0: 4.9, r1: 4.1, h0: 1.5, h1: 1.3, a0: 20, a1: -20, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mDatabase(C.cyan, 0.85 * p), world: m4trs(0, 0.0, 0, 0, t * 35, 0) },
      { parts: S.mLock(C.green, 0.5), world: m4trs(-1.6, 0.7, 0.4, 0, -t * 50, 0) },
      { parts: S.mShield(C.cyan, 0.45), world: m4trs(1.6, -0.6, 0.4, 0, t * 40, 0) },
    ];
  });

/* 18 — updates */
S_(18, 'Software update များကို အမြဲ ပြုလုပ်ပါ', C.blue,
  { r0: 4.8, r1: 4.0, h0: 1.6, h1: 1.2, a0: -30, a1: 25, ty0: 0.1, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mGear(C.blue, 1.0 * p), world: m4trs(0, 0.15, 0, 0, t * 120, 0) },
      { parts: S.mCheck(C.green, 0.45), world: m4trs(-1.5, 0.6, 0.5, 0, -t * 50, 0) },
      { parts: S.mClock(C.white, 0.5), world: m4trs(1.6, -0.6, 0.5, 0, t * 60, 0) },
    ];
  });

/* 19 — backup */
S_(19, 'အရေးကြီး ဒေတာကို အရန်သိမ်းဆည်းပါ', C.blue,
  { r0: 5.2, r1: 4.4, h0: 2.0, h1: 1.5, a0: 30, a1: -20, ty0: 0.2, ty1: 0.1, fov: 42 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mServer(C.blue, 0.95 * p), world: m4trs(0, 0.0, 0, 0, t * 30, 0) },
      { parts: S.mDatabase(C.cyan, 0.55), world: m4trs(-1.8, -0.4, 0.6, 0, -t * 50, 0) },
      { parts: S.mCheck(C.green, 0.4), world: m4trs(1.7, 0.7, 0.4, 0, t * 40, 0) },
    ];
  });

/* 20 — 3-2-1 backup */
S_(20, 'Backup ၃-၂-၁ နည်းကို သုံးပါ', C.cyan,
  { r0: 5.4, r1: 4.6, h0: 2.2, h1: 1.8, a0: -25, a1: 25, ty0: 0.1, ty1: 0.2, fov: 42 },
  (t) => {
    const parts = [];
    const items = [S.mServer(C.blue, 0.62), S.mCloud(C.cyan, 0.62), S.mUsb(C.amber, 0.7)];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + t * 0.7;
      parts.push({ parts: items[i], world: m4trs(Math.cos(a) * 1.75, Math.sin(a * 2) * 0.25, Math.sin(a) * 1.75, 0, -a * 57.3 + 90, 0) });
    }
    return parts;
  });

/* 21 — sharing permission */
S_(21, 'ဒေတာ မျှဝေရာတွင် ခွင့်ပြုချက် ယူပါ', C.amber,
  { r0: 5.0, r1: 4.2, h0: 1.6, h1: 1.3, a0: 25, a1: -25, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mFolder(C.amber, 1.0 * p), world: m4trs(0, 0.1, 0, 0, t * 30, 0) },
      { parts: S.mLink(C.violet, 0.5), world: m4trs(-1.6, 0.6, 0.5, 0, -t * 60, 0) },
      { parts: S.mShieldCheck(C.green, 0.45), world: m4trs(1.6, -0.5, 0.5, 0, t * 40, 0) },
    ];
  });

/* 22 — social engineering */
S_(22, 'Social Engineering ကို သတိထားပါ', C.red,
  { r0: 5.1, r1: 4.3, h0: 1.7, h1: 1.3, a0: -30, a1: 20, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mPerson(C.red, 1.0 * p), world: m4trs(0, 0.0, 0, 0, t * 20, 0) },
      { parts: S.mEnvelope(C.white, 0.5), world: m4trs(-1.6, 0.5, 0.5, 0, -t * 50, 0) },
      { parts: S.mWarning(C.amber, 0.45), world: m4trs(1.6, 0.5, 0.5, 0, t * 50, 0) },
    ];
  });

/* 23 — unknown devices */
S_(23, 'ခွင့်ပြုချက် မရှိသော ကိရိယာများ မသုံးပါနှင့်', C.red,
  { r0: 4.9, r1: 4.1, h0: 1.6, h1: 1.2, a0: 30, a1: -20, ty0: 0.1, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mUsb(C.steel, 1.05 * p), world: m4trs(0, 0.15, 0, 0, t * 40, 0) },
      { parts: S.mWarning(C.red, 0.45), world: m4trs(-1.6, 0.6, 0.5, 0, -t * 50, 0) },
      { parts: S.mCamera(C.steel, 0.5), world: m4trs(1.6, -0.5, 0.5, 0, t * 40, 0) },
    ];
  });

/* 24 — cloud sharing */
S_(24, 'Cloud တွင် မျှဝေမှုကို စစ်ဆေးပါ', C.cyan,
  { r0: 5.0, r1: 4.2, h0: 1.8, h1: 1.4, a0: -25, a1: 25, ty0: 0.15, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mCloud(C.cyan, 1.1 * p), world: m4trs(0, 0.2, 0, 0, t * 25, 0) },
      { parts: S.mIdCard(C.white, 0.45), world: m4trs(-1.7, -0.5, 0.5, 0, -t * 50, 0) },
      { parts: S.mLink(C.violet, 0.45), world: m4trs(1.7, -0.4, 0.5, 0, t * 60, 0) },
    ];
  });

/* 25 — data classification */
S_(25, 'ဒေတာ အမျိုးအစား ခွဲခြားသိရှိပါ', C.amber,
  { r0: 5.2, r1: 4.4, h0: 2.0, h1: 1.5, a0: 25, a1: -20, ty0: 0.1, ty1: 0.15, fov: 42 },
  (t) => {
    const parts = [];
    const items = [S.mFolder(C.green, 0.58), S.mFolder(C.amber, 0.58), S.mFolder(C.red, 0.58)];
    for (let i = 0; i < 3; i++) {
      parts.push({ parts: items[i], world: m4trs((i - 1) * 1.45, 0.0 + Math.sin(t * 6.28 + i * 2) * 0.08, 0, 0, t * 25, 0) });
    }
    return parts;
  });

/* 26 — report incidents */
S_(26, 'သံသယဖြစ်မှုကို ချက်ချင်း အကြောင်းကြားပါ', C.red,
  { r0: 4.9, r1: 4.1, h0: 1.6, h1: 1.2, a0: -30, a1: 20, ty0: 0.1, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mPhone(C.red, 0.95 * p), world: m4trs(0, 0.1, 0, 0, t * 35, 0) },
      { parts: S.mWarning(C.amber, 0.45), world: m4trs(-1.6, 0.6, 0.5, 0, -t * 50, 0) },
      { parts: S.mPerson(C.steel, 0.5), world: m4trs(1.6, -0.5, 0.4, 0, 0, 0) },
    ];
  });

/* 27 — don't collect unnecessary data */
S_(27, 'မလိုအပ်သော အချက်အလက် မယူပါနှင့်', C.violet,
  { r0: 5.0, r1: 4.2, h0: 1.7, h1: 1.3, a0: 30, a1: -20, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mDocument(C.white, 1.0 * p), world: m4trs(0, 0.1, 0, 0, t * 30, 0) },
      { parts: S.mCheck(C.green, 0.4), world: m4trs(-1.5, 0.6, 0.5, 0, -t * 50, 0) },
      { parts: S.mWarning(C.amber, 0.4), world: m4trs(1.6, 0.5, 0.5, 0, t * 50, 0) },
    ];
  });

/* 28 — retention */
S_(28, 'လိုအပ်သည့် ကာလသာ သိမ်းဆည်းပါ', C.cyan,
  { r0: 4.8, r1: 4.0, h0: 1.6, h1: 1.2, a0: -25, a1: 25, ty0: 0.1, ty1: 0.1, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mClock(C.cyan, 1.05 * p), world: m4trs(0, 0.15, 0, 0, t * 40, 0) },
      { parts: S.mDocument(C.white, 0.5), world: m4trs(-1.6, -0.5, 0.5, 0, -t * 50, 0) },
      { parts: S.mCheck(C.green, 0.4), world: m4trs(1.6, 0.6, 0.4, 0, t * 40, 0) },
    ];
  });

/* 29 — secure disposal */
S_(29, 'ဒေတာ ဖျက်ခြင်းကို မှန်ကန်စွာ ပြုလုပ်ပါ', C.violet,
  { r0: 4.9, r1: 4.1, h0: 1.7, h1: 1.3, a0: 20, a1: -25, ty0: 0.1, ty1: 0.15, fov: 40 },
  (t) => {
    const p = popIn(t);
    return [
      { parts: S.mUsb(C.steel, 0.95 * p), world: m4trs(0, 0.15, 0, 0, t * 35, 0) },
      { parts: S.mGear(C.violet, 0.55), world: m4trs(-1.6, 0.6, 0.4, 0, t * 100, 0) },
      { parts: S.mCheck(C.green, 0.4), world: m4trs(1.6, -0.5, 0.4, 0, -t * 60, 0) },
    ];
  });

/* 30 — culture */
S_(30, 'လုံခြုံရေး ယဉ်ကျေးမှု တည်ဆောက်ခြင်း', C.green,
  { r0: 6.0, r1: 5.0, h0: 2.4, h1: 2.0, a0: 20, a1: -20, ty0: 0.3, ty1: 0.3, fov: 42 },
  (t) => {
    const p = popIn(t) * 1.5;
    return [
      { parts: S.mShieldCheck(C.green, p), world: m4trs(0, 0.2, 0, 0, t * 25, 0) },
      { parts: S.mStar(C.amber, 0.5), world: m4trs(-1.9, 0.9, 0.3, 0, t * 70, 0) },
      { parts: S.mStar(C.amber, 0.35), world: m4trs(1.9, -0.6, 0.4, 0, -t * 90, 0) },
      { parts: S.mPerson(C.steel, 0.5), world: m4trs(0.0, -0.9, 1.2, 0, 0, 0) },
    ];
  });

module.exports = { SCENES, cam, popIn, ease, easeOut, easeInOut, easeOutBack, lerp }; 