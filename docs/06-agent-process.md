# 06 — How the project was run (as an AI agent)

This page records *how* the work was done: the decisions, the loop, the tools I built for myself, and the
mistakes, so the process can be judged and repeated.

## 1. Constraints I set before writing code

- **Everything is a function of time.** The first thing I built was a deterministic timeline. I can't watch
  a real-time preview; what I can do is render any instant headless and look at the image. That made
  determinism the enabling decision for everything else, including motion blur.
- **One world, no per-shot scenes.** Spatial coherence was the brief's key criterion, so the whole 24 s
  happen in one coordinate system: the apple Reimu throws is the apple Marisa catches.
- **Cuts only behind full cover.** See [05-transitions.md](05-transitions.md).
- **Choreography first, then characters.** Milestone 1 staged the choreography with placeholder characters;
  Reimu and Marisa were then modeled from the original's silhouettes (section 5).

## 2. Seeing the original precisely

I can't play a video, so I turned it into images I can read:

- **Contact sheets** at 4 fps (overview), 10 fps (beat timing), and 30 fps around each transition, every
  thumbnail labeled with its timestamp (`tools/py/sheet.py`, later `seq.py`).
- From those I wrote the **beat table** in [02-storyboard.md](02-storyboard.md) before touching a camera.

## 3. The review loop

Every iteration was the same cycle:

1. Change poses, camera keys or geometry.
2. Render only the instants in question: `node tools/render.mjs stills --times …`, about 1 s per frame.
3. Build a **side-by-side strip, original above and render below** (`compare.py` / `seq.py`), with a
   per-frame **pixel-agreement score**: the share of pixels on the same side of mid-gray in both.
4. Look at it, name the specific mismatch ("apple outside the frame at 12.3 s", "face hidden by hair"), and
   fix that.

When a problem wasn't obvious from the final render, I switched views:

- **Turntable "lab" modes** (`?lab=reimu`, `?lab=marisa`, `?lab=reimuhead`) show a model in isolation.
- **The behind-the-scenes view** shows the camera frustum relative to the actors. That's how I found that a
  close-up camera sat inside the rider's body, and that a raised arm was hidden behind the hat brim.

## 4. Problems found by this loop (and fixes)

