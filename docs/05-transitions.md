# 05 — Transitions

The original never cuts in the classic sense: shapes morph, the camera whips, the colors flip. The rule I set
for the recreation: **a transition is either a continuous physical camera or actor move, or a cut hidden
behind something that fully covers the lens.** No cross-fades, no morphing geometry, and no frame where two
worlds are blended. The exceptions are the original's own devices: the palette inversion on the catch (section 4), the palette
wipe (section 8) and the core turning into a girl (section 9), both reviewed before they were built.

## 1. Black → first reveal (0 – 4.9 s): *camera on her chest, then one pull-back*

The film opens with the camera 13 cm from Reimu's chest, in front of her left shoulder. Every pixel is ink, so
the frame is truly black. There's no fade from black. When the camera starts pulling straight back, the first
white that appears is the real edge of her shoulder, entering from the right just as in the original. It's
one continuous move while she bops; nothing needs fixing up. (An earlier version orbited 180° from behind
her. The original is a straight zoom-out; what read as a back view was her twisting mid-bop.)

## 2. Front view → profile (6.7 – 7.3 s): *push-in plus orbit*

The original blurs from the front medium shot into the profile close-up. Here the camera pushes in (ease-in)
and orbits 90° around her in 0.3 s while she lifts the apple. The move is fast enough that the 32-sub-frame
motion blur smears it into the same kind of soft transition, and it stays spatially exact: the apple she
holds in the profile shot is the one that was hidden by her sleeve in the front shot.

## 3. The throw (11.7 – 12.5 s): *crane with lag*

In the original, the apple leaves the girl's hand and, after a white beat, comes back into the frame from the
top, then keeps climbing. The apple leaves at (0, 8.6, 3.3) m/s and settles into a steady climb: there's no
gravity, as in the original. The camera cranes after it but **lags**, so the apple exits the top of the frame.
Then the crane accelerates past it (the apple enters from the top) and locks onto it. The crane is one
acceleration on a motion curve (it used to shoot up, stall and speed up again within 0.15 s), and it starts
exactly where the profile shot's orbit ends: the orbit sits 0.06 rad off the crane's axis, which used to make a
6.6 cm jump at 12.0 s, hidden in the blur.

## 4. The catch and the palette flip (14.6 – 14.785 s): *inversion on the action*

In the original, the broom slides in along the top of the frame from the right, her body follows, and at the
moment she snatches the apple the colors invert, with the framing unchanged: the black band at the top
becomes the white broom, and the apple now hangs from her hand.

1. Marisa's flight is placed from the catch point: at `T_FLIP` = 14.785 s the rising apple is right under her
   left shoulder, 0.24 m below the broom. She leans far down to her left, her legs trailing back.
2. **Two-bone IK** (`Humanoid.reach`) brings her hand onto the apple at exactly `T_FLIP`. Before that, the
   apple flies on its own and the hand closes in from above; after that, the apple is in her hand. The
   probe tool measured the meeting error at under 3 mm.
3. The palette flips at `T_FLIP`. The night shot's first camera key is the day camera's pose at `T_FLIP`,
   expressed in her frame, so the framing is continuous across the inversion.
4. `clampToCut` still guarantees no motion-blur sub-frame straddles the flip, so no frame blends the two
   palettes into gray.

(An earlier version hid a cut behind Marisa diving across the lens. The original doesn't need that: it
simply inverts on the catch.)

## 5. Whip pan along the broom (15.26 – 16.15 s)

A single spline camera move in Marisa's local frame: from the dangling apple to her left side, below the
broom (the broom and her body cross the top of the frame, then the bristles are on the right), then up to her
face as she brings the apple to her mouth. The camera travels with the rider, so her flight doesn't add streaks. The blur comes only from the
camera's own swing.

## 6. Speed lines and the turn toward the castle (21.1 – 22.15 s)

