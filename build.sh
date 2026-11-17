#!/usr/bin/env bash
# build.sh — render the full 5-minute 480p educational 3D animation
set -euo pipefail
cd "$(dirname "$0")"

LIMIT_SCENES="${LIMIT_SCENES:-}"
LIMIT_FRAMES="${LIMIT_FRAMES:-}"
OUT="${OUT:-build/out.mp4}"

mkdir -p build

# 1. assets (skip if already present)
if [ ! -f build/music.wav ]; then node src/music.js; fi
if [ ! -f build/subs.ass ]; then node src/subs.js; fi
if [ ! -f build/logo.png ]; then node src/logo.js; fi

FONT="/usr/share/fonts/truetype/notomyanmar/NotoSansMyanmar.ttf"
FONTDIR="/usr/share/fonts/truetype/notomyanmar"

# 0. ensure a Burmese font is available (needed by libass + drawtext)
if [ ! -f "$FONT" ]; then
  echo "fetching Noto Sans Myanmar..."
  mkdir -p "$FONTDIR" 2>/dev/null || sudo mkdir -p "$FONTDIR"
  if [ -w "$FONTDIR" ]; then
    curl -fsSL -o "$FONT" "https://github.com/google/fonts/raw/main/ofl/notosansmyanmar/NotoSansMyanmar%5Bwdth,wght%5D.ttf"
  else
    sudo curl -fsSL -o "$FONT" "https://github.com/google/fonts/raw/main/ofl/notosansmyanmar/NotoSansMyanmar%5Bwdth,wght%5D.ttf"
  fi
  (fc-cache -f >/dev/null 2>&1 || sudo fc-cache -f >/dev/null 2>&1 || true)
fi

FILTER="\
[0:v]vignette=a=PI/8,eq=contrast=1.07:saturation=1.10:brightness=0.01,\
fade=t=in:st=0:d=1.2,fade=t=out:st=297.6:d=2.4[base];\
[base]subtitles=build/subs.ass:fontsdir=${FONTDIR}[v1];\
[v1][2:v]overlay=W-w-24:H-h-18:shortest=1[v2];\
[v2]drawtext=fontfile=${FONT}:text='Powered by':fontcolor=white@0.62:fontsize=15:x=W-tw-76:y=H-h-18+11[vout]"

LIMIT_ARGS=()
if [ -n "$LIMIT_SCENES" ]; then export LIMIT_SCENES; fi
if [ -n "$LIMIT_FRAMES" ]; then export LIMIT_FRAMES; fi

node src/render.js \
  | ffmpeg -y -hide_banner -loglevel warning \
      -f rawvideo -pix_fmt rgba -s 854x480 -r 24 -i - \
      -i build/music.wav \
      -loop 1 -framerate 24 -i build/logo.png \
      -filter_complex "$FILTER" \
      -map "[vout]" -map 1:a \
      -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p \
      -c:a aac -b:a 160k -ar 44100 \
      -shortest -movflags +faststart \
      "$OUT"

echo "wrote $OUT"