| Symptom seen in the strips | Root cause | Fix |
| --- | --- | --- |
| Hair fanned out like a palm tree | Chain gravity blend ramped too slowly | Faster gravity ramp; downward start direction |
| Profile close-up showed no face | Outermost back-hair locks rooted at the cheeks; bangs covered the nose; head too receding | Narrowed the hair fan, shortened the bangs, new head shape (vertical face plane, nose, chin) |
| Faceted, polygonal silhouettes in close-ups | Lathe profiles had only 5–7 points | All lathe profiles resampled through Catmull-Rom (4×) |
| Raised bell sleeve looked like a solid wedge | The sleeve followed the forearm rigidly | Sleeve hung from a pivot that droops 45% toward gravity |
| Ghost copies in fast blurs | 10 sub-frames over a large motion | Adaptive sampling: 32 sub-frames in `fast` ranges |
| Apple missing at 12.3 s | **Aliasing bug**: `applePos(t, _q)` wrote its result into the scratch vector it also used internally | Rewrote without the shared temporary |
| Camera jump at the release | Shots used different orbit centers (x = 0 vs the hand's x) | Blended the center across the boundary |
| First night frame posed at the wrong time | The one-time castle solve re-posed the scene mid-`apply` | Solve moved to the start of `apply` |
| Lens cover appeared as a gray gradient | The dive was too fast for the shutter | Slower dive, positioned in camera space and anchored on the chest |
| Dangling-apple close-up: arm diagonal, body in frame | Viewpoint | Kept the pose and **rolled the camera** 0.5 rad so the arm reads vertical |
| Mirrored composition at 16.3 s | Camera behind her; the hat brim hid the arm | Camera moved below and in front of her |
| Behind-the-scenes grid and frustum drawn black | Material override also applied to the helpers | Helpers moved to a separate overlay scene |

## 5. Modeling Reimu and Marisa

The placeholder characters were replaced by Reimu and Marisa, modeled from the original's silhouettes with
the same review loop plus three measurements:

- **Row spans and bounding boxes.** Widths of the black runs on given rows, and the silhouette's bounding
  box and area, original vs render. At 5.0 s the render's head was 112 px wide against 80 px in the
  original while the bow-to-shoulder height matched: the camera was 1.35× too close for Reimu's proportions,
  and her bow was too flat. At 20 s the broom was 258 px against 226 px, which is how the bristles turned out
  twice too long.
- **Disagreement maps** (`tools/py/diff.py`). Red where only the original has ink, blue where only the
  render does. They separate shape errors from framing errors at a glance: in the profile close-up
  (9–11 s) a red band on one side and a blue band on the other meant the figure was 35 px off, not
  mis-modeled. Moving the camera target by 0.1 m raised those frames from 0.73–0.79 to 0.81–0.85.
- **Cover check.** The dark fraction of each frame near the palette flip, including the darkest column.
  It caught that without the placeholder's cape, the lens-covering dive left the frame before the cut
  only 87% dark. (That dive was later removed: see section 6.)

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Sleeves swallowed the whole body in the front view | Sleeve chains flared 0.2 per metre | Flare reduced to the original's cuff width (about 0.1 m radius) |
| No sleeve under the raised forearm (9 s) | Sleeve hung from the upper arm only | Sleeve rings swept along shoulder → elbow → wrist, underside sagging toward gravity |
| Apple hidden inside the sleeve | Sleeve ran 8 cm past the wrist | Sleeve ends just before the wrist |
| Bow a tall "ear" in profile | Loops too deep and upright | Shallower loops, tilted back 22° |
| Brim a smooth disc from below (16–17 s) | Hair stayed inside the brim's outline | Locks fan outward toward the tips (frame at 17.0 s: 0.61 → 0.69) |
| Legs sticking out sideways in the view from behind | Camera directly behind a side-saddle rider | Camera moved behind-left and above, as in the original (22 s: 0.85 → 0.90, 23 s: 0.87 → 0.90) |
| White wedge under the castle | 60 m plinth seen from the higher camera | Plinth trimmed to the building footprint |
| Leaning from the hips swung the legs, not the torso | Pelvis pitch acts before the side-saddle turn | Leans go on the chest |

## 6. Correcting three misreadings of the original

Review feedback pointed out three places where I had staged what I *thought* the silhouettes showed rather
than what happens:

| What I had staged | What the original does | How it was fixed |
| --- | --- | --- |
| The opening camera orbits 180° from behind Reimu to her front. | A straight zoom-out while she bops. The asymmetric frames I read as a back view are her twisting mid-sway. | The camera starts on her chest and pulls straight back. The bop was **measured**: tracking the bow's height frame by frame gives a dip every 0.421 s, and the body's x position gives a four-beat sway with the head 0.13 s behind. |
| The apple follows a ballistic arc and falls past the cliff; Marisa catches it below. | The apple keeps flying up. Marisa passes above it and snatches it as it goes under her broom; the colors invert on the catch, framing unchanged. | A rising apple, a flight path placed from the catch point, IK for the snatch, and a palette flip without the lens-covering dive. |
| After the catch, Marisa just holds the apple up. | She **bites** it (16.9 s), then keeps it at her mouth; the apple has a visible bite mark afterwards. | IK brings the apple to her mouth for each bite, and the apple mesh gets a scoop where her mouth touched it. |

Lessons:

- **Two-tone frames are ambiguous.** A silhouette can't tell a back view from a front view, or a falling apple
  from a camera that overtakes a rising one. When a reading decides the staging, measure the motion over
  time (as with the bop), or ask.
- **Some transitions in the original break my own rules**, and that's fine. The palette inverts mid-shot on
  the catch; hiding a cut behind a lens cover was my invention, not the video's.
- **Put exact contacts under IK, not keyframes.** A hand meeting a moving apple, then the apple meeting a
  mouth, is hopeless to hand-tune with FK; with IK plus `tools/probe.mjs` (which measured the meeting error at
  about 3 mm), it's exact by construction.
- **The catch framing took several passes, each diagnosed by projecting joints into the camera.** The body
  sat between the apple and the camera (fixed by catching with the camera-side hand), the tucked legs pointed
  at the lens, then the skirt hung into the frame (fixed by letting the wind blow it back).

## 7. Polishing sweep

After the corrections, the review asked for one more change (no overhead lift after the catch: she brings the
apple straight to her mouth) and a last polish. The sweep targeted the gaps that could be measured:

| What | How | Result |
| --- | --- | --- |
| The apple's drift while it climbs (12.2–14.6 s) | Measured the apple blob's centroid and area on the original every 0.1 s; the camera is solved so the apple projects there, at the distance its size implies | 0.89–0.92 → 0.98–0.99 per frame |
| Wide-shot framing (18.5–21 s) | Disagreement maps showed the original rider 6% further right; then measured her slow on-screen bob (±3%, 1.9 s period) and applied it to the camera, which flies with her | 0.91–0.94 → 0.94–0.97 |
| Wide-shot shape | Shorter hat crown, more tucked legs, thicker handle and bundle (from the same maps) | small gains |
| Bite close-up (16–16.8 s) | The apple merged into the brim: held lower and further out, camera aimed further forward | 0.76–0.86 → 0.83–0.91 |
| Opening pull-back (2.2–2.8 s) and the pull-back after the bite | Framing offsets from the maps; the post-bite pull-back starts 0.1 s later | about 0.75 → 0.84–0.90; mixed but net positive |
| The broom at the catch | Tried lowering it into the top of the frame, as in the original; that also brought more of her body into view and scored 0.03–0.05 lower per frame, so it stays at 0.24 m above the apple. The trial exposed that the IK needed 6 passes instead of 3 to converge at a bent-elbow reach | IK error back to a few mm |
| The whip pan's start | The original starts swinging at about 15.26 s, not 15.33 s | 15.3 s: 0.61 → 0.68 |
| Behind the scenes, apple shot | The witness camera still framed the old falling apple; it now follows the apple up and closes in for the catch | readable story in the BTS view |

Rejected experiments: catching with a forward lean (so her body stays behind the apple) scored worse at the
catch (0.78 vs 0.83), and letting the dangling apple drift during the hold went the wrong way (0.07 lower at
15.1–15.2 s). Both were reverted.

## 8. What I would do differently

- **A camera-space framing solver.** I'd give the target screen position and size of an actor and solve
  distance, height and roll from them, like the castle placement already does. Hand-tuning camera keys was
  the slowest part.
- **The behind-the-scenes view from day one.** It found the two worst bugs faster than any number of
  final-render stills.

## 9. 0:24 – 0:35

The second chunk followed the handoff's plan: contact sheets at 4, 10 and 30 fps, a beat table, then staging,
with the two beats that break the project's rules put to the reviewer first (the core turning into a girl: a 3D
transformation was chosen over a 2D silhouette morph and an occlusion hand-off; the palette wipe: done literally).

### New tools

- **`tools/py/blob.py`** measures the ink blob of the original (or of our stills): centroid, area, bounding
  box, principal-axis angle and elongation. It turned the falling core into a table of screen position, size
  and roll, and showed that the figure's roll continues the core's tumble without a break (unwrapped, the stem
  end points at 1170° ≡ 90° when she stands: the stem end becomes her head).
- **`tools/tune.mjs`** is the camera-framing solver the handoff asked for: it applies a candidate camera on top
  of the shot, renders at 320×240 and scores the agreement with the original, by grid search or coordinate
  descent, about 5 renders per second. It solved the push-in onto Marisa's arm (25.1 – 25.45: 0.81 – 0.87 →
  0.93 – 0.94), the close-up (an orbit about the pinch point: 0.87 → 0.91) and every Patchouli key.

### Problems found and fixes

