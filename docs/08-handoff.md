# 08 — Handoff: how to pick up this project

This page is for whoever continues the work, human or AI agent. It covers what state the project is in, how to
set up a machine, the working loop, the traps in the code, and what was learned the hard way. Read
[07-status.md](07-status.md) for the numbers and known issues, and [06-agent-process.md](06-agent-process.md)
for the full history of decisions. Before animating a character, read
[09-animating-motion.md](09-animating-motion.md).

## 1. Where things stand

- **Staged:** 0:00 – 1:10.5 of the video. Reimu (the apple girl), Marisa (the witch on the broom), Patchouli
  (the girl the apple core turns into), Remilia (the girl with bat wings Patchouli turns into), Sakuya (the maid), and Flandre (the girl with crystal wings) are modeled from
  the original's silhouettes. 0:00 – 0:24: a zoom-out while
  Reimu bops, an apple that keeps rising, Marisa snatching it from above with the palette inverting on the
  catch, and her biting it. 0:24 – 0:35: Marisa holds out the eaten core and drops it, the camera falls with it,
  the palette wipes back, the core swells and turns into Patchouli, who rights herself, lands, turns, gestures
  and wags a finger. 0:35 – 0:41: the camera pushes onto her hand, which turns into Remilia's hand; Remilia bops,
  turns holding out a teacup and drops it over the terrace's edge; the camera falls with the cup. 0:41 – 0:47: the cup continues falling, the palette flips,
  ceramic fragments separate and one turns into Sakuya, who spins upright and begins an arm gesture.
  0:47–0:56.5: Sakuya raises and throws a knife; its edge becomes Flandre’s wing. Flandre turns, opens her
  palms, then lowers her head and curls her fingers as the palette inverts.
  0:56.5–1:10: the incoming katana reveals Youmu; she turns, cuts down and whirls the blade up. The camera pulls
  back past a cherry tree (Youmu and Yuyuko on either side of it), pushes in and pans off the crown onto Yuyuko, who
  opens a fan and turns into profile before the camera leaves her.
- **Current full-pass fidelity:** mean **0.9012**, median **0.9070** over **2115 frames (0–70.5 s)**, after the
  review pass (07-status.md). Before it: 0.9008 / 0.9070.
  The 1920×1080 deliverable and its score CSV were rebuilt on 2026-09-29 in `deliverable/`.
- **Previous full-pass fidelity:** mean 0.9007, median 0.9083 over 2100 frames. The 56.5–70 s span is 0.8643 / 0.8729
  after a polish by eye (07-status.md, milestone 6b); its lowest frame is 62.70 s (0.548).
- **Previous milestone fidelity:** mean 0.9093, median 0.9160 over 1695 frames. The existing 0–47 s span remains
  0.9194 / 0.9246; the new 47–56.5 s span scores 0.8595 / 0.8601. Its weakest frame is 50.4667 s
  (0.6412, the wing reveal). The weakest overall second remains 15 s. Remilia’s post-swap wrist speed
  is reduced from 2.76 to 0.95 m/s; the exact hand/finger transfer is preserved. See section 9 below.
- **Not started:** everything after 1:10.5. Yuyuko has left the frame; the large foreground petal is ready for the later boat transition.

## 2. Setting up a machine

| Need | How |
| --- | --- |
| Node (tested with 22) and the npm packages | `npm install` (three, playwright) |
| Headless Chromium | `npx playwright install chromium` |
| ffmpeg on `PATH` | Any recent build. A static build is fine; nothing needs `drawtext` or `ffprobe`. |
| Python 3 with numpy and pillow at `.venv` | `python3 -m venv .venv && .venv/bin/pip install numpy pillow`. The tools call `.venv/bin/python`. It is gitignored. |
| **The original video** at the repo root, named `bad_apple_original.mp4` | Not committed (gitignored). Every comparison, the score and the soundtrack need it. It is the YouTube upload `FtutLA63Cp8` at 480×360, 30 fps (format 230 + audio 140); [CLAUDE.md](../CLAUDE.md) has the yt-dlp command. |