The original's speed lines are motion blur. Marisa's speed ramps up to about 34 m/s, and the camera, flying
with her, orbits from her side to behind her. The flecks of dust along the flight path stretch into
horizontal streaks through the accumulation blur, with no 2D effects. The castle is a real object placed
about 260 m ahead. It enters the frame as the camera comes round behind her.

## 7. The push-in and the drop (25.0 – 26.67)

Seen from behind, she holds the core out to her left side; the camera rushes in from behind and below her onto
her arm (keys solved against the original), and the castle drops out of the bottom-left of the frame. The
close-up holds on her drooping hand while the core hangs from her fingertips. When she lets go (26.42), the
camera switches to tracking the core: at that instant both cameras are the same one, so there is no jump. The
original keeps the arm in frame for 0.2 s while the core falls out of the bottom, then the arm leaves the top as
the camera drops after the core; here the flick sends the core down fast first, and her swoop up plus the
camera's drop take the arm out of the top. Two things had to be solved: while the fingers open, IK must hold the
wrist, not chase the (moving) pinch point, or the arm jumps; and as the camera drops, her side-saddle legs hang
right in front of it, so the core's toss to her left carries the camera out of their column.

## 8. The palette wipe (27.25 – 27.40)

The original flips back to white on black ink with a straight, soft edge that sweeps from the lower-left corner
to the upper-right one at 30°, accelerating. It was measured on its three drawings (the edge's position at
27.267, 27.333 and 27.367 s) and is rendered as a full-screen pass that inverts the frame behind the edge
(see [03-architecture.md](03-architecture.md)). Once the edge has left the frame, the inverted night frame is the
day frame, and the palette switches with no visible change. The tracking camera keeps following the core through
it.

## 9. The core turns into Patchouli (27.95 – 29.07)

In the original the tumbling core's flared ends become a robe's hem and a head of hair, and the figure keeps
turning, slowing, until she stands. Staged in 3D (the reviewer's choice among a 3D transformation, a 2D
silhouette morph and an occlusion hand-off):

1. From 27.95 s the core swells to the length of a person (×14.7); the tracking camera backs off so it keeps the
   size measured on the original.
2. At 28.43 she appears inside it at 3/4 scale, lying along its axis (the stem end is her head), and grows to
   full size while the core shrinks inside her by 28.58. With motion blur the union reads as the original's morph.
3. She keeps the core's roll: the same measured table (about the camera's axis) turns her upright; the measured
   rate carries on seamlessly from the core's tumble into her righting. Her feet follow a smooth curve from the
   core's path to rest on her ground point at 28.95.
4. The tracking camera follows her hips on the measured path until 29.07, where the stage-space camera path
   takes over from the same pose.

## 10. Patchouli's hand becomes Remilia's (36.3 – 36.95)

In the original the camera pulls back from the finger gun; the hand turns its palm toward us, the fingers curled like
claws; Remilia's head appears at the top right and her wing rises beside the hand; then the hand, now hers, goes down
to the cup she holds at her waist. Staged in 3D (the reviewer's choice, the same kind of transformation as the core's,
described more precisely after the first review: the pointing hand becomes Remilia's own hand):

1. Remilia stands where Patchouli stands, facing the camera, below the close-up's frame and behind the hand. Her right
   wing is swept back behind her, and her right arm is hidden.
2. Patchouli's hand turns palm to the camera and opens, the fingers curled (a quarter turn of the wrist from the finger
   gun; palm up would take a half turn, which passed through odd shapes), her elbow dropping so the forearm runs
   steeply down as the original's does. Her head shrinks into Remilia's (36.37 – 36.47).
3. At `T_SWAP` = 36.517 Remilia's right hand appears exactly where Patchouli's is: same wrist position and orientation,
   same grip, spread and index length, scaled up to the same size, her elbow toward Patchouli's. The actual
   finger and thumb joint quaternions are copied too, including the knuckle's share of the wag. The swap sits between
   two frames, so no frame's motion blur mixes the two arms (on a frame, half the samples showed one forearm and half
   the other, a grey ghost).