| Symptom | Root cause | Fix |
| --- | --- | --- |
| The hand bent up instead of drooping | With the pole below the arm, the inside of the elbow faces up; wrist x < 0 flexes toward it | Wrist x > 0 (extension), plus a twist that puts the curled fingers in front of the core |
| The arm twice as thick as the original's in the close-up | Marisa's sleeves were built for wide shots | Arm radii became a rig option; hers are slim |
| The core hung from mid-finger | The pinch point was the midpoint of thumb and index tips, 5 cm apart | Pinch at the index tip, a little toward the thumb |
| The arm jumped when she let go | IK kept chasing the pinch point while the fingers opened | From the release the wrist is held where it was (a one-time solve), then lifted |
| Her legs filled the frame as the camera dropped after the core | Both her swoop up and the camera's drop move her up on screen, so the legs below the arm must cross the frame | The core is tossed to her left and the camera, tracking it, leaves the legs' column; the toss doesn't show on screen because the camera follows it |
| A giant core in her hand at 25 s (behind the scenes) and a castle solved from the wrong shot | `placeCastle` posed `SHOTS[SHOTS.length - 1]`, which stopped being the night shot when shots were added | Look the shot up by name; reset the core's scale in her hand. The castle's position was checked against the previous commit (same to 3 mm) |
| A spire at the bottom of the close-up | The level close-up still sees the castle, which the original has lost by 25.2 s | The castle is hidden once it has left the push-in's frame (a trade-off: not physical) |
| Patchouli's hair showed on both sides of her body from the front | The curtain fanned out over ±2 rad | Narrower roots and fan |
| Her silhouette 40% too wide at 29 s | The book arm stuck out and its trumpet sleeve hung as a bag | Row widths against the original: book arm tucked to the chest, smaller sleeves; the robe then matched to 1 – 3% |
| The front bow read as a disc on a stalk, then as round ears | A bow seen face-on | Bows with loops across the head: a knot in profile, loops from the front |
| No face in the close-up | Long bangs and a cap set too far forward covered it | Shorter bangs; the cap set further back |
| A mitten instead of a fist | A long thin palm and a thumb sticking out | Hands ×1.5 for her, a rounded mass for the curled fingers, the thumb tucked |

### Rejected experiments

- **An unconstrained camera solve** for Patchouli's keys scored 0.96 – 0.98, but the camera jumped between 1.8 m
  and 0.02 m high from one key to the next: the solver was bending perspective to hide pose errors. Constrained to a
  level dolly (distance, height, sideways offset, pitch) it scored 0.96 – 0.97 with a smooth path. Solve cameras
  only after the pose roughly matches, and with as few degrees of freedom as the original's move has.
- **A sideways toss with the camera still locked to her** moved the core across the close-up far faster than the
  original; the toss only works with the camera tracking the core from the release.
- **Her swoop starting at the release** took the arm out of frame 0.15 s too early; it starts at 26.47.
- **A hair gust of 1.3** during her turn fanned the hair out like a skirt; 0.5 matches the original's flare.

## 10. Polishing 29 – 35 s after review

The review found the transition right but asked for more polish on 29 – 35 s, and pointed out that Patchouli
should bop like the other characters. The pass:

- **The bop, measured.** The top of her cap, frame by frame (30 fps, 28.9 – 35 s), dips every 0.42 s: the
  song's beat, the same as Reimu's measured bop, about 0.15 beat ahead of it, 2.5 cm deep. Same knee-dip model.
- **Large side-by-sides** (`tools/py/pair.py`: original, render and disagreement map at 400×300) made the
  shape errors plain where the small strips didn't: a ball-shaped cap, a receding face, a book in two blocks,
  a forearm going the wrong way, and a wag that ran the wrong way once its rotation moved from the wrist to the
  camera axis.
- **Zoomed crops of the head** against the original (32.8 s in profile, 34.83 s close-up), and a render with the
  cap hidden (`render.mjs --tweak`), showed the face itself receding: her head got its own fuller jaw, a chin and
  an open mouth, the cap a muffin shape.
- **IK for the gestures.** The book moved from her hand to hips space, her left hand reaching it; poses got
  optional IK targets for her right wrist (the arm across her chest, out to her right, the sweep); the pointing
  arm is placed where the original has it.
- **The wag read drawing by drawing**: a table of leans held for a drawing each, instead of a cosine.
- **Cameras re-solved** after the model and poses had settled (keys at 29.5 – 34.2 s, plus new keys at 33.85
  and 34.0 for the push-in).

Scores per quarter second went from 0.86 – 0.97 to 0.89 – 0.97 (see [07-status.md](07-status.md)).

Lessons:

- **Re-solve cameras last.** Keys solved against an earlier model hide its errors; after model changes they
  are the first thing to redo, and they no longer compensate for wrong shapes.
- **Don't blend an IK pose into a joint-angle pose.** The arm dips as the IK weight fades while the joint angles
  change. Keep both ends of a move in the same system.
- **Check signs after moving a rotation to another frame.** The wag's direction flipped silently when it moved
  from the wrist's axis to the camera's.
- **Global changes need re-checking everywhere.** A lower cap that fit the close-up looked too low in the wide
  shots until the cameras were re-solved; judge shape changes on several views.

## 11. Making Patchouli's motion flow (29 – 35 s, second review)

(The method is written up as a guide in [09-animating-motion.md](09-animating-motion.md).)

The second review found the shapes and the transition right but the arm and head movements robotic: abrupt,
as if snapped to coordinates. The cause was structural, not the poses:

- **Every key was a stop.** The pose track eased in and out of each key (`track`, `inOut`), several poses
  were held twice, so each gesture burst, stopped dead, burst again; the bursts showed as blur spikes (32.1,
  32.9 s).
- **The arm switched systems mid-gesture.** IK targets for the sweep, joint angles for the tuck and the lift,
  IK again for the point, each blended in by weight.
- **The timing was off the original.** Contact sheets at 30 fps, side by side with ours, showed the original
  moving continuously: the arm lifting from 32.6 to 33.5 s without a pause, where ours rose fast, held, rose
  again.

The rework:

- **Motion curves** (`flow` in `timeline.js`): a cubic through the keys, velocity from both neighbours
  weighted by key spacing, clamped like an animator's auto-clamped handles (zero where a channel turns round
  or comes to rest, capped so no segment overshoots).
- **One curve per part** (body yaw, where the face points, torso and book, right arm, hand), each timed on the
  original, so they overlap: her face turns before her body, the body carries the arm round.
