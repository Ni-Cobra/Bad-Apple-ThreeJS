# 09 — Animating a performance so it flows

**Read this before animating any character.** Matching the original frame by frame is not enough: a
performance can score well and still move like a robot. This happened with Patchouli at 29 – 35 s. Her poses
matched the original and the score was 0.947, and the reviewer still called the arm and head movements
"robotic, unnatural and abrupt, like snapping to coordinates". This guide explains why that happens, how it was
diagnosed, and the method that fixed it (0.947 → 0.951, and the motion reads as natural).

## 1. The symptom and its causes

The symptom: every gesture was a burst of motion, a dead stop, another burst. In the renders this shows as
motion-blur spikes on a few frames with sharp still frames around them.

Three causes, all structural rather than pose errors:

1. **Every key was a stop.** `track()` eases from key to key (`inOut`), so the velocity is zero at every key.
   An animator keys a *motion*; this keyed a list of *destinations*, and the character stopped at each one.
2. **Held poses.** The same pose was keyed twice (`[30.75, P_STAND], [31.0, P_PREP], [31.2, P_CROSS],
   [31.5, P_CROSS]`) to make a hold. A hold keyed that way is a full stop followed by a fresh start.
3. **Switching solvers inside a gesture.** The arm used IK targets for the sweep, then joint angles for the tuck
   and the lift, then IK again for the point, blended by a weight. Interpolating between two different
   solutions makes the arm take a path neither solution describes (it dipped, and the upper arm spun 139° about
   itself between two keys).

A fourth cause was timing. The keys were placed by eye and packed the moves into short bursts, while the
original moves continuously: the arm lifts from 32.6 to 33.5 s without a pause.

## 2. How it was diagnosed

The per-frame agreement score and single stills could not show any of this. The motion had to be looked at
as motion:

- **Full-rate side-by-side contact sheets.** `tools/pairsheet.sh` tiles every frame (or every other one) of
  the original next to ours. Read along a row, the difference is obvious: the original moves a little every
  frame, while ours holds still for several frames and then jumps with a blur streak.
- **Measured tracks of the gesture.** `tools/py/tip.py` follows the silhouette's extreme point (the hand of an
  arm held out) frame by frame, in the original and in ours, and prints the gap. It turned the arm's timing into
  numbers: out fast until 31.5 s, a drift, a flick to full stretch at 31.77 – 31.93 s, straight back while she
  turns. Ours came out 0.15 s late, overshot and lingered, and rose 0.2 s early in the lift.
- **Joint speed and acceleration.** `tools/motion.mjs` samples joints every 1/60 s and lists acceleration peaks.
  A snap is an acceleration spike. It found the upper-arm spin (the wrist peaking at 56 m/s² during a sweep) and
  a hand-to-chest move done in 0.25 s where the original takes 0.45 s.
- **Crops of the hard moments.** The head turn, cropped on the head at 30 fps, showed ours spinning in three
  blurred frames where the original's face comes round over about 0.25 s.

## 3. The method

1. **Time the performance on the original first.** Make full-rate side-by-side sheets of the passage, and track
   what can be tracked (`tip.py`, `tools/py/blob.py`). Write down when each move starts, peaks and ends. Look
   for moves that overlap: in the original the head starts turning before the body, and the arm keeps going
   while the body turns.
2. **Give each body part its own curve.** For Patchouli (see `src/shots/shots.js`) these are:
   - `patYaw`: the body's facing;
   - `patLook`: where the face points, in the world, with a small nod and tilt into a turn, split between neck
     and head;
   - `patTorso`: the chest twist, the head's pitch and the book;
   - `ARM_KEYS`: the right arm;
   - `patHand`: the grip and the pointing finger.

   Separate curves let the parts overlap instead of all arriving together.
3. **Use motion curves, not eased tracks.** `flow()` in `src/core/timeline.js` is an animator's auto-clamped
   curve:
   - the velocity at a key comes from both neighbouring keys, weighted by their spacing, so the motion flows
     through the key;
   - it is zero only where a channel turns round or comes to rest;
   - it is capped so no segment overshoots its keys.

   Key the extremes and the in-between breakdowns of a move, not a destination per gesture. A hold is a slow
   drift (`[32.6, -180], [35.5, -181]`), never a duplicated key. `flow` can start from a given velocity (`v0`),
   which the camera path uses to take over from the tracking camera without a jolt.
4. **Keep one representation per limb.** Arm keys may be written as FK angles, IK targets or a solved pose,
   but `ensureArm` converts every key once into joint rotations, and the curve runs through those. Two rules
   follow from this:
   - IK is still used to *author* a key (contacts, exact positions), but a gesture is never blended between
     solvers;
   - keep the elbow's bend direction (the IK pole) on the same side from key to key. When it has to change, do
     it while the arm is straight, where it only rolls the palm over.
5. **Add overlap.** The elbow and hand trail the shoulder by a frame or two (`poseArm`), and the trail fades out
   where the hand has to land exactly on a pose.
6. **Check it, then match it.** Run `tools/motion.mjs` for acceleration spikes and `tools/py/tip.py` for timing,
   and look at a pair sheet. Only then solve details against the original (`tools/tune.mjs`) and re-solve the
   camera keys. Score A/B variants on the span with `tools/py/seg.py` before paying for a full render.

## 4. Traps met on the way

