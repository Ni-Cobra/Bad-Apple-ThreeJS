# Bad Apple!! in Three.js: from scratch

Recreate the *Bad Apple!!* shadow-art music video in true 3D with your own coding agent. This branch has the
engine, the tooling and the scoring pipeline behind
[a full recreation of 0:00 – 1:10](https://github.com/Ni-Cobra/Bad-Apple-ThreeJS/tree/gpt-6-astra_opus-5-5_recreation),
with every character, animation and shot removed. The scene is empty: a camera, a two-tone palette and a
behind-the-scenes view, ready to be filled.

## What's here

- **The engine** ([docs/ENGINE.md](docs/ENGINE.md)): one persistent Three.js world posed as a pure function of time, a
  shot list and a director, motion curves, modeling helpers (lathes, lofts, strands, cloth), a two-tone
  silhouette renderer with motion blur, and a behind-the-scenes witness camera that shows the real geometry.
- **The tooling**: headless rendering, original-vs-render strips and disagreement maps, shape measurement on the
  original, a camera solver scored against the original, scene probes, motion checks.
- **The delivery pipeline**: `./make_video.sh` renders the film and behind-the-scenes passes, scores every frame
  against the original and composes a 1920×1080 video with the soundtrack, the original and yours side by side,
  and a running score.
- **[PROMPT.md](PROMPT.md)**: the kickoff prompt for your agent, with rules that keep it on real 3D (full character
  models, no traced shapes, no 2D cut-outs, no gaming the score).
- **[docs/ADVICE.md](docs/ADVICE.md)**: what the first recreation learned the hard way.

## Setup

You need Node 22, ffmpeg on `PATH` and Python 3. Clone only this branch, so the finished recreation isn't in
your agent's reach:

```bash
git clone --single-branch --branch from-scratch https://github.com/Ni-Cobra/Bad-Apple-ThreeJS.git bad-apple
cd bad-apple
npm install && npx playwright install chromium
python3 -m venv .venv && .venv/bin/pip install numpy pillow

# the original video (not in the repo): reference for measurements, comparisons, scoring and the soundtrack
.venv/bin/pip install yt-dlp
.venv/bin/yt-dlp -f 230+140 --merge-output-format mp4 -o bad_apple_original.mp4 https://www.youtube.com/watch?v=FtutLA63Cp8

tools/cmp.sh smoke 0 2.5          # renders two stills and compares them with the original
```

If `python3 -m venv` fails for lack of `ensurepip`, use `python3 -m venv --without-pip .venv` and bootstrap pip
with `get-pip.py`.

## Kick off your agent

1. Open [PROMPT.md](PROMPT.md) and set **TARGET**. The default is the first 24 seconds, 0:00 – 0:24.
2. Start your agent in the repository and tell it: *Read PROMPT.md and follow it.*
   `AGENTS.md` (and `CLAUDE.md`, which imports it) gives it the commands and working rules.
3. Answer its questions about ambiguous beats, and review the strips and sheets it shows you at each milestone.

The result is `deliverable/bad_apple_3d.mp4`:

```bash
./make_video.sh --to 24 "Your agent's name"
```

## License and credits

The code is under the [MIT license](LICENSE). *Bad Apple!!* is an arrangement by Alstroemeria Records
(feat. nomico) of a song from ZUN's Touhou Project; the shadow-art video is by Anira. The characters belong to
Team Shanghai Alice. The original video is not included in this repository.