On the machine used so far, `.venv` was a symlink into a temporary directory that got wiped between sessions.
If `.venv/bin/python` fails, recreate it with the command above. Where `python3 -m venv` fails for lack of
`ensurepip`, create it with `--without-pip` and bootstrap pip with `get-pip.py`.

Headless Chromium has no GPU there and renders on the CPU (llvmpipe): a still takes about 1 s, a full 35 s
pass about 6.5 minutes, the behind-the-scenes pass another 6.5. The tuner renders about 5 small frames a second.

## 3. The working loop

Everything is a pure function of time, so any instant can be rendered and checked on its own.

```bash
# look at the original: labeled contact sheet, or crops at full resolution
.venv/bin/python tools/py/sheet.py tmp_out/sheet.png 6 240 15.0 15.2 15.4 15.6
.venv/bin/python tools/py/crop.py tmp_out/crop.png 4 0.2 0.25 0.8 0.95 16.4 16.8 17.0 17.4

# large original / render / disagreement triples, for shape work
.venv/bin/python tools/py/pair.py tmp_out/cmp/NAME tmp_out/pair.png 34.2 34.4

# render with a debugging tweak applied after the shot (hide a part, move the camera, ...)
node tools/render.mjs stills --times 34.83 --out tmp_out/x --tweak "(f, t, T) => { f.patchouli.cap.visible = false; }"

# render stills and compare: strip + disagreement map + per-frame agreement
tools/cmp.sh try1 15.0 15.2 15.4          # -> tmp_out/cmp/try1.png, tmp_out/cmp/try1_diff.png

# measure a shape on the original (or our stills with --render DIR): centroid, area, box, principal axis
.venv/bin/python tools/py/blob.py black --roi 0.2,0,0.8,1 29.0 29.1

# solve a camera key against the original (coordinate descent; --rider / --stage spaces, or your own --tweak)
node tools/tune.mjs --times 30.5 --stage --search "x=-2.8,y=0.8,z=0,tx=-0.8,ty=0.8,tz=0" --step 0.2

# turn a solved camera into a key line (target moved to 1 m from the camera)
.venv/bin/python tools/py/camkey.py 36.1 '{"x":-0.28,"y":1.14,"z":-0.33,"tx":0.61,"ty":1.06,"tz":-0.42}'

# measure the 3D scene at a given time (positions, projected screen coordinates, IK errors)
node tools/probe.mjs --times 14.784,14.79 --expr "f.apple.position.toArray()"

# look at one model in isolation, or the witness camera
node tools/render.mjs stills --times 0,1,2 --query lab=marisa --out tmp_out/lab   # also patchouli, patchead, hand, core
node tools/render.mjs stills --times 14.78 --view bts --out tmp_out/bts

# play it live in the browser (no export): http://127.0.0.1:8080/?play, or ?t=14.78&view=bts for one instant
node tools/server.mjs 8080

# full pass, score, the deliverable video (deliverable/bad_apple_3d.mp4)
node tools/render.mjs video --from 0 --to 70.5 --out tmp_out/final.mp4
.venv/bin/python tools/py/score.py bad_apple_original.mp4 tmp_out/final.mp4 70.5 tmp_out/score.csv
node tools/render.mjs video --from 0 --to 70.5 --view bts --out tmp_out/bts.mp4
tools/compose.sh tmp_out/final.mp4 tmp_out/bts.mp4 70.5 deliverable "TITLE"
# or all of the above in one go (checks the setup, renders both passes in parallel): ./make_video.sh "TITLE"
```

Reading a disagreement map: gray = both dark, **red = dark only in the original, blue = dark only in the
render**. In the night section "dark" is the background, so there red is where *our* figure is and blue
where the original's is. A red band on one side and a blue band on the other means a framing offset, not
a modeling error. Fix the camera first.