- **A tracker measures the silhouette, not the body part.** `tip.py` followed a hanging sleeve instead of the
  hand, and keys set from it put the arm 17 cm too low. Confirm on a large side-by-side (`tools/py/pair.py`)
  before keying from a track.
- **Depth is invisible in a silhouette.** Solving a hand's position freely made it swing 0.5 m back and forth
  in depth between keys, which puts the jerk back. Hold depth on a smooth trend and solve only the image-plane
  position.
- **Unclamped smooth curves overshoot.** A fast move into a long hold (the pointing pose, then 1.4 s of wag)
  carried the wrist 10 cm past its target. That is why `flow` clamps.
- **Absolute vs added angles.** An old pose set the neck to 6° absolute; the new torso curve adds to a base of
  10°. The head tipped 10° forward in the close-up. A side-by-side of the old and new renders found it.
- **Motion blur shows every snap.** A continuously moving small part (the wagging finger) blurs where the
  original's drawings are crisp. A shorter shutter for that span (`shutter` may be a function of `t`) keeps it
  sharp without making the motion step.
- **When hands hold an object, animate the object.** Remilia's cup (36.6 – 40.6 s) never matched with FK angles, and
  hanging the cup on a keyed hand made it whip (64 m/s² at the wrist). Giving the cup one motion curve and placing both
  hands on it by IK every frame, with keyed palm orientations, made the hold continuous and smooth, and neither hand
  can drift off it.
- **One thing turning into another must be identical at one instant.** Patchouli's hand becoming Remilia's only
  worked once Remilia's hand appeared at a single instant with Patchouli's exact pose, grip and size; any overlap of two
  near-identical hands shows as two. Put that instant between two frames, or the frame's motion blur mixes them.
- **A hold key must be a real drift.** A key added to hold a pose, but solved with a different IK pole, changed the
  joint rotations enough that the curve's slope bent the move before it.
- **Not every camera wobble is wrong.** Smoothing out a pull-back and push-in at 32.6 – 33.7 s cost 0.037: the
  original's camera really does that. Test before "fixing" motion that looks odd.

## 5. Applying it to scenes that already work

The method was then applied to 0 – 28 s, which had been animated with eased tracks and uniform splines and
already scored well. Such a pass differs from animating from scratch:

- **Measure first, then change only what spikes.** `tools/motion.mjs` on every joint and on the camera
  (`--char camera`) lists the acceleration peaks. Marisa's own motion turned out smooth (IK and wind); the
  problems were cameras and Reimu's arm before the throw.
- **Keep what an exact contact or a solved value depends on.** The throw must pass its release pose at 12.0 s,
  the catch must meet at `T_FLIP`, the let-go must start at `T_LETGO`: those stretches stay on their eased keys,
  and the motion curve covers the time in between (`t < a ? curve(t) : track(t)`; they meet where both are at
  rest). Probe the contact before and after the change.
- **Keep the key times, change the interpolation.** Re-timing keys from a tracker helped Patchouli, but on
  Reimu's profile shot it matched the tracked point and not the silhouette (her apple is bigger than the
  original's). Keeping the old key times and only removing the stops (a held pose becomes a slight drift toward
  the next one) was the version the score preferred.
- **A uniform spline drifts through holds.** Catmull-Rom with uniform parameters takes its tangents from the
  neighbouring keys whatever their spacing. Two equal keys before a fast move (the hold after the catch at
  14.8 – 15.26 s, before the whip) became a drift toward the whip. The motion curve holds, and that passage went
  from 0.80 – 0.86 to 0.88 – 0.89, the largest gain of the pass.
- **Where the old path fit better, sample it into the new curve.** A few spans lost score with the new curve.
  Keys sampled from the old path at those instants keep its shape there and remove the jumps elsewhere.
- **Some spikes are the original's.** The swoop into the profile at 7.0 s, the whip at 15.4 s and the rush onto
  Marisa's arm at 25.0 s are sharp in the original too (a blur, or a move that starts abruptly). Smoothing them
  or re-timing them scored worse. Keep them, and write down that they were tested.
- **Check shot handovers for position, not only velocity.** The throw's crane started 6.6 cm off where the
  profile shot's orbit ended (the orbit is 0.06 rad off-axis): a pop hidden in the blur. `tools/probe.mjs` just
  before and after the boundary shows it.

## 6. Tools

```bash
tools/pairsheet.sh tmp_out/final.mp4 0 32.6 1.2 30 tmp_out/sheet.png          # original | ours, every frame
.venv/bin/python tools/py/tip.py tmp_out/final.mp4 0 31.1 32.4            # hand-tip track, original vs ours
node tools/motion.mjs --char patchouli --joints wristR,elbowR,head --from 29 --to 35   # speed/acceleration peaks
node tools/motion.mjs --char marisa --space rider --joints wristL,head --from 15 --to 26   # in her own frame
node tools/motion.mjs --char camera --from 21 --to 26.4                   # the camera's position and aim
node tools/render.mjs video --from 30.8 --to 34.3 --out tmp_out/pol/a.mp4 # partial render (~1 min)
.venv/bin/python tools/py/seg.py 30.8 34.3 tmp_out/final.mp4 0 tmp_out/pol/a.mp4 30.8   # A/B score per 0.1 s
```

The second argument of `pairsheet.sh`, `tip.py` and `seg.py` is the film time of the render's first frame: 0 for
`tmp_out/final.mp4`, or the `--from` of a partial render.
