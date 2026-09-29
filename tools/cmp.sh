#!/usr/bin/env bash
# The review loop in one command: render stills at the given times, build an original-vs-render strip and a
# disagreement map, and print the per-frame agreement with the original.
#   tools/cmp.sh NAME t1 t2 ...   ->  tmp_out/cmp/NAME/ (stills), tmp_out/cmp/NAME.png (strip), tmp_out/cmp/NAME_diff.png
set -euo pipefail
N=$1; shift
T=$(echo "$@" | tr ' ' ',')
D=tmp_out/cmp/$N
rm -rf "$D"; mkdir -p tmp_out/cmp
node tools/render.mjs stills --times "$T" --out "$D" 2>&1 | grep -v "^tmp_out/\|GL Driver" || true
.venv/bin/python tools/py/seq.py bad_apple_original.mp4 "$D" "tmp_out/cmp/$N.png" "$@"
.venv/bin/python tools/py/diff.py "$D" "tmp_out/cmp/${N}_diff.png" "$@"
.venv/bin/python - "$D" "$@" <<'PY'
import sys; sys.path.insert(0, 'tools/py')
from compare import orig_frame, agree
from PIL import Image
d = sys.argv[1]
print('  '.join(f"{t:.2f}:{agree(orig_frame('bad_apple_original.mp4', t), Image.open(f'{d}/final_{t:.2f}.png').convert('L').resize((320, 240))):.3f}"
                for t in map(float, sys.argv[2:])))
PY
