'use strict';
/* subs.js — generate an ASS subtitle file from the scene list */
const fs = require('fs');
const path = require('path');
const SC = require('./scenes.js');

const FPS = 24;
const SCENE_SEC = 10;

function ts(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec - Math.floor(sec)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 854
PlayResY: 480
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Myanmar,30,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,2.6,1.2,2,60,60,44,1
Style: Title,Noto Sans Myanmar,34,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,3.0,1.4,2,40,40,56,1
Style: Tag,Noto Sans Myanmar,20,&H00E8E8E8,&H00E8E8E8,&H00202020,&H90000000,0,0,0,0,100,100,0,0,1,1.8,0.8,8,40,40,34,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

const lines = [];
let n = 0;
for (let i = 0; i < SC.SCENES.length; i++) {
  const sc = SC.SCENES[i];
  const start = i * SCENE_SEC + 0.35;
  const end = (i + 1) * SCENE_SEC - 0.25;
  const style = i === 0 ? 'Title' : 'Default';
  const tag = `Scene ${String(i + 1).padStart(2, '0')}`;
  lines.push(`Dialogue: 0,${ts(start)},${ts(end)},${style},,0,0,0,,{\\fad(320,320)}${sc.sub}`);
  if (i > 0) {
  }
  n++;
}

const out = path.join(__dirname, '..', 'build', 'subs.ass');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, header + lines.join('\n') + '\n');
console.log('subs.ass written:', n, 'cues');