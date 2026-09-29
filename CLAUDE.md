# CLAUDE.md

3D recreation of the *Bad Apple!!* silhouette video in Three.js: every character, prop, camera move and
transition is modeled and animated from scratch, rendered as a two-tone film and as a behind-the-scenes (BTS)
view. 0:00 – 1:10 is done. **Read [docs/08-handoff.md](docs/08-handoff.md) before starting work**; it has the
setup, the working loop, the traps and the lessons learned. **Before animating a character, read
[docs/09-animating-motion.md](docs/09-animating-motion.md)**: poses that match the original can still move like
a robot.

## Commands

```bash
npm install && npx playwright install chromium    # plus ffmpeg on PATH, .venv with numpy + pillow
tools/cmp.sh NAME t1 t2 ...                       # render stills, compare with the original, print agreement
.venv/bin/python tools/py/pair.py tmp_out/cmp/NAME tmp_out/pair.png t1 t2   # large original/render/disagreement triples
node tools/probe.mjs --times 14.79 --expr "f.apple.position.toArray()"   # inspect the scene at time t
node tools/render.mjs stills --times 0,1 --query lab=marisa --out tmp_out/lab # turntables (reimu|marisa|reimuhead|patchouli|patchead|hand|remilia|remhead|sakuya|flandre|youmu|yuyuko|cup|props|apple|core)
node tools/render.mjs stills --times 14.78 --view bts --out tmp_out/bts       # behind the scenes
.venv/bin/python tools/py/blob.py black 29.0 29.1                         # measure a shape on the original (--render DIR: ours)
node tools/tune.mjs --times 30.5 --stage --search "x=-2.8,y=0.8,z=0,tx=-0.8,ty=0.8,tz=0"   # solve a camera key
.venv/bin/python tools/py/camkey.py 30.5 '{"x":-2.8,"y":0.8,"z":0,"tx":-0.8,"ty":0.8,"tz":0}'  # solved camera -> key line
node tools/render.mjs video --from 0 --to 70 --out tmp_out/final.mp4            # full pass; CPU render takes several minutes
.venv/bin/python tools/py/score.py bad_apple_original.mp4 tmp_out/final.mp4 70 tmp_out/score.csv
./make_video.sh "TITLE" [--reuse]                                           # the deliverable: both passes + compose -> deliverable/bad_apple_3d.mp4
tools/compose.sh tmp_out/final.mp4 tmp_out/bts.mp4 70.5 deliverable "TITLE"  # compose only (after a BTS pass too)
node tools/server.mjs 8080                                                # live preview: http://127.0.0.1:8080/?play (?t=9.5&view=bts, ?lab=reimu)
tools/pairsheet.sh tmp_out/final.mp4 0 32.6 1.2 30 tmp_out/sheet.png              # motion: original | ours, every frame
.venv/bin/python tools/py/tip.py tmp_out/final.mp4 0 31.1 32.4                # a hand's track, original vs ours
node tools/motion.mjs --char patchouli --joints wristR,elbowR --from 29 --to 35   # joint speed/acceleration peaks
.venv/bin/python tools/py/seg.py 30.8 34.3 tmp_out/final.mp4 0 tmp_out/pol/a.mp4 30.8   # A/B score of a partial render
```

`bad_apple_original.mp4` (repo root) is required by every comparison and is not committed. It is the 480×360, 30 fps
YouTube upload `FtutLA63Cp8`: `.venv/bin/pip install yt-dlp && .venv/bin/yt-dlp -f 230+140 --merge-output-format mp4
-o bad_apple_original.mp4 https://www.youtube.com/watch?v=FtutLA63Cp8` (it matches the scores in the docs). If
`.venv/bin/python` is missing, recreate it: `python3 -m venv .venv && .venv/bin/pip install numpy pillow` (without
`ensurepip`: `python3 -m venv --without-pip .venv` and bootstrap pip with `get-pip.py`).

## How the code works

- **Everything is a pure function of time `t`** (no simulation state). `src/shots/shots.js` is the shot list:
  poses, IK reaches, camera paths, palette flips. `src/shots/director.js` evaluates it; `src/film.js` holds
  the one persistent world. Details in [docs/03-architecture.md](docs/03-architecture.md).
- Characters: `src/characters/` (rig, chain solver and swept sleeves in `humanoid.js`; `reimu.js`, `marisa.js`,
  `patchouli.js`, `remilia.js`, `sakuya.js`, `flandre.js`). Props: `src/props/props.js`. See [docs/04-characters.md](docs/04-characters.md).
- A few values are solved once per page load by posing another instant (release point, catch point, bite
  marks, castle placement, the night camera's first key, the core's fall, Patchouli's stage, the hand swap, the
  cup's drop and its camera). Keep their order,
  and look shots up by name, never by index.
- Instant palette inversions must be listed in `CUTS` so motion blur never blends the two palettes (the wipe
  at 27.3 s needs none).

## Rules for working here

- **Follow the original literally.** Two-tone frames are ambiguous (front vs back view, a fall vs a camera
  overtaking a rising object). When a beat can be read two ways, measure the motion frame by frame or ask
  the user before staging it. Prefer the original's own devices over inventing rules.
- **Measure, don't eyeball.** Check every change with `tools/cmp.sh` on the affected times and keep it only
  if the numbers and the strip agree. In a disagreement map, a red band on one side and blue on the other
  is a framing offset: fix the camera before the model.
- **Exact contacts use IK** (`Humanoid.reach`, `reachApple`), verified with `tools/probe.mjs`. The catch at
  `T_FLIP` must match within a few mm or the apple jumps at the flip.
- **Tables measured on the original** (`APPLE_SCREEN`, `APPLE_AREA`, `BEAT`/`T_DIP`/`T_SWAY`, the wide-shot bob,
  `CORE_SCREEN_KEYS`, `CORE_AREA_KEYS`, `ROLL`, `PAT_SCREEN`, `WIPE_K`, the finger wag, `REM_DIP`,
  `CUP_SCREEN_KEYS`, `CUP_WIDTH_KEYS`) are data: re-measure, don't retune by eye.
- **Solve camera keys with `tools/tune.mjs`** once the pose roughly matches, constrained to the original's move
  (unconstrained, it hides pose errors with absurd perspectives). Re-solve them after model or pose changes.
- Characters bop on the song's beat (0.4209 s); measure each one's phase and depth on the original.
- **Motion flows.** Animate performances with `flow` motion curves (velocity carried through the keys, one curve
  per body part so they overlap), timed on full-rate contact sheets of the original; not eased `track` keys, which
  stop at every key. Don't switch between IK and FK inside a gesture: solve IK keys into joint rotations first.
  Check speed and acceleration peaks with `tools/motion.mjs`. The method and its traps are in
  [docs/09-animating-motion.md](docs/09-animating-motion.md).
- The agreement score has blind spots (small details, composition trade-offs). Look at the strips as well,
  and write trade-offs and rejected experiments into the docs.
- Renders go in `tmp_out/` (gitignored), the deliverable video in `deliverable/` (gitignored; `./make_video.sh`). Don't commit the video, renders or `.venv`.

## Docs to keep current

When staging or models change, update [docs/02-storyboard.md](docs/02-storyboard.md) (beat table),
[docs/05-transitions.md](docs/05-transitions.md), [docs/07-status.md](docs/07-status.md) (scores from a full
render, known issues) and, for lessons or rejected attempts, [docs/06-agent-process.md](docs/06-agent-process.md)
and [docs/08-handoff.md](docs/08-handoff.md).