- **The arm as one curve.** Every key (FK, IK or the pointing pose) is solved once into joint rotations, and
  the curve runs through the quaternions; elbow and hand trail the shoulder by a frame or two, fading out as
  the hand comes to the exact pointing pose.
- **Timing measured.** A hand-tip tracker (the leftmost silhouette point above her hips, per frame, original
  and ours) gave the arm's path: out fast to 31.5 s, a drift, a flick to full stretch at 31.77 – 31.93 s, then
  straight back while she turns. The lift: level at 33.45 s, the fold done by 33.85 s. Keys were set from
  these tracks and checked against them until they agreed within a few pixels.
- **The head turn** gets its own curve with a small dip and tilt, split between neck and head. It was first timed
  on 31.65 – 31.9 s (the fast middle only) and read as too fast; re-timed on per-frame head crops it spans
  31.35 – 31.85 s, facing us at 31.58 (see the review pass below).
- **The wag** swings smoothly through the measured drawings (each at the middle of its hold), with a short
  shutter in the close-up so the finger stays crisp like the drawings.
- **Camera path on a motion curve** that starts with the tracking camera's velocity: the uniform spline had
  a speed jump at unevenly spaced keys (the push-in lurched to a stop at 34.2 s).
- **A motion check**: sampling her wrist, elbow and head every 1/60 s with `tools/probe.mjs` and listing speed
  and acceleration peaks. It found a 139° spin of the upper arm between two keys (the elbow's bend flipped from
  one key to the next) and a hand-to-chest move done in 0.25 s where the original takes 0.45 s. The peak wrist
  acceleration went from 56 to 30 m/s².

Rejected or corrected on the way:

- **The tip tracker picked up the sleeve**, not the hand: keys set from it put the arm 17 cm too low at
  31.5 – 31.75 s (0.955 → 0.928). The large side-by-side showed the arm at shoulder height with the sleeve bell
  hanging below it.
- **Solving the hand's depth from the silhouette** swung it 0.5 m back and forth between keys: depth is
  invisible in a silhouette. Depth was held on a smooth trend and only the image-plane position solved.
- **Unclamped tangents overshot**: a fast move into a long hold (the pointing pose, then 1.4 s of wag) carried
  the wrist 10 cm past its target. Clamping fixed it.
- **A steadier camera at 32.6 – 33.7 s** (dropping the keys that pull back and push in again) cost up to 0.037:
  the original's camera really does that.
