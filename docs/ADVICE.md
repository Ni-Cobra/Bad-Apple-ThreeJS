# Advice

These lessons come from an earlier full recreation of 0:00 – 1:10 with this engine. They are ordered by how
much rework they cost.

## Reading the original

1. **Read the original literally; silhouettes are ambiguous.** A two-tone frame cannot tell a front view from a
   back view, an object falling from a camera rising past it, or a turn from a twist. Several stagings had to be
   torn down because a plausible reading was wrong. When a beat can be read two ways, track the shapes frame by
   frame (`blob.py`, `tip.py`) or ask the human before building it. Asking is cheaper than restaging.
2. **Use the original's own devices, not your own rules.** If it simply inverts the palette on an action with the
   framing unchanged, do that; don't hide it behind an invented camera move. Don't add what isn't drawn (a
   talking mouth, an extra orbit, a cut).
3. **Time everything on full-rate contact sheets.** 10 fps sheets for the overview, 30 fps (every frame) for
   anything fast. Write down when each move starts, peaks and ends before keying it.
4. **Measure, don't eyeball.** Bounding boxes and row widths caught a camera 1.35× too close and bristles twice
   too long. Tracking a shape's centroid and area turns a guessed path into a measured one. Measured tables are
   data: re-measure them, don't retune them by eye. The song's beat (close to 0.42 s) drives the characters'
   bops; measure each one's phase and depth.

## Models

5. **Model characters from measurements.** Pick frames where the character is seen clearly (front, profile) and
   match proportions: head size against body height, sleeve and skirt widths at given rows. Then check every
   model on a turntable from all sides. It has to be the character from any angle, not only from the film's.
6. **Hair and cloth sell the silhouette.** Locks as tapered strands with sharp tips, skirts and sleeves as
   swept surfaces, and wind and gravity applied analytically. Physical plausibility also fixes framing: a skirt
   that hung into a close-up only fit once it blew back at flight speed, as it would.
7. **Contacts need IK, verified with a probe.** A hand on an object, an object at a mouth, a foot on the ground:
   impossible to key by hand, exact with IK. Check the error with `tools/probe.mjs`: millimetres, or it pops.

## Cameras

8. **Framing errors dominate.** Most low scores were the camera, not the models. Align the framing (disagreement
   map) before touching shapes.
9. **A solver needs constraints.** `tools/tune.mjs` finds higher scores with absurd cameras (1.8 m high on one key,
   2 cm the next) if you let it. Solve only once the pose roughly matches, and constrain the search to the move
   the original makes (a level dolly, an orbit about a point, a fixed height). Re-solve after model or pose changes.
10. **Tracking shots from measured tables.** When the original follows an object, measure its screen position
    and size per drawing, then place the camera so the object lands exactly there at the distance its size
    implies.
11. **Check shot handovers for position, not only velocity.** A camera that starts 6 cm off where the previous
    one ended pops, even inside a blur. Probe just before and after the boundary.

## Motion

12. **Motion must flow, not snap.** Poses that match the original frame by frame can still move like a robot.
    The causes are structural: every eased key is a stop, a duplicated key is a dead hold, and switching between
    IK and FK inside a gesture takes a path neither solution describes. The fix:
    - Key the extremes and breakdowns of a move with `flow()`, not a destination per gesture. A hold is a slow
      drift toward the next pose.
    - Give each body part its own curve (facing, gaze, torso, each arm, the hand) so the parts overlap: the head
      leads a turn, the arm keeps going while the body turns, the elbow and hand trail the shoulder by a frame.
    - One representation per limb. Author a key with IK if you need to, but solve it into joint rotations once
      and interpolate those. Keep the elbow's bend direction on the same side from key to key.
    - When hands hold an object, animate the object on one curve and place the hands on it by IK every frame.
    - Check with `tools/motion.mjs` (acceleration spikes are snaps) and a `pairsheet.sh` of the passage.
13. **Some sharp moves are the original's.** Whips, blurs and abrupt starts exist in the source too. Test before
    smoothing something that "looks wrong", and write down that you tested it.
14. **Depth is invisible in a silhouette.** Solving a hand freely in 3D made it swing 50 cm back and forth in depth
    between keys. Keep depth on a smooth trend and solve only the image-plane position.

## Transitions

15. **One thing turning into another must be identical at one instant.** A hand becoming another character's hand
    only worked once the new hand appeared at a single instant with the old one's exact pose, grip and size. Any
    overlap of two near-identical shapes shows as two. Put that instant between two frames.
16. **Morphs happen in 3D.** An object swelling into a character, a blade becoming a wing: scale, deform and swap
    real geometry, framed so the swap is hidden by the camera or by the shape itself.

## Working

17. **Judge by eye, not only by score.** A span scoring about 0.9 once showed things no viewer would accept.
    Review full-rate sheets as a viewer would, and look at the behind-the-scenes view for broken geometry.
18. **Small steps, measured.** Change one thing, re-run `tools/cmp.sh` on the affected times, keep it only if the
    numbers and the strip agree. A/B partial renders with `seg.py` before paying for a full pass.
19. **Record rejected experiments.** Several reasonable-sounding changes scored worse. Writing them down saves the
    next attempt.
20. **Budget render time.** CPU rendering is slow: work from stills and partial renders, and do a full pass at
    milestones.
