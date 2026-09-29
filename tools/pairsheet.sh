#!/usr/bin/env bash
# Full-rate motion sheet: original | render pairs (render framed in red), tiled 4 across, to judge timing and flow.
#   tools/pairsheet.sh RENDER.mp4 RENDER_T0 START DUR FPS OUT.png
# RENDER_T0 is the film time of the render's first frame (0 for tmp_out/final.mp4, the --from of a partial render).
# Use FPS 30 on short spans (every frame), 15 on 1.5 - 2 s spans.
set -euo pipefail
O=$1; T0=$2; A=$3; D=$4; F=$5; OUT=$6
R=$(python3 -c "print(round($A - $T0, 3))")
N=$(python3 -c "import math; print(math.ceil($D * $F / 4))")
ffmpeg -hide_banner -loglevel error -y -ss "$A" -t "$D" -i bad_apple_original.mp4 -ss "$R" -t "$D" -i "$O" -filter_complex \
  "[0:v]fps=$F,scale=180:135[a];[1:v]fps=$F,scale=180:135,drawbox=x=0:y=0:w=180:h=135:color=red@0.6:t=1[b];[a][b]hstack,pad=366:139:3:2:gray,tile=4x$N" \
  -frames:v 1 "$OUT"
