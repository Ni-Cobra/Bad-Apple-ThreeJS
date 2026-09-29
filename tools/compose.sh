#!/usr/bin/env bash
# Compose the deliverable video from the rendered passes + the original (video and soundtrack):
# original | final on top; info (with an optional title), the behind-the-scenes view (half size) and the running
# score below.
#   tools/compose.sh FINAL.mp4 BTS.mp4 DURATION OUTDIR ["TITLE"]  -> OUTDIR/bad_apple_3d.mp4 (+ OUTDIR/score.csv)
# (the score graph shows the last 10 seconds; ./make_video.sh runs the whole chain)
set -euo pipefail
FINAL=$1; BTS=$2; DUR=$3; OUT=$4; TITLE=${5:-}
mkdir -p "$OUT"
.venv/bin/python tools/py/deliverable.py bad_apple_original.mp4 "$FINAL" "$BTS" "$DUR" "$OUT/bad_apple_3d.mp4" "$OUT/score.csv" --title "$TITLE"
ls -la "$OUT/bad_apple_3d.mp4"