- **A body-yaw offset** at 31.2 – 32.3 s gained under 0.003 anywhere: the remaining misfit there is shape (the
  book's edge), not timing.
- **A neck offset** carried over wrongly (the pointing pose's neck angle was absolute, the new torso curve's is
  added to the base) tipped her head 10° forward in the close-up; the side-by-side of old and new renders at
  34.8 s showed it.

Lessons:

- **Look at the motion, not only the frames.** The score and the stills were fine while the movement was
  robotic. Full-rate contact sheets side by side with the original, and speed/acceleration peaks of the main
  joints, show what single frames can't.
- **Keys are samples of a motion, not destinations.** Ease-in-out to every key and duplicated hold keys make a
  robot. Key the extremes and the breakdowns, let a curve carry the velocity through, and give each body part
  its own timing.
- **Don't switch solvers inside a gesture.** Solve IK keys into joint rotations up front and interpolate one
  representation; keep the elbow's bend direction consistent between keys.

## 12. Applying the motion lessons to 0 – 28 s

After the Patchouli rework the reviewer asked for the same knowledge to be applied to the earlier scenes: details
only, no drastic changes. The method is in [09-animating-motion.md](09-animating-motion.md#5-applying-it-to-scenes-that-already-work).

Measured first: `tools/motion.mjs` on Reimu, on Marisa in her own frame (`--space rider`) and on the camera
(`--char camera`, new). Marisa's own motion was already smooth (peaks of 11 m/s² in rider space). The spikes
were cameras and Reimu's arm.

Kept (each A/B-scored with `tools/py/seg.py` on a partial render):

- **Night-flight camera on a motion curve** (14.8 – 26.4 s). The uniform spline drifted toward the whip during
  the hold after the catch; the curve holds. 14.8 – 15.1 s: 0.80 – 0.86 → 0.88 – 0.89. 22.4 – 24.9 s: about
  +0.01. Keys sampled from the old path at 16.0 – 17.45, 21.35 – 21.95 and 26.1 s keep its shape where it fit
  better. 14.8 – 26.4 s: 0.890 → 0.895.
- **The opening pull-back on a motion curve** (0 – 6.55 s) through the measured distances, with no speed jumps at
  the keys: 0.9323 → 0.9325 over 0 – 7.4 s.
- **Reimu's arm up to the wind-up on a motion curve**, with the old key times; holds drift, and the lowering
  flows into the wind-up (wrist peak 24 → 15 m/s²). 6.5 – 12.3 s: 0.8524 → 0.8531. The throw stays on its eased
  keys, and the release pose at 12.0 s is unchanged to the millimetre.
- **The crane after the throw**: one acceleration on a motion curve instead of shoot-stall-shoot (dropped the
  12.06 s key), starting exactly where the orbit ends (it was 6.6 cm off). 12.0 s: 0.804 → 0.809.
- **Marisa's poses from 15.3 s to the let-go on a motion curve**, holds drifting a little toward the next pose;
  the catch and the let-go keep their eased keys. 15.3 – 26.4 s: 0.8956 → 0.8958.

Rejected:

- **Re-timing Reimu's arm from the apple's tracked height**: the heights matched the original within 1 – 2 px, but
  the silhouette didn't (our apple is bigger, and mixing toward `W_LOWER` swings it away from her body): 0.8524 →
  0.8476.
- **The swoop at 6.55 – 7.3 s on a motion curve**: its spike is the push-in reversing into the orbit, blurred in the
  original. Smoothing it cost up to 0.025; reshaping it with extra keys gained nothing. It keeps its eases.
- **Starting the rush onto Marisa's arm later** (25.03 s instead of 24.95 s, where the sheets seemed to show it
  still): 25.0 s dropped from 0.904 to 0.869. The original is already easing in.
- **The profile shot's camera (7.3 – 12 s) on a motion curve**: 0.8432 → 0.8421; its old spline's drift fits.

Lesson: on scenes that already work, keep the key times and the contacts, change the interpolation, and A/B every
change on its span. The largest gain came from a place the score had flagged for a long time (the catch
close-up), where the fault was the interpolation, not the pose or the camera keys.

## 13. 0:35 – 0:41

The third chunk: the push onto Patchouli's hand, her hand turning into Remilia's wing, Remilia's bop, her turn with
a teacup and the cup's drop. The source video had to be fetched first (the YouTube upload `FtutLA63Cp8` at 480×360,
30 fps; its frames matched the documented scores to the third decimal, e.g. 30.0 s at 0.970). One beat went to the
reviewer before staging: the hand-to-wing transition (a 3D morph, like the core's, was chosen).

Order of work: contact sheets (4 fps overview, 30 fps on each transition), row widths of the front view to model
Remilia, a first staging with placeholder camera keys, then `tools/tune.mjs` key by key, fixing the pose wherever the
solver needed an odd camera to score, and finally partial renders A/B-scored with `tools/py/seg.py` and read on
full-rate pair sheets.

### Problems found and fixes

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Patchouli still on screen after 36.3 s, no Remilia | The Patchouli shot ended at `1e9`; `shotAt` takes the first shot that contains `t` | It ends at `T_REM`; the Remilia shot takes over and calls it for the morph |
| Her wings swept forward as she turned | The sweep's sign in `poseWings` | Positive sweep is back for both sides |
| The cup hung under her hand, or sideways | Guessing the wrist's twist sign on a mirrored arm | Probe the hand's axes (`tools/probe.mjs`): the palm normal pointed down; flipped |
| FK angles for the cup arm never matched (the cup drifted, the elbow stuck out) | A hand that carries something needs a position and an orientation | IK keys for the wrist plus the palm's orientation, solved once into rotations (`ensureRemArm`), as for Patchouli's arm (replaced after review by the cup driving both hands, section 14) |
| The cup's handle showed toward the camera, the cup tilted with her hand | The cup took the hand's orientation | The cup stands upright in the world, its handle away from the camera |
| The hand too big at 36.0 – 36.3 s, the thumb sticking out of the wrist | The thumb's root is at the wrist; the solver zoomed in to cover the finger | The raised thumb's root moves up toward the index knuckle; keys re-solved (0.82 → 0.92 – 0.95) |
| In the morph the wing swept up through the hand | The wing was raised from below | It sweeps forward from behind her, growing out to the left under the hand, as the original's does |
| Solved morph keys moved the camera 1.33 → 0.95 → 0.68 m high within 0.15 s | Unconstrained solve through heavy blur | Solved again at a fixed height (1.0 m): nearly the same scores, a level path |
| A 314 m/s² jolt at the cup's release | The first measured cup drawing (40.567 s) is half hidden by her hand, so its width read too small and the tracking camera jumped back 17 cm in 13 ms | That drawing is left out; the track starts at 40.633 s |
| Her head in frame and her arm leaving it too soon after the release | Her arm was still bent; then a strong flick | The arm straightens as she lets go and stays out; a smaller flick (0.6 m/s) |
| Remilia's arm showed outside her body in the front view | The elbow's pole pointed outward | The pole goes down and back; the upper arm turns in, so arm and cup stay inside her silhouette |

A small practice note: store solved camera keys with the target 1 m from the camera (`tools/py/camkey.py`, new,
does it). The solver's raw targets sit anywhere along the view line, and interpolating between keys whose targets are
at very different distances turns the camera unevenly.

### Rejected experiments

- **The wag pivoting at the wrist** (as for 34 – 35 s) swung the whole fist on the big leans at 35.6 s; pivoting at
  the knuckle only fitted 35.6 but not 35.8, where the drawing tilts the fist too. Over nine frames 34.3 – 36.0 s:
  hand share 1 (old) 8.10, 0.35 8.15, **0.6 8.22** (kept).
- **Leaning her upper body toward the cup** (10 – 12° in profile): 40.0 s went from 0.869 to 0.850. She keeps 3°.
- **A wider hair flare at the jaw, a fan-shaped bow and lower wing roots**, which the strips seemed to ask for:
  every front-view key lost 0.003 – 0.008. Reverted.
- **Pushing the camera in later during the turn** (dropping the close keys at 39.3 and 39.4 s, which looked too
  close on the pair sheet): 39.3 – 39.5 s lost up to 0.12. The close keys cover a pose difference (the original's
  body lags further behind the head); they stay, and the pose was re-timed instead.
- **Dropping the 36.6 s camera key** to soften the fast pull-back after the morph: 0.892 → 0.885 over 36.3 –
  36.95 s. The original's move is abrupt there too.
- **Her arm lifting after the release**: the original's arm stays out and leaves the frame because the camera drops.

## 14. 0:35 – 0:41 after review

The reviewer's feedback on the first version: the hand at the 0:36 transition looked very weird; in the original the
pointing hand becomes Remilia's own hand, palm facing, which goes on to hold the cup she already holds in her other
hand, so she holds it with both hands to the end and lets it fall gently; and many movements were abrupt. One question
went back first (which hand holds the cup when), then:

- **The cup drives both hands.** It has one motion curve in her hips space; each hand is placed on it by IK every
  frame with a keyed palm orientation. The one-handed version keyed the arm and hung the cup on the hand, which is
  how the cup came to whip out in 0.13 s at 38.97 (64 m/s² at the wrist); now nothing peaks above 8 m/s² there.
  With both hands on it the profile also scores better (40.0 s: 0.87 → 0.91).
- **One hand through the morph.** A hand that "becomes" another has to be identical at one instant. Riding
  Remilia's hand on Patchouli's for the whole morph showed two hands (their index lengths differ, and part of the wag
  turns Patchouli's finger, not her wrist), so Remilia's arm stays hidden until the swap and then appears with
  Patchouli's exact pose, grip, index length and size. Her head goes first, into Remilia's.
- **Palm to the camera, not palm up.** Palm up from the finger gun is a half turn about the fingers and passed through
  odd shapes (the thumb stuck down, a blob); palm to the camera is a quarter turn and reads as the original's claws.
- **A swap between two frames.** On the frame at 36.5 s half the motion-blur samples showed Patchouli's forearm and
  half Remilia's: a grey ghost. At 36.517 no frame straddles it.
- **Patchouli left visible.** The swap's one-time solve poses her, and on the first frame of a fresh page (every still,
  every tuner render) she stayed on screen after 36.6 s. The Remilia shot now hides her.
- **Smoothing.** Measured with `tools/motion.mjs` (wing tips added as joints), then: the wing's fold-up and the hands'
  moves spread over more time with overlap; the release's hand move slowed (72 → 21 m/s²); the pull-back after the morph
  thinned to one move (109 → 64 m/s², −0.003); the cup camera on a motion curve through one key per drawing (the
  drawings are on twos), its start key computed from the cup (152 m/s² → gone), the occluded 40.633 width dropped, and
  keys added past 41 s so the curve doesn't stop at its last key; a shorter shutter while the camera drops.

### Traps met

- **Tuner results that go in, out, in.** Solving neighbouring keys independently gave camera distances like −0.62,
  −0.575, −0.78 m and lateral swings of 0.4 m in 0.06 s (242 m/s²): each key covered a pose difference its own way. Keep
  the keys monotone where the original's move is (average an outlier, or fix the look direction and solve only the
  position), and check the path with `tools/motion.mjs --char camera` after every batch.
