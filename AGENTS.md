# Agent guide

Recreate the *Bad Apple!!* silhouette video in true 3D with Three.js. **The task, its target span and its rules
are in [PROMPT.md](PROMPT.md).** How the engine works: [docs/ENGINE.md](docs/ENGINE.md). Lessons from an earlier
attempt: [docs/ADVICE.md](docs/ADVICE.md).

## Commands

```bash
npm install && npx playwright install chromium    # plus ffmpeg on PATH, .venv with numpy + pillow (README.md)
tools/cmp.sh NAME t1 t2 ...                       # render stills, compare with the original, print agreement
.venv/bin/python tools/py/pair.py tmp_out/cmp/NAME tmp_out/pair.png t1 t2   # large original/render/disagreement triples
.venv/bin/python tools/py/sheet.py tmp_out/sheet.png 6 240 1.0 1.1 1.2     # contact sheet of the original
node tools/probe.mjs --times 3.5 --expr "f.camera.position.toArray()"      # inspect the scene at time t
node tools/render.mjs stills --times 0,1 --query lab=NAME --out tmp_out/lab   # a turntable (src/shots/labs.js)
node tools/render.mjs stills --times 3.5 --view bts --out tmp_out/bts         # behind the scenes
.venv/bin/python tools/py/blob.py black 3.0 3.1                             # measure a shape on the original (--render DIR: ours)
node tools/tune.mjs --times 3.5 --look --search "x=0,y=1.6,z=4,tx=0,ty=1,tz=0"   # solve a camera key
.venv/bin/python tools/py/camkey.py 3.5 '{"x":0,"y":1.6,"z":4,"tx":0,"ty":1,"tz":0}'   # solved camera -> key line
tools/pairsheet.sh tmp_out/final.mp4 0 3 1.2 30 tmp_out/sheet.png               # motion: original | ours, every frame
node tools/motion.mjs --char NAME --joints wristR,head --from 3 --to 6           # joint speed/acceleration peaks
node tools/render.mjs video --from 0 --to 24 --out tmp_out/final.mp4             # full pass (several minutes on CPU)
.venv/bin/python tools/py/score.py bad_apple_original.mp4 tmp_out/final.mp4 24 tmp_out/score.csv
./make_video.sh --to 24 "TITLE"                                                 # the deliverable: deliverable/bad_apple_3d.mp4
node tools/server.mjs 8080                        # browser preview: http://127.0.0.1:8080/?play (?t=3.5&view=bts, ?lab=NAME)
```

## Rules

- **Everything is a pure function of time `t`.** No state carried between frames; values solved once from a
  fixed time are fine. Anything a shot animates (visibility, scale, materials) is set on every frame.
- **Register every top-level object with `film.add()`** in `src/film.js`; the shot playing at `t` shows what it
  uses. Look shots up by name, never by index.
- **Instant palette inversions go in `CUTS`**, between two frames, so motion blur never blends the two palettes.
- **Follow the original literally.** When a beat can be read two ways, measure it frame by frame or ask the human.
- **Measure, don't eyeball.** Check every change with `tools/cmp.sh` on the affected times and keep it only if the
  numbers and the strip agree. A red band on one side and blue on the other is a framing offset: fix the camera first.
- **Exact contacts use IK**, verified with `tools/probe.mjs`.
- **Motion flows:** `flow()` curves, one per body part, timed on full-rate sheets; no eased stops, no switching
  between IK and FK inside a gesture.
- **Every character gets a turntable** in `src/shots/labs.js` and must hold up from all sides.
- Renders go in `tmp_out/`, the video in `deliverable/` (both gitignored). Don't commit renders, the original video or `.venv`.
- Keep `docs/STORYBOARD.md` and `docs/STATUS.md` current (PROMPT.md).

## Code style

ES modules, two-space indentation, semicolons, single quotes, camelCase. Python tools: four spaces, snake_case.
No build step, formatter or test suite: the checks are the comparison tools.