Keep each change small, re-run `tools/cmp.sh` on the affected times, and keep it only if the numbers and the
strip agree it's better. Record what was rejected (see 06, section 7).

## 4. Traps in the code

- **One-time solves.** `src/shots/shots.js` computes a few values lazily, once per page load, by posing the
  scene at another time: `releasePos` (the apple leaving Reimu's hand), `CATCH`/`CATCH_LOCAL` (the snatch
  point), `biteMarks` (where each bite lands on the apple), `craneY`, `nightPath` (whose first key copies the
  apple shot's camera at the flip), the castle placement (`placeCastle`), `wristDrop` (her wrist when she lets
  go), `fall` (the falling core's camera frame and start, from the close-up at `T_DROP`), `stage` (Patchouli's
  ground point, from the fall) and `patPath` (whose first key continues the tracking camera). The headless
  tools load a fresh page each run, so they always pick up edits. Keep their order: bites before the castle,
  the castle before the fall, the fall before the stage, all before posing the current time. **Find shots by
  name**, never by index: `placeCastle` once posed `SHOTS[SHOTS.length - 1]` and silently used the wrong shot
  when shots were added.
- **The palette flip is a cut for motion blur.** `CUTS = [T_FLIP, T_SHATTER]`; `clampToCut` keeps sub-frames on one
  side. If you add another instant inversion, add it to `CUTS`. The wipe (27.25 – 27.4) needs none: at its
  end the inverted night frame is the day frame.
- **Measured tables drive the fall.** `CORE_SCREEN_KEYS`, `CORE_AREA_KEYS`, `ROLL`, `PAT_SCREEN`, `WIPE_K` and the
  finger wag were measured on the original. The tracking camera follows whatever the core or her hips do, so
  changing their world motion changes the behind-the-scenes view but not the final frame; to change the final
  frame, re-measure the tables.
- **Shots are found by time, first match wins.** `Director.shotAt` returns the first shot whose `[t0, t1)` holds
  `t`. When a shot is added after one that ends at `1e9`, give the earlier one a real end, or the new shot never
  plays.
- **The Remilia shot drives the Patchouli shot during the morph.** Before `T_SWAP1` it calls the Patchouli shot's
  `apply` (which poses Patchouli and places the camera), then shrinks her; `stageCam` is the one stage-space camera
  path for both (its keys are `PAT_KEYS` then `REM_KEYS`). Its one-time solves: `ensureSwap` (Patchouli's hand at
  `T_SWAP`, which Remilia's takes over), `ensureCupDrop` (the cup at `T_CUP`) and `ensureCupCam` (the tracking camera's
  start, from the stage camera at `T_CUP`); they pose the characters at other times, so they run before this time is
  posed, and the shot hides Patchouli after the morph (a solve leaves her posed and visible otherwise).
- **Scales are not reset by `pose()`.** The morph scales Patchouli's neck (her head shrinks first), Remilia's right
  shoulder (her arm is hidden until the swap), her right hand and her index finger; whoever uses them sets them every
  frame.
- **A swap between two objects goes between frames.** `T_SWAP` = 36.517 is halfway between two frames, so no frame's
  motion-blur samples mix the two arms.
- **The terrace.** Patchouli's floor was a disc under her; it is now a disc whose edge runs just in front of where
  she and Remilia stand (stage z = −0.28), so the cup falls past it. The cup breaks below the terrace at 42.12 s; no impact floor is visible in the reference.
- **Patchouli moves on motion curves.** `patYaw`, `patLook` (where her face points), `patTorso` (twist, head
  pitch, the book), `ARM_KEYS` and `patHand` are separate `flow` curves. `ARM_KEYS` mixes FK angles, IK targets
  (hips space) and the pointing pose; `ensureArm` solves them once into joint rotations (after `ensureStage`), so
  changing a key means reloading, and a new IK key needs a pole on the same side as its neighbours' or the upper
  arm spins between them. Don't go back to `track` with eased keys for a performance: every key becomes a stop.