- **A "hold" key must be a real drift.** A key added 0.07 s after another to hold the finger gun had a different IK pole;
  its joint rotations differed enough that the motion curve's slope bent the whole move before it (36.1 s: 0.935 →
  0.906). Same pole, 2 mm of drift: back to 0.925.
- **A re-solved key moves the curve on both sides.** Re-solving the 36.4 s key changed the camera at 36.1 – 36.3 s through
  the curve's slope; the old key was better on both.

### Rejected

- **Riding Remilia's hand on Patchouli's through the morph** (two hands showed).
- **Palm up at the handover** (see above).
- **Her left hand dropping away at the release** while the right turned over: two arms showed; the original's single arm
  is both arms moving together, the far one hidden.


## 15. Extension to 0:47

Read the reference at coarse intervals, then at drawing/frame resolution around the inversion, shard morph
and upright turn. Extend the cup's measured centroid/width tables; build curved ceramic fragments and a new
Sakuya rig. The first breakup used eight narrow sectors that often turned edge-on. Six broader sectors,
opening toward the camera and positioned from the reference's spread, improved the 42.8 s still from 0.838
to 0.887, though the real drawn pieces are more irregular and concave. Keep that mismatch explicit.

Two implementation checks mattered:

- `orig_frame` rounds seek times to milliseconds, so seeking to 42.067 can return the next drawing. Decode
  exact frame indices for cuts: frame 1263 is the first inverted frame, not frame 1262. Moving the threshold
  fixed one almost entirely wrong frame in the segment score.
- Blend unwrapped angles when coming out of a spin. Interpolating the overhead angle toward a negative
  upright yaw briefly reversed the turn. The upright keys now continue through 405–628 degrees.

The arm gesture is authored with IK and evaluated as a single quaternion curve. A custom render check
compared 13 selected times in forward/reverse order, starting at 47 s and switching through BTS: identical
pixels and no browser errors. Full-rate morph sheets and 15 fps gesture sheets were inspected. The upright
motion probe (45.8–47) found wrist speed peaks of 1.95/2.23 m/s and acceleration peaks around 22/19 m/s²;
these are continuous curves, with no solver switches during playback. The new character grows to normal
human scale; early previews used a miniature rig solely while framing was being solved.


Final 47-second score: mean 0.917, median 0.923; extension alone 0.942 / 0.960. Reused the unchanged
0–41 s passes after a fresh 17-second overlap compared pixel-identically, and appended the final 180-frame
extension renders. This avoids recomputing unchanged footage; the concatenated passes have exactly 1410
frames, and the 41-second seam was checked in the final motion sheet.


## 16. Full review and polish through 0:47

Reviewed the complete original/render timeline, then checked the weaker passages with full-rate motion
sheets and localized comparisons. The priority was the hand transition around 36 seconds.

### Hand continuity and anatomy

The old swap matched the wrist and scalar grip but discarded the index knuckle's wag rotation. Patchouli
also started shrinking before the swap, and her arm remained visible alongside Remilia's during the shrink.
The swap now preserves every finger and thumb joint quaternion, hides the outgoing arm at that instant,
and delays body shrink until the hand is transferred. Remilia uses the same fist construction. A probe at
36.51669 and 36.51671 seconds measures at most 0.001 mm between corresponding wrists and fingertips.

The extended thumb previously pointed out along the palm normal, becoming a spike or disappearing as the
hand turned. It now spreads within the palm plane and bends at its tip. The gun pose holds its tilt while
the fingers curl; the forearm has more width, the wing opens sooner, and the hand reaches the cup sooner.
A small camera correction eases out by 36.85. The 35.8–37.1 s comparison improved from 0.8993 to 0.9031
at 320×240, but more importantly the hand no longer doubles or changes finger orientation at the swap.

### Other retained changes

| Passage | Change | Segment agreement before → after (320×240) |
| --- | --- | --- |
| 7.3–12 s | Ease the profile camera back, restoring the apple/head framing | 0.8432 → 0.8578 |
| 14.4–18 s | Trail the skirt clear of the catch lens; refine whip and bite framing | 0.8237 → 0.8291 |
| 25.6–27 s | Refine the arm close-up and shorten the first release shutter | 0.9173 → 0.9220 |
| 42–44 s | Vary sector fracture edges into crescent rims and a pointed fragment | Individual comparisons improved; full-pass score in status |
| 44–47 s | Narrow and lengthen the skirt as Sakuya becomes upright | 0.9465 → 0.9527 |

The core's shorter shutter trades a small threshold-score loss during the release for a cleaner moving
silhouette. The arm still leaves the frame slightly early. Reimu bow tilts were rejected: negligible profile
gains harmed the opening. Remilia camera-only tuning at 37–39.7 s produced tiny, inconsistent improvements
and was left out; her body/head timing needs a pose revision rather than more camera compensation.

