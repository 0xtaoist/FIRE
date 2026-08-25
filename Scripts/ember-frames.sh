#!/bin/bash
# Turn a generated Ember clip into a scrubbable frame sequence.
#
#   frames.sh <clip.mp4> <name> <fps> <height>
#
# Two things matter here.
#
# Alpha is recovered from luminance, not chroma-keyed. Ember is a glowing
# translucent character shot on black, so brightness IS coverage: a hard chroma
# key would clip his soft edges into a sticker, while alpha=max(r,g,b) keeps the
# glow falling off exactly as rendered.
#
# The output is a still sequence rather than a video because this gets SCRUBBED.
# Seeking a video by currentTime lands on the nearest decodable frame, so a
# scroll-driven scrub either jitters or needs every frame to be a keyframe
# (which bloats the file). Addressing frames directly is exact and cheap.
set -euo pipefail

CLIP="$1"; NAME="$2"; FPS="${3:-12}"; H="${4:-420}"
OUT="$(dirname "$0")/seq/$NAME"
rm -rf "$OUT"; mkdir -p "$OUT"

ffmpeg -y -loglevel error -i "$CLIP" \
  -vf "fps=${FPS},scale=-2:${H},format=rgba,\
geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='max(max(r(X,Y),g(X,Y)),b(X,Y))'" \
  "$OUT/%03d.png"

# WebP keeps the alpha and is roughly a fifth the size of PNG at this quality.
cd "$OUT"
for f in *.png; do
  cwebp -quiet -q 64 -alpha_q 82 "$f" -o "${f%.png}.webp" 2>/dev/null || \
    ffmpeg -y -loglevel error -i "$f" -quality 82 "${f%.png}.webp"
done
rm -f *.png

COUNT=$(ls -1 *.webp | wc -l | tr -d ' ')
SIZE=$(du -sh . | cut -f1)
echo "$NAME: $COUNT frames, $SIZE"
