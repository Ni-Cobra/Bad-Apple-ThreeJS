# The engine

## Layout

```
index.html              import map (three from node_modules) + src/main.js
src/main.js             renderer, window.BA (used by the headless tools), the browser preview
src/film.js             the one persistent world: actors, props, film camera, behind-the-scenes helpers
src/shots/shots.js      the shot list: poses, camera paths, palette flips (starts with one empty shot)
src/shots/director.js   evaluates the shot list at time t; the behind-the-scenes witness camera
src/shots/labs.js       turntables: one model alone, the camera circling it
src/core/timeline.js    keyframe tracks, motion curves (flow), splines, easing, smooth noise, PRNG
src/core/geo.js         modeling helpers: lathe, limb, loft, ellipsoid, StrandBatch, ClothStrip
src/core/materials.js   the two-tone palette (shared materials, one call recolors the world), the palette wipe
src/core/pipeline.js    accumulation renderer: motion blur + anti-aliasing
src/core/btsRig.js      the film camera's model and frustum, the ground grid (behind the scenes)
tools/                  headless renderer, comparison, scoring, camera solver, probes, video composer
make_video.sh           the deliverable in one command
```

Add characters in `src/characters/` (one file each) and props in `src/props/`.

## Time is the only input

Every visible thing is a **pure function of `t`** (seconds of the original video). There is no simulation state,
no "previous frame" and no warm-up. Three things follow from that: any single frame renders on its own (so any
instant can be reviewed), motion blur samples exact sub-frame instants, and the same commit always renders the
same pixels. Secondary motion (hair, cloth, wind) must be analytic too: sines, `wobble()`, gravity chains
computed from the current pose.

A value derived from the world (where a thrown object leaves a hand, where a camera must start to continue
another) may be **solved once, lazily**, by posing the world at a fixed other time and caching the result. Such
solves pose other shots, so run them before posing the requested time, reset visibility afterwards, and keep
their order stable when one depends on another.

Check determinism now and then: render a handful of frames in reverse order, interleaved with behind-the-scenes
frames, and compare them pixel for pixel with a forward render. Anything a shot animates (visibility, scale,
material, render order) must be set on every frame, or seeking backwards shows stale values.

## The world

`Film` holds everything. Build each actor and prop once in its constructor and register the top-level object with
`this.add(obj)`. Before every frame the director hides all registered objects; the shot playing at that time
shows and poses what it uses. Units are meters, +Y is up, and the film camera is a `PerspectiveCamera` (30° fov to
start with) at 4:3, the original's aspect (480×360; we render at 960×720).

Everything is drawn with two unlit materials from `core/materials.js`: `ink` (the figures) and `paper` (the
background color). `setPalette(0)` gives black on white, `setPalette(1)` white on black, and it recolors every
shared material at once. Scenery drawn with `paper` is invisible in the film but real in the world: a floor or a
cliff to stand on shows up behind the scenes.

## Shots and the director

`src/shots/shots.js` exports `SHOTS` and `CUTS`. The header of that file lists a shot's fields: its span
(`t0`, `t1`), `apply(f, t)` (show, pose, place the camera, set the palette), the motion-blur `shutter`, `fast`
spans, and the behind-the-scenes framing (`btsFrame`, `btsTarget`, `btsDist`, `btsSide`, `btsAngle`, `groundY`).
`camLook` and `camOrbit` place the film camera.

- The director plays the **first** shot whose `[t0, t1)` holds `t`. Give every shot a real end, and let only the
  last one run on (`t1: 1e9`). Find shots by **name**, never by index.
- Transitions live inside shots as continuous camera and actor motion. A shot can call another shot's `apply` to
  continue from it.
- Instant palette inversions go in `CUTS` so no frame's motion-blur sub-samples mix the two palettes. Put the flip
  between two frames: `(frame + 0.5) / 30`. A palette wipe (a soft straight edge sweeping across, inverting
  behind it) is `f.wipe = k` with `wipeMat` in `core/materials.js`.

## Animation helpers (`core/timeline.js`)

| Helper | Use |
| --- | --- |
| `flow(keys)` | **Performances and camera paths.** A motion curve: velocity flows through each key, zero only where a channel turns round or rests, capped so nothing overshoots. Values can be numbers, arrays or nested objects (a whole pose). A hold is a slow drift, not a duplicated key. |
| `track(keys)` | Eased key to key: every key is a stop. Right for a single move that must hit a pose exactly (a release, a contact), wrong for a performance. |
| `spline(keys)` | Uniform Catmull-Rom: smooth, but it drifts through holds. Good for measured tables (screen positions sampled at even times). |
| `prog`, `clamp`, `lerp`, `smooth`, `Ease` | Progress and easing. |
| `wobble(t, seed)` | Smooth deterministic noise for idle motion, wind, sway. |
| `rng(seed)` | Deterministic PRNG for procedural modeling (strands, petals, stars). |

## Modeling helpers (`core/geo.js`)

`lathe(profile)` (surfaces of revolution with optional oval sections and a radial shaping function: heads,
torsos, skirts, hats), `limb(len, r0, r1)` (a tapered capsule hanging along -Y from its joint), `loft(rings)`
(closed shapes through cross-sections: ribbons, wings, folds), `ellipsoid`, `mesh(geo, mat = ink)`.
`StrandBatch` is a batch of tapered tubes re-shaped every frame from polylines (hair locks, bristles, ribbon
tails); `ClothStrip` is a grid re-shaped every frame by a callback (capes, sleeves, scarves).

A rig is a hierarchy of `THREE.Group` joints with rigid, overlapping parts attached; for a silhouette film that
reads exactly like a skinned mesh and stays trivially deterministic. You will want a pose function (joint angles
in degrees, mirrored for the right side) and an analytic two-bone IK for arms and legs.