4. Patchouli's right arm hides exactly at the swap; only then does her body shrink away (36.517 – 36.6).
   Remilia's hand comes down to the cup by about 37.12 after the speed review, shrinking back to its own size, while her right wing
   sweeps out behind it. Both hands use the same thumb anatomy, spreading along the palm with a bent tip. A short shutter until 36.85 keeps it as
   sharp as the original.

## 11. The cup drops (40.3 – 41.0)

The same device as the core's drop at 26.4 s: she lets go, and the camera falls with what she dropped.

1. She holds the cup in both hands. Both hands come over its rim, palm down (her left one out from under it in an arc),
   lifting it a little (40.3 – 40.56): in profile this reads as the original's single hand turning over the cup.
2. At `T_CUP` = 40.56 it falls gently, from rest but for a little of her hands' forward reach (which also carries the
   camera away from her legs), turning slowly. Her arms reach on, straight and side by side, the far one hidden behind
   the near one.
3. The stage camera's last key is computed so the cup already sits where the original has it at the release; from
   there a tracking camera with that orientation keeps the cup's middle on the screen point measured on the original,
   at the distance its measured width implies (one key per drawing, on a clamped motion curve).


## 12. Cup breakup and inversion (41 – 43.3 s)

The original's next inversion is at frame 1263 (42.10 s). `T_SHATTER = 42.083333` is between drawings and in
`CUTS`, so accumulation never blends the palettes. The original cup and camera transforms at 42.12 seed
`ensureFracture`; curved ceramic meshes separate from that position. The camera then follows one rim piece
while the other fragments drop out of view. Their trajectories are closed-form functions, not a physics simulation.

## 13. Rim fragment → Sakuya (44 – 45.85 s)

The fragment shrinks into her crown as her arms unfold, over 44.0 – 44.26 (`T_FRAG_END`): on the original the
outline changes a little every frame, with no cut. Her body starts at half size inside the fragment and grows out
of it; the fragment keeps its screen size against the camera's pull-back (its scale follows the camera distance)
while it shrinks, so both show for four frames. Before, the body appeared at full size in one frame while the
fragment vanished by 44.16, which read as a cut. The incoming camera starts from `shardFrame(44)`.
Her body grows from shard size to human scale while the camera backs away; its framing still pushes in relative
to her size. The overhead spin uses an unwrapped angle, and the upright yaw stays on the same revolution,
preventing a backward turn during interpolation. A smooth tilt reveals the torso and skirt. The arm sweep
continues through the turn, using IK-authored poses converted once to quaternion curves.


## 14. Sakuya throws the knife (49.00 – 49.40 s)

The near hand holds the grip, with a keyed world orientation for the upright blade. `ensureKnife()` saves
that exact transform and the outgoing film camera at 49.133333. Flight starts there with a constant leftward
velocity. The camera eases into measured knife framing, overtaking the prop so it moves right on screen.
The outgoing character remains present until she has left the view.

## 15. Knife edge becomes Flandre’s wing (50.15 – 50.80 s)

The wing’s outer tip starts at the blade tip, in the same camera. Its branch begins nearly straight and
arches as the camera pulls back; the crystals extend beneath it. The mesh deforms around its centerline,
keeping its thickness rather than flattening the whole mesh. Flandre’s body is already attached to the wing,
outside the initial close-up. No cross-fade, texture or reference-video geometry is used.

## 16. Flandre’s palette inversion (56.20 s)

Frame 1686 is the first black-on-white drawing. `T_FLANDRE_FLIP = 56.183333` is in `CUTS`, so no
motion-blur sample crosses palettes. The camera, head bow and closing hands continue across the inversion.
The previous endpoint was 56.5 s. The continuation follows below.


## 17. Flandre → Youmu’s blade (57.02 – 58.70 s)

