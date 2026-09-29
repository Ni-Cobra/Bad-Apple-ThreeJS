#!/usr/bin/env bash
# Make the deliverable video: deliverable/bad_apple_3d.mp4 (1920x1080, with the original's soundtrack).
# The original and the Three.js recreation side by side, the behind-the-scenes view and the running score below.
#
#   ./make_video.sh "Your title"             render both passes, score them and compose the video
#   ./make_video.sh "Your title" --reuse     keep the passes already rendered in tmp_out/ (just re-compose)
#   ./make_video.sh --to 30 "Your title"     the first 30 seconds (the default, TO below, is the whole staged film)
#
# The title goes under "recreated in 3D with Three.js" (for example the credits); it may be left out.
# Renders take several minutes: both passes run at the same time on the CPU. Intermediate files go in tmp_out/.
set -euo pipefail
cd "$(dirname "$0")"

TO=24              # where the recreation ends: keep it at PROMPT.md's target end (or pass --to)
TITLE=""
REUSE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --reuse) REUSE=1 ;;
    --to) TO=$2; shift ;;
    --title) TITLE=$2; shift ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown option: $1 (see --help)" >&2; exit 1 ;;
    *) TITLE=$1 ;;
  esac
  shift
done

say() { printf '\033[1m%s\033[0m\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# ---- prerequisites (installs what is local and missing, explains the rest) ----
command -v node >/dev/null || die "Node.js is missing: install Node 22 (https://nodejs.org)."
command -v ffmpeg >/dev/null || die "ffmpeg is missing: install it (for example 'sudo apt install ffmpeg') and make sure it is on PATH."
if [ ! -d node_modules/three ] || [ ! -d node_modules/playwright ]; then
  say "Installing the npm packages..."; npm install
fi
if ! node -e "require('fs').accessSync(require('playwright').chromium.executablePath())" 2>/dev/null; then
  say "Installing headless Chromium..."; npx playwright install chromium
fi
if ! .venv/bin/python -c "import numpy, PIL" 2>/dev/null; then
  say "Creating the Python environment (.venv with numpy and pillow)..."
  python3 -m venv .venv && .venv/bin/pip install --quiet numpy pillow \
    || die "Could not create .venv; see README.md, Setup."
fi
[ -f bad_apple_original.mp4 ] || die "bad_apple_original.mp4 is missing (the original video: comparison and soundtrack). Fetch it with:
  .venv/bin/pip install yt-dlp && .venv/bin/yt-dlp -f 230+140 --merge-output-format mp4 -o bad_apple_original.mp4 https://www.youtube.com/watch?v=FtutLA63Cp8"

mkdir -p tmp_out deliverable

# ---- the two passes: the film, and behind the scenes ----
render_passes() {
  local pids=() v
  for v in final bts; do
    rm -f "tmp_out/$v.part.mp4"
    node tools/render.mjs video --from 0 --to "$TO" --view "$v" --out "tmp_out/$v.part.mp4" >/dev/null 2>"tmp_out/render_$v.log" &
    pids+=($!)
  done
  local start=$SECONDS
  progress() { grep -ao "$1 frame [0-9]*/[0-9]*" "tmp_out/render_$1.log" 2>/dev/null | tail -1 | sed "s/$1 frame //" || true; }
  while kill -0 "${pids[@]}" 2>/dev/null; do
    printf '\r  final %-11s behind the scenes %-11s %ds ' "$(progress final)" "$(progress bts)" $((SECONDS - start))
    sleep 5
  done
  echo
  for i in 0 1; do wait "${pids[$i]}" || die "The render failed; see tmp_out/render_$([ $i = 0 ] && echo final || echo bts).log"; done
  mv tmp_out/final.part.mp4 tmp_out/final.mp4
  mv tmp_out/bts.part.mp4 tmp_out/bts.mp4
}

if [ $REUSE = 1 ] && [ -f tmp_out/final.mp4 ] && [ -f tmp_out/bts.mp4 ]; then
  say "Reusing tmp_out/final.mp4 and tmp_out/bts.mp4"
else
  say "Rendering 0 - ${TO} s, the film and behind the scenes (several minutes)..."
  render_passes
fi

# ---- compose (scores the film against the original on the way) ----
say "Composing the video${TITLE:+ with the title \"$TITLE\"}..."
tools/compose.sh tmp_out/final.mp4 tmp_out/bts.mp4 "$TO" deliverable "$TITLE"
say "Done: deliverable/bad_apple_3d.mp4"