The hand reaches its cup hold without a position discontinuity. The transition remains fast: the wrist peaks
at 2.76 m/s and the camera at 4.44 m/s; the elbow has a brief acceleration peak around 36.60 s as it folds.
The full-rate sheet was checked alongside these measurements.

Validation includes 31 reverse-order pixel comparisons with BTS interleaved, the catch continuity probe
(0.384 mm), comparison strips and disagreement maps, and complete fresh final/BTS renders. Segment scores
above use a different resolution from the 160×120 full-timeline metric in the status document.


## 17. Slower Remilia handoff and extension to 0:56.5

The reviewer liked the repaired hand swap but found the following arm move too fast. The earlier polish
had compressed most of the descent into 0.2 s. It now takes roughly 0.6 s: the path settles at 37.05, the cup
join at 37.12, with wrist rotation, size and elbow pole spread over the same move. The hand still matches
at the swap. Over 36.517–37.3 s, wrist peak speed drops **2.76 → 0.95 m/s**, acceleration **51 → 9 m/s²**;
elbow peak speed drops **3.00 → 1.52 m/s**, acceleration **140 → 35 m/s²**. Agreement over the 36.3–37.3 s
motion segment is unchanged to four decimals (0.8882). The requested slower timing takes priority over
matching every held drawing in the original’s very quick transition.

The extension was analyzed on half-second sheets, then finer sheets through the knife throw and wing reveal.
Sakuya continues her turn into the opposite profile before throwing. Her waist bow was useful for reading
which way the torso faces; camera tuning alone could not fix the initial incorrect facing direction. The
knife camera uses measured bounding boxes and retains the release camera at the handoff.

Flandre is a new procedural character, sharing the child rig with Remilia but adding a side ponytail and
crystal wings. Her head turns before her torso, then each arm opens separately. All arm authoring keys are
converted once to local quaternions. The throw remains intentionally fast, as in the reference; the following
open-handed performance uses slower overlapping curves.

The knife-to-wing reveal needed a gradual arch: showing the final bent branch immediately made the close-up
too steep. Scaling the branch vertically also made its edge disappear. Deforming the centerline from saved
vertices keeps the edge thick while it curves. Crystals use unsmoothed profile edges; rounded lathe profiles
looked like drops rather than faceted pendants. The close-up remains an approximation of the drawing.

Direct decoding confirms the last inversion at frame 1686 (56.20 s). The endpoint is 56.5 s, before the next
blade. Fresh renders are split at 44 s for production, then joined without re-encoding; all of the timeline
is newly rendered. Generated intermediate comparisons live under `tmp_out/extend56/`.


The out-of-order check covers 33 frames, with BTS renders interleaved, and passes pixel-exactly with no
browser errors. Across tiny time steps, contact differences are 0.002 mm or less at the Remilia hand swap,
0.045 mm at the knife release, and 0.035 mm at the blade/wing tip and camera handoff. These are position
continuity checks, separate from the motion-speed measurements above.


A last test enlarged the crystals during the close-up and settled them during the pull-back. It clipped the
outer pendant and reduced agreement at four of five comparison times, so the earlier dimensions were retained.
The remaining weakness is the 50.3–50.9 s wing reveal: its pendant spacing and camera framing do not reproduce
all the original drawings. This is recorded as a limitation rather than hidden by the nearly perfect knife score.


Two long BTS browser runs closed during export. Their completed MP4 frames were verified and retained;
production resumed from the exact next frame in shorter browser sessions. Both assembled passes decode
to 1695 frames with continuous 30 fps timestamps across every join, lasting exactly 56.5 seconds.


## 18. Extending 56.5 s to 1:10

The reference was examined at half-second intervals, then at 0.2 s intervals around the blade, sword
sweep and tree. The blade crossing Flandre is the incoming Youmu shot, followed by her sword sweep,
a tree reveal, and Yuyuko opening a fan. The new characters reuse existing procedural rigs with their
own silhouettes; no images enter the scene.

The first pass exposed three staging errors: the white sword was behind the outgoing silhouette,
the sword was assigned to the far arm during Youmu’s turn, and the fan was too high and close to the
lens. Enlarging the outgoing figure about the lens left room for the incoming blade. Swapping the
sword to the anatomical left hand and extending Youmu’s arms removed the contact errors. The fan
was reduced, lowered and attached to the opposite palm.

Level camera translations improved Yuyuko’s sampled close-ups from 0.80 / 0.81 / 0.69 / 0.88 at
64 / 66 / 68 / 70 s to roughly 0.94 / 0.94 / 0.92 / 0.96. A localized outgoing-body adjustment
improved 57.5 s from 0.67 to 0.79; localized tree framing improved 63.2 s from 0.71 to 0.83.
These are local 320×240 measurements, not the full export score.

Rejected trials: widening Flandre and lowering the camera too early reduced the 57.5 s agreement
to 0.57; an early fan at chest height obscured the face; putting the tree directly in front of
Yuyuko produced a white frame at the shot handoff. The final tree position lets the camera leave
it in world space. The tree topology and final sweep still need refinement.

The initial 27-frame seeking audit failed only at 28.5 s. Repeating the same audit against a clean
archived starting checkout reproduced that failure, confirming it predates this extension. New
frames reproduce pixel-exactly with BTS interleaved. Contact probes over the sword and fan gestures
found errors below 1e-12 m. No browser exceptions occurred. Old media covered only 24 seconds, so
both complete prefixes were rendered again before assembling the 70-second passes.


A final full-rate review caught a failure hidden by the selected stills: the close-up camera swayed
out of phase between its keys. Reference/render head centres were measured every six frames and
used for a clamped lateral correction curve. The final tree-to-face handoff was also moved earlier.
Over 63.5–70 s this improved the 320×240 segment score from 0.8514 to 0.8991. Both suffix exports
were regenerated after this correction; the original attempt is retained as `suffix-before-timing-*`.


Final 160×120 measurement over 2100 exported frames: mean **0.9005**, median **0.9096**.
The new 405 frames score **0.8634 / 0.8751**. The worst frame is 63.6667 s (0.1720): the canopy
crosses the lens on the wrong side during the camera sweep. The close-up correction improves the
whole span but does not solve that brief tree-composition error; it remains explicitly recorded for review.
Final and BTS are 960×720 / 30 fps, with a 1920×1080 comparison export carrying the original soundtrack.