- **Reimu's and Marisa's pose tracks are split.** `reimuPoseTrack` is a motion curve up to the wind-up
  (`reimuArmFlow`), then eased keys for the throw (`reimuThrow`: the release pose at `T_RELEASE` fixes the
  apple's path). `riderPoseTrack` is eased keys for the catch (`riderCatch`, to 15.3 s), a motion curve
  (`riderFlow`), then eased keys for the let-go (`riderLetGo`). They meet where both sides are at rest: keep the
  shared key identical on both sides if you edit one.
- **Scale is not part of `pose()`.** Patchouli's root scale is set by the shot (she grows during the morph) and
  the core's by whoever holds it; set them every frame.
- **The catch must meet exactly.** Marisa's flight is placed from the catch point (`RIDER_OFF`), and IK puts
  her hand on the apple at `T_FLIP`. If you move her, her pose or the apple's path, probe the apple just
  before and after `T_FLIP` (it should match within a few mm) or the apple jumps at the flip. `reachApple`
  needs its 6 passes when the elbow is bent.
- **Side-saddle and Euler order.** Her hips turn 70° and the spine turns back. A forward lean on the
  hips or spine then tilts sideways, and a hip pitch swings the legs. Leans go on the chest.
- **Mirrored limbs.** Right-side joints take the same anatomical angles as the left (y and z are mirrored
  inside `pose()`); IK works in world space and needs no mirroring.
- **Measured tables.** `APPLE_SCREEN`/`APPLE_AREA` (the apple's path and size on screen), `BEAT`/`T_DIP`/
  `T_SWAY` (Reimu's bop) and the wide-shot bob were measured on the original. Don't retune them by eye;
  re-measure.
- **The score has blind spots.** It compares thresholded pixels at 160×120. The hunch of a small rider or a
  bite mark barely registers, and a change that matches the original's composition can still score lower
  (lowering the broom at the catch did). Look at the strips too, and state the trade-off in the docs.

## 5. What was learned

These cost the most time or rework. They are listed roughly in order of impact.

1. **Read the original literally; silhouettes are ambiguous.** Three stagings had to be redone after review:
   an invented 180° camera orbit (the original is a zoom-out while she bops; the "back view" was her
   twisting), a falling apple (it keeps rising and is snatched from above), and a held apple (she bites it).
   When a frame can be read two ways, measure motion over time (track a shape frame by frame) or ask the
   reviewer before staging. Ask early: it's cheaper than restaging.
2. **The original's devices beat my own rules.** I hid the palette flip behind a lens-covering dive because
   "a cut must be hidden". The original simply inverts on the catch with the framing unchanged.
3. **Measure, don't eyeball.** Row spans and bounding boxes found proportion errors (a camera 1.35× too
   close, bristles twice too long). Centroid tracking turned the apple's path from a guess into 0.98–0.99
   agreement. Tracking the bow's height gave the exact bop tempo.
4. **Framing errors dominate.** Most low scores were the camera, not the models: disagreement maps show it
   at a glance. Align the framing before touching shapes.
5. **Contacts need IK, verified with a probe.** Hand meets apple, apple meets mouth: impossible to tune with
   keyframes, exact with IK. `tools/probe.mjs` measures the error and projects joints into the camera, which
   is also how the catch framing problems were diagnosed (a knee closer to the lens than the apple).
6. **Physical plausibility solves framing problems too.** The skirt was hanging into the catch close-up;
   letting it blow back in the wind, as it would at flight speed, fixed that.
7. **A solver needs constraints.** The camera tuner found higher scores with absurd cameras until it was limited
   to the move the original makes. The same goes for poses: fix what the silhouette plainly shows (which arm,
   which way she faces, where the book is) before letting numbers pick the rest.
8. **Motion must flow, not snap.** Poses matching the original frame by frame still looked robotic when each key
   eased to a stop and the arm switched between IK and FK. Time keys on full-rate contact sheets of the
   original, run them through motion curves (`flow`), let parts overlap, and check the speed and acceleration
   peaks of the main joints with `tools/motion.mjs`. The whole method is in
   [09-animating-motion.md](09-animating-motion.md).
9. **Keep experiments reversible and record the rejected ones.** Several reasonable-sounding changes
   scored worse (forward-lean catch, lower broom, apple drift). The docs say so, which saves the next person
   from retrying them.

## 6. Suggested next steps

1. Continue after 1:10.5 in chunks of 6 – 20 s: contact sheets of the original, a beat table in the format of
   [02-storyboard.md](02-storyboard.md), then staging, checking each ambiguous beat with the reviewer first. Next is
   the continuation of the petal transition after Yuyuko leaves the frame.
2. Solve camera keys with `tools/tune.mjs`, but only once the pose roughly matches, and constrained to the move
   the original makes (a level dolly, an orbit about a point): unconstrained, it bends perspective to hide pose
   errors.
3. Revisit the 15 s catch close-up and whip pan, the 17 s pull-back and the 26.4 s release (see 07's known issues).
4. When new characters appear, model them from measurements as in 04 (row widths against a frame of the original
   are quick and decisive), and add a `?lab=` turntable for each.


## 7. New handoff notes for 41–47 s

- `ensureFracture` depends on the existing cup and camera solves. It saves their transforms at 42.12 and
  resets visibility after the one-time setup. The `cup-shatter` shot starts at 41; Remilia has a finite end.
- `fragmentScreen` records approximate fragment centers at the wide breakup. Shapes are procedural cup
  sectors with unequal lower fracture edges, not extracted images. Separation and concavity still need refinement.
- `sakuyaGrowth` takes the model to full human scale. Camera distance grows with it; changing growth alone
  changes the BTS staging, while `sakuyaFrame` controls final framing. The incoming frame shares `shardFrame(44)`.
- `ensureSakuyaArms` caches quaternion curves from IK/FK authoring poses. Reload the page after changing keys.
  Head/chest/shoulder scales are assigned every frame by the shot. `?lab=sakuya` is available.
- Do not treat the high score on the black-background spinning shard as a precise shape match: most pixels
  are background. Inspect the pair sheets as well as the scores. The continuation through 56.5 s is described below.

## 8. Full 0–47 s polishing pass

- The 36.517 s swap copies the actual finger-base, finger-middle and thumb quaternions, not just grip values.
  Patchouli's wag modifies the index after the grip is set. Copying grip alone silently loses that rotation.
  Her old arm hides exactly at the swap, and her body starts shrinking only then. Remilia uses the same fist
  hand construction; `thumbOut` spreads in the palm's YZ plane with a bent tip.
- Reset Patchouli's shoulder visibility and Remilia's index scale every frame. A 31-frame reverse-order
  check, interleaving BTS views, reproduced every pixel. Wrist, index tip and thumb tip match across
  `T_SWAP ± 0.00001` within 0.001 mm; the catch contact differs by 0.384 mm across the same-sized time step.
- Camera corrections are localized: Reimu 7.3–11.7, broom whip/bite 15.32–17.2, core close-up 25.7–26.42,
  and Remilia's reveal 36.3–36.85. They return to zero before dependent shot handoffs.
- Marisa's catch skirt trails farther back. Sakuya's skirt narrows and lengthens during the upright reveal.
  Ceramic sectors have varying lower cuts, leaving crescent rims and a pointed leading fragment.
- Historical pre-polish 47-second passes and source snapshots were in `tmp_out/polish47/baseline/`. Final comparison stills
  were in `tmp_out/cmp/polish47-final/`; the 30 fps hand contact sheet was `tmp_out/polish47/hand-final.png`.


## 9. Previous handoff: slower arm, knife and Flandre through 56.5 s

- Remilia’s right-hand descent now ends at 37.05 s and joins the cup by 37.12. Wrist orientation, scale and
  elbow pole change over the longer interval. Keep the exact swap at 36.5167 and preserve all finger quaternions.
- `sakuyaYaw` remains unwrapped through her right-facing knife pose and quick throw. Both arms stay on the
  cached quaternion curve. The skirt settles after 47 s and the waist bow has pointed folds.
- `ensureKnife()` saves the held prop and camera at 49.133333. `knifeFrame` uses measured knife bounds;
  its rightward screen motion comes from the camera overtaking its leftward flight.
- `ensureFlandre()` aligns the wing tip and camera with the knife at 50.15. Run lazy solves before posing
  the requested time: they temporarily pose other shots, then reset visibility.
- The wing’s arch is a deformation from saved vertex positions, not repeated transforms of the last frame.
  Its tip and crystal attachments must follow the same arch. Crystal profiles need `smooth: 1` to keep facets.
- Flandre’s body yaw, head look, wings and arm curves overlap. Each hand turns palm-up before the final
  head bow and finger curl. Frame 1686 (56.20 s) starts the last inversion; its between-frame time is in `CUTS`.
- That milestone stopped at 56.5 s. The next blade is now staged in section 10.
- Validation: 33 reversed-time/BTS-interleaved frame checks pass exactly. Across tiny time steps, the Remilia
  swap is within 0.002 mm, knife release within 0.045 mm, and knife-to-wing tip/camera within 0.035 mm.
- Generated tests and renders are in `tmp_out/extend56/`. The prior full media was absent in this session;
  the current delivery is a fresh render of every frame, with a production split at 44 s.


## 10. Current handoff: sword, tree and fan through 1:10

- The new shot ranges are `blade-reveal` (56.5–58.083333),
  `youmu` (58.083333–62.65), `cherry-tree` (62.65–63.85), and `yuyuko` (63.85–70).
- `ensureGarden` depends on `ensureFlandre`. It evaluates the outgoing camera once, places the garden
  parent group, then clears lazy-solve visibility. `T_GARDEN` belongs to `CUTS`.
- Katana origin is the grip, pointing along local +X. `swordGesture` controls position and unwrapped
  rotation; the **left** anatomical hand follows by IK, with the right hand at the hip. Using the wrong
  arm caused unreachable targets during the turn. Youmu has longer arms through constructor overrides.
- `makeKatana` uses a fixed white material for the main blade through the palette change; the sheaths
  use the common palette. Blade thickness and length are assigned every frame, including before the handoff.
- The tree and petals are real geometry. The tree shot is staged as in [05-transitions.md](05-transitions.md)
  section 18: marks for the wide shot (`YUYUKO_WIDE`, `YOUMU_WIDE`) and a close-up rig for Yuyuko turned 55° right
  (`YUYUKO_AT`, `yuyukoQuat`). **Characters change marks only when both marks are out of frame** (`T_MARKS`,
  `T_CLOSE`); if you move the camera path, the tree or a mark, re-check that on a full-rate sheet, or a character
  pops. `treePath` is solved once (`ensureTreePath`, after `ensureGarden`) from the outgoing and incoming cameras.
- Points near Yuyuko go through `gardenPointAt(mark, p)` (her first-mark coordinates moved onto the mark, turned with
  its yaw); the fan's orientation takes the mark's yaw too. Forgetting it turned the fan edge-on once.
- Yuyuko’s fan follows the left palm. Opening scales its pleated surface across the radial folds.
  `yuyukoSwayCorrection` measures the head centre every six reference frames: keep it when changing
  the broader framing keys, or the sideways sway drifts out of phase between the sampled stills. The close-up
  distance is `k[2] × 1.08`, measured on the head's extents after her head was enlarged.
- `swordGesture`'s angle is unwrapped (it passes 360° in the whirl at 61.0 – 61.4); keep it unwrapped when adding
  keys, or the blade spins the wrong way round.
- All new geometry, root scales, visibility, and animated transforms are reset from time. New shots pass
  reverse-order rendering with BTS interleaved. Sword/fan contact errors are below 1e-12 m in the sampled
  sweeps; camera positions join within 1e-8 m across 2 μs boundary probes.
- A 27-frame broad seek audit found one **pre-existing** mismatch at 28.5 s, reproduced using an archived
  clean `HEAD` checkout. New passage frames were pixel-identical in both orders; there were no browser errors.
  The old 28.5 s morph issue is recorded rather than changing an earlier shot during this extension.
- `tmp_out/extend70/` contains reference sheets, comparisons, motion reviews, camera experiments, verification
  scripts/results and prefix/suffix exports. The full passes are assembled at 56.5 s without re-encoding.
  The media that existed at the start of this session covered only 24 seconds, so both prefixes were regenerated.


## Scene fixes and 70.5 s endpoint

- Reimu now has a lower, shallower bow, shorter overlapping back locks and bangs outside the scalp.
  Her face is a static closed-lip profile (the original's mouth never opens; see 04).
- Flandre's crescent smile lies on her face surface (`Flandre.onFace`), shows from 55.35 s and follows the
  palette across 56.183333. It uses its own paper-colored material, updated each pose, and draws over the fringe
  at render order 1 without depth testing.
- During `blade-reveal`, sword meshes draw at order 2 without depth testing. The outgoing, enlarged
  Flandre torso had occluded them immediately before 58.083333. `poseYoumu` restores normal depth testing
  and order 0 every frame; preserve both assignments for arbitrary seeking.
- The receiving scabbard has no duplicate hilt. Both scabbards are worn on her hips (`SHEATH_WORN`, `wornSheath`);
  the empty one blends from its worn transform to the blade's axis over 61.2 – 61.55 s and the other hand holds
  that opening. The sword advances about 46 cm by 62.6 s.
- `heroPetal` is a separate cupped, notched mesh, posed after the Yuyuko camera from 68.1 s. Its measured
  screen path is converted to garden space, so it remains visible in BTS. The camera continues through
  70.5 s and leaves Yuyuko fully offscreen. The boat itself is still unstaged.
- The final shot ends at **70.5 s**. Render new exports with `--to 70.5`; old exports
  are not regenerated by a source edit. The full exports were rebuilt on 2026-09-29.
- Validation: `tmp_out/cmp/final_faces{,_diff}.png`, `tmp_out/cmp/final_late{,_diff}.png` and affected motion clips
  under `tmp_out/review-*.mp4`. A 32-frame forward/reverse check with BTS interleaved passed pixel-exactly,
  without browser errors. Sword/scabbard axis error is below 1e-12 m over four insertion samples.


## Behind the scenes and the delivery script

- **The BTS flicker was GL lines.** Single frames showed large blocky "staircase" shapes in the frustum's orange or
  the grid's gray. The headless software rasterizer draws a line that passes behind the witness camera that way; a
  larger near plane did not help. `src/core/btsRig.js` draws no line primitives: the film camera's frustum is
  `LineSegments2` (quads, trimmed at the near plane) and the grid is a fragment shader on a plane. Don't bring back
  `CameraHelper`, `GridHelper` or `LineSegments` in the helper scene.
- **The film camera is a model now** (body, lens, reels), sized with the witness distance, and its frustum
  ends at the subject instead of the 2000 m far plane.
- **Witness framing.** A shot's `btsFrame(f, t)` lists spheres (`{ at, r, w }`) for what is in its scene; the witness
  frames them and the film camera from beside the camera's line of sight. An item that appears mid-shot fades in
  with `w` (Marisa in `apple-rise`), and only items posed at that time may be read (the rider is stale before 14.4 s).
  The close transitions keep `btsTarget` + `btsAngle`. The blade reveal frames Flandre swelling about the lens,
  then the blade.
- **Folders.** Scratch renders go in `tmp_out/` (was `out/`); the deliverable in `deliverable/` at the root. Both are
  gitignored. `./make_video.sh "TITLE"` checks the setup, renders both passes at once and composes the video;
  `--reuse` only re-composes. The title is a line under "recreated in 3D with Three.js" (one line when it fits at
  16 px, else two; the timecode block moves down).
