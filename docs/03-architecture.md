# 03 — Architecture

```
index.html            import map (three from node_modules) + src/main.js
src/main.js           renderer setup, window.BA API for the headless renderer, interactive preview
src/film.js           the one persistent world: actors, props, cameras, the behind-the-scenes (BTS) helpers
src/shots/shots.js    the shot list: poses, IK reaches, camera paths, palette flips
src/shots/director.js evaluates the shot list at time t; BTS witness camera; lab (turntable) modes
src/shots/poses.js    shared base poses
src/characters/       humanoid rig + chain solver + swept sleeves, Reimu, Marisa, Patchouli, Remilia, Sakuya, Flandre
src/props/            apple, apple core, broom, castle, teacup, ceramic fragments, throwing knife, stars, dust
src/core/timeline.js  keyframe tracks, motion curves (flow), Catmull-Rom splines, easing, noise and PRNG
src/core/pipeline.js  accumulation renderer (motion blur + anti-aliasing), overlay passes
src/core/materials.js the two-tone palette (shared materials, one call recolors the world), the palette wipe
src/core/geo.js       lathes, capsules, hair shell, StrandBatch, ClothStrip
tools/render.mjs      headless Chromium (Playwright) → raw RGBA frames → ffmpeg
make_video.sh         (repo root) the whole deliverable: checks the setup, renders both passes, composes the video
tools/compose.sh      builds the deliverable video (tools/py/deliverable.py): original | final, BTS + score below
tools/server.mjs      static server for the project root (byte ranges, for seeking the original in the browser)
tools/cmp.sh          the review loop: stills + original-vs-render strip + disagreement map + agreement
tools/probe.mjs       poses the film at given times and evaluates an expression (joint positions, IK errors)
tools/tune.mjs        camera solver: grid or coordinate-descent search of a camera tweak against the original
tools/py/*.py         contact sheets and crops of the original, side-by-side stills, disagreement maps,
                      per-frame agreement score, blob tracking (blob.py: centroid, area, box, principal axis)
```

## Time is the only input

Every visible thing is a **pure function of `t`**: poses come from keyframe tracks or motion curves,
secondary motion from analytic sines plus gravity chains (no simulation state), the camera from splines, the
apple's flight from a closed-form curve, and arm reaches from an analytic two-bone IK. Three things follow from
that:

- **Any frame renders in isolation.** There's no warm-up, so any single instant can be rendered for review.
- **Motion blur is exact.** The pipeline samples the world at sub-frame times.
- **Renders are reproducible.** The same commit gives the same pixels.

**Tracks and motion curves.** `track()` eases from key to key, so every key is a stop: good for a single move,
robotic for a performance (each gesture bursts, stops dead, bursts again). `flow()` is an animator's
auto-clamped curve: a cubic through the keys whose velocity at a key comes from both neighbours (weighted by
the key spacing), zero only where a channel turns round or comes to rest, and capped so a segment never
overshoots (a fast move into a long hold settles instead of drifting past). Patchouli's performance (29 – 35 s)
and her camera path run on `flow`; each body part has its own curve so they overlap. Her right arm's keys,
FK angles or IK targets, are solved once into joint rotations and the curve runs through those, so one gesture
never switches between IK and FK.

The few values derived from the world, like the apple's release point, the catch point, where each bite
lands on the apple, the castle placement, knife release and blade-to-wing placement, are computed **once, lazily, from a fixed time**, so they stay deterministic too.

## Final render

`AccumPipeline` renders N sub-frames per output frame into a half-float target and averages them:

- **Motion blur.** Sub-frame *i* is evaluated at `t + (i/N − ½) · shutter`. The shutter is per shot, 1/45 to
  1/30 s, which mimics the heavy blur the original shows on fast moves.
- **Anti-aliasing.** Each sub-frame's camera gets a Halton (2, 3) sub-pixel jitter via `setViewOffset`.
- **Adaptive sampling.** 10 sub-frames normally, 32 in the shot ranges flagged `fast`, so long blur trails
  stay smooth instead of breaking into ghost copies.
- **Palette flips.** A sub-frame never crosses a palette flip (`CUTS`): `clampToCut` keeps it on the same side
  as its frame, so no frame blends the two palettes into gray.

- **Palette wipe.** While `film.wipe` holds an edge position, a full-screen pass (`wipeMat`) is drawn over each
  sub-frame: output = mask × (1 − frame) + (1 − mask) × frame, which inverts the two-tone image on one side of a
  straight, soft edge. Sub-frames sample the moving edge, so the motion blur softens it like the original's. At the
  end of the wipe the inverted night frame equals the day frame, so the palette switch there needs no cut.

All materials are unlit `MeshBasicMaterial` in two colors, so the output is a pure silhouette, exactly like
the source. `setPalette(inv)` recolors the background, the ink and the stars together.

## Behind the scenes

This is the same world, posed at the same `t`, seen by a **witness camera**. Each shot lists what belongs in its
scene (`btsFrame`: spheres around the characters and props; a weight fades an entering item in); the director
frames those together with the film camera, no closer than `btsDist`, from beside the camera's line of sight
(`btsSide`, with a slow sway). The close transitions (core fall, cup shatter, knife flight) keep a single target
(`btsTarget`) and a fixed direction (`btsAngle`). Its render is different:

- **Shading.** `MeshNormalMaterial` on everything, which shows depth and surface orientation.
- **Wireframe.** A translucent wireframe overlay pass, which shows the topology.
- **Helpers** (`src/core/btsRig.js`). An overlay scene holds a model of the film camera (body, lens,
  reels) with its frustum reaching out to the subject, and a ground grid that follows the action.
  It's drawn without the material override, so the helpers keep their colors. **No GL line primitives:** the
  headless software rasterizer draws a line that passes behind the witness camera as a large blocky "staircase"
  for a frame (the flicker of the old `CameraHelper` and `GridHelper`). The frustum is `LineSegments2` (screen-space
  quads, trimmed at the near plane in the shader) and the grid is a shader on a plane.
- **Hidden scenery.** Background-colored scenery that the final render hides, like Reimu's cliff, shows up
  here.

## Rendering headless

`tools/render.mjs` serves the repo, opens it in headless Chromium, calls `BA.renderFrame(t)` for each frame,
reads the pixels with `gl.readPixels`, flips the rows and pipes raw RGBA into ffmpeg (x264, CRF 16). This
machine's headless Chromium has no GPU access, so rendering falls back to llvmpipe (Vulkan on 24 CPU cores);
the flat-shaded scenes still render at a few frames per second.

## Solving cameras against the original

Two kinds of cameras are solved rather than keyed by hand:

- **Tracking cameras** (the apple's climb, the falling core, Patchouli righting herself, Remilia's falling cup). A table measured on the
  original gives the tracked object's screen position and size (and, for the core, its roll) at each drawing; the
  camera keeps a fixed orientation and is placed so the object lands exactly there, at the distance its measured
  size implies (`appleCam`, `trackCam`).
- **Keyed cameras** (the push-in onto Marisa's arm, Patchouli's shots). Each key was solved with `tools/tune.mjs`:
  it poses the film at the key's time, applies a candidate camera, renders at 320×240 and scores the agreement
  with the original, by grid search or coordinate descent. Unconstrained, the solver bends perspective to hide
  pose errors (a camera 1.8 m high one key, 0.02 m the next); constrained to a level dolly (distance, height,
  sideways offset, a small pitch) it gives a smooth path at nearly the same scores. The director applies the
  tweak under test through `director.tweak`; the shot code is unchanged until a result is copied into it.