The white katana crosses the black torso. Flandre grows about the lens (her position and scale multiplied about
the camera, which keeps her projection) so that the incoming blade, 1.6 m from the lens, is in front of her; this
staging is visible only in BTS. The camera push (`flandrePush`) does the framing. An earlier version also widened
her by 65 % and shifted her, which turned her head into a blob and pushed the wings out of frame early: it was
removed (57.4 – 57.9 s lose a little agreement to her shoulder shape, 56.7 – 57.3 s gain more).
`ensureGarden` saves the outgoing camera and places the incoming garden coordinate frame so the held sword and film
camera meet at 58.083333. That time is in `CUTS`: the nearly full black torso gives way to the black garden
background. The blade remains white across the change. Its thickness settles during the pull-back.

## 18. Sword → tree → Yuyuko (62.65 – 63.78 s)

Read on the full-rate sheet, the original is one continuous move with the tree as a foreground wipe at both ends:
the crown slides in from the right over Youmu as the camera pulls back (62.63 – 62.8), a wide shot holds the tree
between the two characters (62.85 – 63.45), the camera pushes in on the crown (63.45 – 63.65), and the crown whips
out to the left in two frames, revealing Yuyuko's close-up behind it (63.78).

A single translating camera cannot do both wipes (the crown enters from the right and leaves to the left, while
Yuyuko's close-up shares Youmu's orientation), and the first attempts showed it: the camera either flew through the
bare limbs (a white frame) or passed low beside the trunk and exposed Yuyuko's mark. The staging now used:

- The tree stands right of Youmu's close-up (`TREE_AT`), so the pull-back to the right (`treePath`, garden
  orientation) sweeps the crown in from the right.
- Before the tree, Yuyuko glides in on her first mark (`yuyukoGlide`, 58.95 – 59.53): the original shows her entering at
  the left edge at 59.0 and settling while Youmu drifts left in the pull-back. With our camera (fixed orientation,
  Youmu's measured framing) her far mark stays still on screen, and she used to be switched on in frame at 58.95.
- The wide shot's marks: Yuyuko at `YUYUKO_WIDE` facing the tree, Youmu (with sword, sheaths and ghost) at
  `YOUMU_WIDE`. Both take them at `T_MARKS` = 62.75 s, when old and new marks are all out of frame.
- Yuyuko's close-up rig (her mark, her facing, the camera's orientation `yuyukoQuat`) is turned 55° to the right of
  the wide shot (`YUYUKO_AT`), so the push-in ends in a pan right: the crown slides out left while she comes in from
  the right. The orientation eases in cubically over `T_PAN` – `T_REVEAL` (63.65 – 63.77) so the crown lingers at
  the left edge, then whips; the shutter is 1/1500 s because the original draws those frames sharp. She takes her
  close-up mark at `T_CLOSE` = 63.68 s (both marks out of frame), and Youmu's group is hidden from `T_PAN`, after the
  push-in has taken her out of frame on the right (the pan would sweep her back across it).
- Positions near Yuyuko are written as if she stood on her first mark and moved onto the current one
  (`gardenPointAt`), so the close-up framing keys, the fan's IK targets and the sway correction are unchanged.

Over 62.5 – 64 s this raised the mean agreement from 0.770 to 0.783 and the worst frame from 0.41 to 0.65. The wide
shot itself scores about 0.02 lower than the old composition (crown outline), which had no Yuyuko in it and whose
final sweep was a blurred white frame.


## 19. Fixes to the blade handoff and incoming petal

The enlarged Flandre torso could cross the blade's depth just before 58.083333, hiding the white sword
for a frame. During the incoming overlay the sword now draws in front, with depth testing restored on
every Youmu pose. Camera, sword transform and palette-cut timing are unchanged.

From 68.1 s a separate foreground petal follows a continuous measured screen path converted into the
garden's coordinates after camera placement. It grows and tumbles through 70.5 s while the continued
pan moves Yuyuko offscreen. This preserves the visible object for the future petal-to-boat transition;
the boat transformation is not part of this half-second extension.