## 19. Polishing 56.5 – 70 s by eye

Review of the extension: "it might feel okay from the scoring perspective, but from a human perspective, it's not as
good as the rest of the video." The span scored about 0.86 – 0.91 while showing things no viewer would accept, and
large white blobs score well whatever their shape. The pass below was driven by full-rate original | render sheets
first, with the score as a check that nothing regressed.

What read wrong, and what was done:

- **Yuyuko (63.8 – 70 s, the longest close-up).** A helmet-shaped cap with a flat brim all round, straight hair past
  the frame, no face when she turned into profile, and a bumpy white bar beside her at 64 – 65 s (nine "frill"
  ellipsoids in a column on her shoulder, not the tree). Rebuilt: a tall mob cap set back from the face, frill flaps
  only over the brow and on one side, a cone crest (a triangle from every side), a larger head with a stronger
  profile, jaw-length hair with short locks beside the face, a collar under the chin. Her head turn was re-timed on
  the full-rate sheet (profile by 67.5 s, not 69 s) and taken past 90° because the camera views her obliquely late
  in the shot (probe: 73° to the viewing ray before, 90° now). The close-up distance was re-measured on head extents
  (× 1.08). Agreement over 31 sampled frames: 0.913 before, 0.908 after: a small loss accepted for a head that now
  reads as hers.
- **Flandre's push (56.5 – 58 s).** She was widened 65 % and shifted, turning her head into a blob. Removed; the
  camera push alone frames her. +0.010 over the span.
- **The tree (62.65 – 63.8 s).** Restaged (05-transitions.md, section 18). Rejected on the way: a camera translating
  past the trunk (flew through the bare limbs: a white frame; routed under them, it exposed Yuyuko's mark early);
  a symmetric pan (too much smear; the original's whip frames are sharp); an entering tilt for the blade at 57.1 s
  (rotating about the off-screen grip dropped the whole blade: −0.008).
- **Youmu (58 – 62.65 s).** A round bob and one standing ribbon loop instead of a boxy head with two "bunny ears";
  an A-line skirt instead of a pumpkin. The swing re-keyed on a 15 fps sheet: the whirl at 61.0 – 61.4 turns
  counter-clockwise past vertical (the old curve turned clockwise through "down" and lagged 0.25 s), with a longer
  shutter for the original's blur wedges; the free arm stops being akimbo after the whirl; the blade reaches full
  length for the cut at 60.6. Score over 30 samples unchanged (0.8565 → 0.8566).

Full pass (suffix rendered and joined to the unchanged prefix): 2100 frames, mean 0.9007 / median 0.9083 (before
0.9005 / 0.9096); the new span 0.8643 / 0.8729, worst frame 0.172 → 0.548. Checks: stills at ten instants before
56.5 s are pixel-identical to the previous code; twelve new-span instants render identically forward and in reverse.

## Review pass: faces, the 44 s morph, the garden entrance

A review listed six things that looked wrong. Each was measured on the original before changing anything; the
score barely registers any of them, so the check was per-frame crops of the original next to ours.

- **Reimu's mouth (7.3 – 11.8 s).** A talking mouth (paper-colored opening, jaw drop, phrase keys) read as uncanny.
  On the original her lips never part: a lip-notch tracker (profile edge per row, below the nose) stayed within
  0–3 px at 480×360, noise level, with no rhythm. Replaced by a static closed-lip profile (nose, hollow, upper lip,
  notch, lower lip, hollow, chin) on a finer head mesh; the bumps were invisible on the 48×32 sphere. Scores
  identical to three decimals.
- **Patchouli's head turn (31.5 s).** Ours held until 31.58 and whipped round in 0.34 s (23° per frame at the
  peak); on the original the face turns evenly from 31.37 to 31.85. Re-keyed `patLook`; peak 14° per frame. Span
  score 0.9537 → 0.9535. Noted, not changed: her hat's crescent flips with the head in ours while the original's
  keeps pointing right until after 32 s.
- **The 44 s morph.** The rim fragment vanished by 44.16 while Sakuya's body appeared near full size in one frame.
  On the original the body grows out of the fragment over about four frames. Now the body starts at half size and
  the fragment shrinks into her crown over 44.0 – 44.26, its world scale following the camera's pull-back so it
  keeps its screen size while it shrinks (without that, the pull-back shrank it into the body at 44.1, and the
  switch just happened later). Span score 0.9786 → 0.9784.
- **Flandre's smile.** It was pinned at head-space (0, 0.12, 0.14): above the head mesh's centre (eye level), 2 cm
  in front of the face, drawn without depth test, so it floated wherever the head turned. Now it is projected onto
  the face surface between nose and chin and shows from 55.35 s like the original's. During the bow the original
  still shows the grin; our 28° bow turned the face to the floor and buried it at the chin. A 10–12° bow keeps it
  where the original has it for −0.001 on the two sampled frames; accepted.
- **Yuyuko's entrance (59 s).** She was switched on already in frame at 58.95. On the original she enters at the
  left edge at 59.0 and eases to rest by 59.5 (blob-tracked). Our camera, fixed to Youmu's measured framing,
  keeps her far mark still on screen, so she now glides in on her mark (`yuyukoGlide`, following the track; the
  reviewer called it "moving in"). 58.7 – 59.8 s: 0.856 → 0.867.
- **Youmu's scabbards.** They were fixed in garden space, turned only about the view axis, one starting at her hand
  and running far off the lower-left corner, while she turned 130°. On the original both are worn crossed behind
  her waist, sticking out on both sides. Now they hang from her hips; the empty one blends onto the blade's axis for
  the sheathing. Across-the-waist only (no front/back angle) vanished in profile at 59.5; a diagonal axis reads as
  an X from the front and still shows in profile. 58.7 – 62.65 s (with the glide): 0.8495 → 0.8552; 61.7 – 62.4
  loses about 0.003 where the second scabbard crosses differently from the drawing.

Checks: 60.0, 9.2 and 56.25 s rendered after seeking through 70, 44.1, 9.2 and 31.6 s are pixel-identical to fresh
loads.
