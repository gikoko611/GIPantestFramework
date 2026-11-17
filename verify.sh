#!/usr/bin/env bash
# verify.sh — sanity-check the final video
set -uo pipefail
cd "$(dirname "$0")"
V="${1:-build/out.mp4}"
TMP="build/verify_tmp"
mkdir -p "$TMP"

echo "== container =="
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels \
  -of default=noprint_wrappers=1 "$V"

echo
echo "== subtitle presence (white pixels in the lower third) =="
for t in 12 32 52 92 132 172 212 252 292; do
  ffmpeg -y -hide_banner -loglevel error -ss "$t" -i "$V" -frames:v 1 "$TMP/f_$t.png"
  node -e '
    const {readPNG}=require("./src/pngread.js");
    const {w,h,ch,data}=readPNG(process.argv[1]);
    let white=0;
    for(let y=Math.floor(h*0.70);y<h;y++)for(let x=0;x<w-160;x++){
      const i=(y*w+x)*ch;
      if(data[i]>195&&data[i+1]>195&&data[i+2]>195) white++;
    }
    console.log("  t="+process.argv[2]+"s  subtitle px:", white);
  ' "$TMP/f_$t.png" "$t"
done

echo
echo "== watermark (bright pixels, bottom-right corner) =="
node -e '
  const {readPNG}=require("./src/pngread.js");
  const {w,h,ch,data}=readPNG(process.argv[1]);
  let bright=0;
  for(let y=h-70;y<h;y++)for(let x=w-150;x<w;x++){
    const i=(y*w+x)*ch;
    if(data[i]*0.3+data[i+1]*0.6+data[i+2]*0.1>60) bright++;
  }
  console.log("  corner bright px:", bright);
' "$TMP/f_292.png"