## Rendering (`core/pipeline.js`)

A frame is the average of N sub-frames rendered into a half-float target: sub-frame *i* is posed at
`t + (i/N − ½) · shutter` (motion blur, like the original's heavy blur on fast moves) with a Halton sub-pixel
jitter (anti-aliasing). N is 10, or 32 inside a shot's `fast` spans so long streaks stay smooth. The shutter is
1/45 s unless the shot sets it (a function of `t` works: a shorter shutter keeps a small fast part crisp).

## Behind the scenes

The same world at the same `t`, seen by a witness camera: `MeshNormalMaterial` on everything, a faint
wireframe overlay, a model of the film camera with its frustum reaching the subject, and a ground grid where the
shot gives `groundY`. The director frames the shot's `btsFrame` spheres together with the film camera, from beside
its line of sight. This view is how anyone checks that the film is real 3D: characters must hold up from here.

- **No GL line primitives** in the helper scene (`LineSegments`, `CameraHelper`, `GridHelper`): the headless
  software rasterizer draws a line passing behind the witness camera as a large blocky shape for a frame. The
  frustum uses `LineSegments2` and the grid is a shader on a plane.
- Point sprites don't take the normal material: register them with `film.add` and list them in `film.btsHide`.
- Large scenery can be left out of the wireframe pass: `film.wireMat.userData.skip`.
- `?nowire` and `?nohelp` in the URL turn those overlays off.

## Turntables

`src/shots/labs.js` maps a name to a function that shows one model at the origin and circles the camera around it
(`turntable()`). `?lab=NAME` in the browser, `--query lab=NAME` for `tools/render.mjs`, and `view=bts` for the
shaded look. Add one for every character and major prop: it is where proportions and the model's other sides get
checked.

## Tools

Everything runs headless (Playwright + Chromium + ffmpeg). Without a GPU, Chromium renders on the CPU: a still
takes about a second, a full pass several minutes.

| Command | What it does |
| --- | --- |
| `node tools/server.mjs 8080` | Browser preview: `/?play` (click for audio), `/?t=9.5`, `/?t=9.5&view=bts`, `/?lab=NAME&t=1` |
| `node tools/render.mjs stills --times 1,2.5 [--view bts] [--query lab=NAME] --out DIR` | Render instants to PNG (`final_<t>.png`) |
| `node tools/render.mjs video --from A --to B [--view bts] --out F.mp4` | Render a span |
| `node tools/render.mjs stills ... --tweak "(f, t, T) => { ... }"` | Render with a change applied after the shot (debugging) |
| `tools/cmp.sh NAME t1 t2 ...` | **The review loop:** stills, an original-over-render strip, a disagreement map, per-frame agreement (`tmp_out/cmp/`) |
| `.venv/bin/python tools/py/pair.py tmp_out/cmp/NAME OUT.png t1 t2` | Large original / render / disagreement triples |
| `.venv/bin/python tools/py/sheet.py OUT.png COLS WIDTH t1 t2 ...` | Labeled contact sheet of the original |
| `.venv/bin/python tools/py/crop.py OUT.png COLS x0 y0 x1 y1 t1 t2 ...` | Crops of the original at full resolution |
| `.venv/bin/python tools/py/blob.py black\|white [--roi ...] [--render DIR] t1 t2 ...` | Measure the ink blob: centroid, box, area, principal axis |
| `node tools/probe.mjs --times 3,3.1 --expr "f.camera.position.toArray()"` | Evaluate an expression on the posed world |
| `node tools/tune.mjs --times 3,3.5 --look [--space NAME] --search "x=..,y=..,z=..,tx=..,ty=..,tz=.."` | Solve a camera key against the original (coordinate descent) |
| `node tools/tune.mjs --times ... --grid "dx=-0.1,0,0.1" --tweak "(f, t, p, T) => ..."` | Grid search over any tweak |
| `.venv/bin/python tools/py/camkey.py T '{"x":..}'` | A solved camera as a key line (target moved to 1 m) |
| `tools/pairsheet.sh RENDER.mp4 T0 START DUR FPS OUT.png` | Full-rate motion sheet, original next to ours |
| `.venv/bin/python tools/py/tip.py RENDER.mp4 T0 START END` | Track a limb's extreme point, original vs ours |
| `node tools/motion.mjs --char NAME --joints a,b --from A --to B` | Joint speed and acceleration peaks (`--char camera` for the camera) |
| `.venv/bin/python tools/py/seg.py A B R1.mp4 T01 [R2.mp4 T02]` | A/B agreement per 0.1 s of partial renders |
| `.venv/bin/python tools/py/pops.py ORIG.mp4 RENDER.mp4 DUR` | Frame-to-frame jumps the original doesn't have |
| `.venv/bin/python tools/py/score.py bad_apple_original.mp4 F.mp4 DUR [OUT.csv]` | Per-frame agreement, per-second bars |
| `./make_video.sh [--to SECONDS] "TITLE"` | **The deliverable:** both passes, score, compose into `deliverable/bad_apple_3d.mp4` |

The second argument of `pairsheet.sh`, `tip.py` and `seg.py` is the film time of the render's first frame: 0 for a
full render, or the `--from` of a partial one.

**Reading a disagreement map:** gray = dark in both, red = dark only in the original, blue = dark only in ours.
In white-on-black passages "dark" is the background, so the colors swap meaning. A red band on one side and a blue
band on the other is a framing offset: fix the camera before the model.

## The score

`score.py` decodes both videos at 160×120 grayscale and counts the pixels on the same side of mid-gray, per
frame. It is a good guide to framing and timing, and blind to small details (a face, fingers, a bite mark), to
whether a shape is the right *thing*, and to how motion feels. Treat it as one signal among the strips, the
turntables and the full-rate sheets.
