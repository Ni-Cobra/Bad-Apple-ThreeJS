# 04 — Characters, rig and props

## The cast

Milestone 1 first staged the choreography with two placeholder characters. They have since been replaced by
**Reimu** (the apple girl, 0:00 – 0:14.8) and **Marisa** (the witch on the broom, 0:14.8 – 0:26.9), modeled
from the original's silhouettes; **Patchouli** (the girl the apple core turns into, from 0:28.4) was added for
0:24 – 0:35, and **Remilia** (the girl with bat wings Patchouli turns into, from 0:36.4) for 0:35 – 0:41. Each feature below was measured on frames of the original: row widths,
bounding boxes and per-pixel agreement against renders at the same instant.

| What the original shows | How it's built |
| --- | --- |
| Reimu, front view: a huge bow above the head, about 1.6× the head's width, loops squared off with lace | Two lofted loops with a squarish section, a lace frill along the outer ends, a knot (`Reimu.makeBow`) |
| Reimu, profile: the bow reads as a thin lobe leaning back from the crown | The bow is shallow (about 7 cm deep) and tilted back 22° |
| Reimu: long, wide sleeves with frilled edges, a gap at the bare shoulder | Detached sleeves swept along the arm, with a lace frill on the seam and cuff |
| Reimu, profile: the sleeve hangs as a block under the raised forearm | The underside of each sleeve ring sags toward gravity, more toward the cuff |
| Reimu: frilled tubes on the locks beside the face; a jagged point under the chin in profile | Two sidelocks, each threaded through a frilled hair tube |
| Marisa: crooked witch hat, a bow on the front of the band | Crown swept along a spine that rises, then flops back and down; two puffed loops on the band |
| Marisa: long hair streaming back in jagged strands, tips breaking past the brim | 44 wavy locks that fan outward toward the tips, plus a braid on her left |
| Marisa, side view: two leg shapes hanging together under the broom | She rides side-saddle (pelvis turned 70°, torso counter-turned) |
| Marisa: two ribbon tails streaming behind her waist | A large apron bow at the back with two cloth tails in the wind |
| Broom: long handle, short fat bristle bundle (length/height ≈ 1.7) starting right behind the rider | Handle 1.4 m, bristle core 0.5 m, 170 fraying straws, two twig stubs under the handle |
| The core, dangling from her fingers at 0:26: a flat, lumpy top round the stem, a waist eaten to the core, a flared bottom | An hourglass lathe with ridges round the waist (`makeCore`), hung from the pinch between thumb and index |
| Patchouli: a puffy mob cap larger than her head, a crescent standing on its front, a small bow at its front and back edges | A tall dome with a frilled rim, tipped back; a torus crescent; two bows that read as knots in profile and as loops from the front |
| Patchouli: long straight hair to the thighs that never shows past her shoulders from the front | 36 straight locks rooted round the back of the head, draped over colliders on her back and robe |
| Patchouli: a long robe, only her shoes showing; long trumpet sleeves that hang from a raised arm | A flared robe lathe on the hips; sleeves swept along the arm (shared with Reimu), wide at the cuff, sagging |
| Patchouli, 0:34 close-up: a big fist with the index raised, the forearm in a bunched sleeve | Hands scaled 1.5, a rounded mass for the curled fingers, the index straightened (`pointR`); the sleeve slides back and narrows on a raised forearm |
| Patchouli, 0:36: the pointing hand turns into a finger gun, the thumb up from the top of the fist, then opens toward us | `thumbR` spreads the thumb along the palm with a bent tip, its root moved toward the index knuckle; the spread fingers curl like claws |
| Remilia, front view (0:37.5, measured row by row): the head, cap and hair, as wide as the shoulders; the waist 70% of that | A child's build (scale 0.88) with a slightly larger head; checked against the original with the camera solved |
| Remilia: a broad mob cap with a frilled brim and a bow standing up on her left | A flattened dome with a ruffled band, a bow of two loops tilted outward |
| Remilia: a short, spiky bob down to the jaw | 30 short locks round the sides and back whose tips curl outward, spiky bangs |
| Remilia: bat wings from the shoulder blades, spanning the frame; the leading edge rises to a clawed wrist and drops to the tip, the trailing edge scalloped between finger points | A flat membrane per wing (an extruded outline taken from the 37.5 s frame at 0.0021 m per pixel) on a joint at the shoulder blade, spread, raised and swept back by the shot |
| Remilia, profile with a teacup (0:40): the upper arm hangs, the forearm rises to the cup she holds in both hands | Thicker, longer arms than the others'; both arms placed by IK on the cup, with the palms' orientations |
| Teacup | A flaring bowl on a small foot with a looped handle (`makeCup`) |
| Castle | An original **domed manor**: central dome with lantern and spire, side pavilions, crenellated hall, gabled wing, bell tower |

## The rig (`src/characters/humanoid.js`)

- **Joints.** Hierarchy: hips → spine → chest → neck → head, plus clavicle → shoulder → elbow → wrist → hand
  (four two-segment fingers and a thumb) and hip → knee → ankle. Proportions are for a stylized 1.6 m figure.
- **Geometry.** Rigid, smooth, overlapping parts: lathes resampled through Catmull-Rom splines, tapered
  capsules and ellipsoids, each parented to a joint. For a two-tone silhouette film, rigid parts with generous
  overlap at the joints are indistinguishable from a skinned mesh, and they stay trivially deterministic.
- **Poses.** Euler angles in degrees per joint. Right-side limbs are **mirrored automatically**, so one set of
  anatomical angles works for both sides. Poses are plain objects blended by the keyframe tracks or motion curves in
  `src/core/timeline.js`. A hand's `grip` (0–1) curls all the finger joints.
- **Head.** A deformed sphere: round cranium, jaw narrowing to a chin, a vertical face plane and a small nose,
  so profile shots read as a face.
- **Options.** `armR` (arm radii: Marisa's are slim, for the 0:25 close-up of her arm), `handScale`, and
  `fist` (a rounded mass for the curled fingers that shows as the grip closes, for close-ups). `pointL/R` in a
  pose straightens the index whatever the grip. `pinchPoint(side)` is where a pinched object hangs: at the index
  fingertip, a little toward the thumb's.
- **Sleeves.** `addSleeve`/`updateSleeve`: rings swept along shoulder → elbow → wrist, the cloth on the gravity side
  of each ring sagging more toward the cuff (Reimu's detached sleeves, Patchouli's trumpet sleeves). Options set
  the radius and sag along the sleeve, Reimu's lace, and `slide`: a loose sleeve slides back down a raised forearm.
- **IK.** `reach(side, target, pole, weight)` is an analytic two-bone solve applied on top of a pose: it puts
  the wrist on a world point, the elbow bending toward the pole, and blends with the posed arm by `weight`.
  Marisa's snatch and bites use it, so the hand meets the apple, and the apple meets her mouth, exactly
  whatever the rest of the pose does.

## Secondary motion: gravity chains

Hair locks, the sidelocks, the braid and the apron-bow tails are all chains solved by `chain()`:

1. Each chain is solved **in its parent joint's space**. World "down" plus the current wind vector is
   transformed into that space every frame, so hair always hangs toward real gravity, whatever the head does.
2. Each segment's direction blends from the chain's rest direction toward gravity, following a stiffness
   curve, plus an optional `curl` (the wave and outward fan of Marisa's hair, bangs).
3. Layered sines of time add sway or flutter, stronger at the tip. Wind strength scales the flutter.
4. Points are pushed out of **collision spheres**: head, neck, chest, back and shoulders, expressed in the
   chain's space. Long hair drapes over the back instead of passing through it.

Everything is analytic in `t`, with no simulation state, so any frame can be rendered independently. That's
what makes sub-frame motion blur and parallel re-renders possible.

The geometry is then rebuilt each frame. `StrandBatch` sweeps a tapered, flattened tube along each polyline:
radius 0 at the tip gives the spiky hair ends that define the silhouette's edge. `ClothStrip` builds a grid
from a set of chains (the apron-bow tails). Reimu's sleeves are also `ClothStrip` grids, but their rows are
rings swept along the arm rather than hanging chains (see below).

## Reimu (`src/characters/reimu.js`)

- **Bow.** A knot and two loops lofted through 17 superellipse rings (squarish section) that grow from the
  knot outward and rise slightly, closed by a flange whose alternate points stick out further: the lace
  along the outer edges. It spans 0.45 m; its shallow loops sit lower against the crown, with a slight backward tilt.
- **Hair.** A shell with extra front volume, 26 shorter, wider overlapping back locks, 4 short side locks behind
  the cheek line, 13 uneven bangs rooted outside the scalp, and two sidelocks in front of the ears. A frilled hair tube (a lathe
  with toothed rims) rides each sidelock, placed on its chain every frame.
- **Face.** A static profile measured on the 7.3–11 s close-up, where her mouth never opens (the lip notch stays
  within 0–3 px at 480×360 frame by frame): a hollow under the nose, the upper lip, a small notch, the lower lip a
  little behind it, a hollow and the point of the chin, on a finer head mesh (64×128) so the lips resolve. An
  animated talking mouth (a paper-colored opening and jaw drop) was tried and removed: it looked uncanny and the
  original has nothing like it.
- **Detached sleeves.** Each sleeve is 30 rings swept along a spline through the shoulder, elbow and wrist,
  so the arm is always inside it. The rings widen toward the cuff, and the part of each ring on the gravity
  side sags, up to 15 cm at the cuff: with the arm down it's a long flared tube; with the forearm raised it
  hangs below it. Alternate rings push the outer-back seam out (the lace frill) and the cuff ends in teeth.
  A ribbon ties the top round the upper arm, leaving the shoulder bare.
- **Clothes.** A sleeveless vest, a standing collar pointed at the front with an ascot, and a long flared
  skirt (64-segment lathe with 16 pleats).

## Marisa (`src/characters/marisa.js`)

- **Hat.** A 0.29 m brim with a gentle wave. The crown is a tube swept along a crooked spine that rises,
  then flops backward and down, re-tapered to a point. A band, and a bow of two puffed loops on the front.
- **Hair.** A shell, 44 long locks rooted all round under the brim, each with 1.5–2.7 soft waves and an
  outward fan toward the tip, so from below or behind the tips break the brim's outline in jagged strands.
  11 bangs. A braid on her left: a strand whose radius pulses like plaits, ending in a small tuft.
  Wind (opposite to flight velocity) streams all of it back and increases the flutter.
- **Clothes.** A bodice, a full skirt with petticoat volume, puffed short sleeves, cuffs, and boots.
- **Apron bow.** Two loops and a knot at the back of the waist, and two 14-row ribbon tails with V-cut ends
  that stream in the wind.
- **Skirt in the wind.** The skirt tilts toward the airflow (gravity plus wind, in hip space), so at flight
  speed it blows back and merges with the bristles, as in the original.
- **Hands.** The right hand keeps the broom. The left, on the camera side of the side shots, is driven by IK
  from the snatch to the end: it catches the apple, carries it straight to her mouth, holds it there and
  brings it in for each bite.
- **Seat.** Side-saddle (`ridePose` in `src/shots/poses.js`): the pelvis turns 70° to her left so both thighs
  rest across the handle and the shins hang together, and the spine turns back so the torso faces the flight.
  Forward leans go on the chest, after the counter-turn, so they stay leans rather than tilts to the side.

## Patchouli (`src/characters/patchouli.js`)

- **Mob cap.** A puffed dome widest just above its rim (a muffin, not a ball: a round dome read as a ball sitting
  on her head), with a soft frilled rim, set back on the head so the face shows under its front. A thick crescent
  moon (a flattened torus arc) stands on its front; a small bow sits at the front and back of the rim, its loops
  pointing forward and back so they stick out in profile.
- **Head.** Her own head shape (`headGeometry` options, the defaults unchanged for the others): a fuller jaw
  with the chin almost under the nose, and an open mouth, as in the 0:34 close-up.
- **Hair.** A shell, 36 thick straight locks down the back to the thighs, rooted round the back of the head only
  (in profile the column of hair behind her head is as wide as the cap; from the front it doesn't show past her
  shoulders); they drape over colliders on her back, hips and robe. A lock in front of each ear tied with a
  ribbon near its end; short bangs (longer ones hid her face profile in the close-up).
- **Clothes.** Bodice, a long robe flaring to the ankles (her shoes show below it; nearly as deep as it is wide,
  as her profile shows), two ribbon tails at the waist, trumpet sleeves. A hanging arm's cuff flares less; on a
  raised forearm the sleeve narrows, and while she points (`sleeveTuck`) it falls back along the forearm instead of
  hanging as a bell.
- **Book.** Placed in hips space by the pose (`holdBook()`), so it bops with her; her left hand reaches its
  bottom edge by IK (`bookGrip()`). Up against her chest, its top tipped out, then flat against her thigh after
  she turns (in profile the original shows no book in front of her).
- **Her right arm: one curve.** Its keys are FK angles, IK targets for the wrist (hips space, with a pole) or the
  pointing pose (the wrist where the original has it at 34 s, the hand turned so the finger stands up). Each key
  is solved once into shoulder, elbow and wrist rotations (`ensureArm`) and a motion curve runs through them; the
  elbow and hand trail the shoulder by a frame or two. Keep the elbow's bend direction (the IK pole) consistent
  between neighbouring keys, or the upper arm spins about itself between them.
- **Proportions.** Scale 0.94, a slightly larger head (R = 0.105), hands ×1.5 with a fist mass and a longer,
  thicker index. Checked with row widths against the original at 29.07 s (the robe matches to within 1 – 3% of
  her height) and with zoomed crops of her head against 32.8 and 34.83 s.
- Turntables: `?lab=patchouli`, `?lab=patchead`, `?lab=hand` (her pointing hand).

## Remilia (`src/characters/remilia.js`)

- **Build.** Scale 0.88 (a child's height, about 1.3 m) with a slightly larger head (R = 0.108), shoulders a little
  narrower, and thicker, longer arms than the others' (in the 0:40 profile her arm is as thick as her neck). Short
  puffed sleeves with a ruffled cuff, a bodice with a small collar, a flared skirt below the frame.
- **Mob cap.** A broad, flattened dome with a ruffled band round its rim (a taller dome made her head read too big in
  profile), a bow standing up on her left (the screen's right when she faces us).
- **Hair.** A shell and 30 short locks round the sides and back, down to the jaw, their tips curling outward; spiky
  bangs. (A wider flare at the jaw, which the original seems to show, scored lower.)
- **Wings.** One flat, thin extruded membrane per wing, its outline traced from the 37.5 s front view: the leading
  edge rises to a clawed wrist, drops to the tip, and the trailing edge runs back in shallow scallops between finger
  points. Each wing hangs on its own joint (`wingL`, `wingR`) at the shoulder blade; `poseWings(L, R)` takes
  [sweep back, raise, pitch] in degrees per side. They are added after the Humanoid is built, so the class re-reads
  the rest pose afterwards.
- **Both arms follow the cup.** The shot gives the cup one motion curve in her hips space; each hand is placed by IK
  so the middle of its palm is on its grip point (left hand under the cup, right hand on its side), with the hand's
  orientation given as the palm's normal and the fingers' direction (`placeHand`, `handQuat` in the shot list). The
  hands can't drift off the cup, and she holds it with both hands to the end. Before the morph's swap her right arm
  is hidden (its shoulder joint scaled to nothing); at the swap her hand takes Patchouli's exact pose, grip and size.
- **Wing tips** are joints too (`wingTipL`, `wingTipR`), for `tools/motion.mjs`.
- Turntables: `?lab=remilia` (wings spread), `?lab=remhead`, `?lab=cup`.

## Props (`src/props/props.js`)

- **Apple.** A lathe with a five-lobe radial modulation, top and bottom dimples, and a curved stem.
  `setBites()` carves bites out of it: each is a sphere about as wide as the apple, placed where her mouth
  touched it (solved once from the pose at each bite). Vertices inside slide toward the apple's center until
  they leave the sphere, like a boolean subtraction, and the rim is scalloped like teeth marks. (`?lab=apple`
  shows a bitten apple.)
- **Apple core.** `makeCore()`: an hourglass lathe, origin at the stem's top (where the fingers pinch it), with
  ridges round the eaten waist and two lumps on the top rim. It swells ×14.7 before it turns into Patchouli.
- **Broom.** A bent handle with knots and two twig stubs, a binding, a short fat bristle core and 170 spiky
  straws that fray past it.
- **Castle.** Built from boxes, domes, cylinders and pinnacles on a plinth trimmed to the building's
  footprint (seen from above, a deeper plinth showed as a white wedge), at about 1 unit = 1 m.
- **Teacup.** `makeCup()`: a flaring bowl on a small foot, a looped handle (a partial torus), scaled ×1.25 (the
  original's cup is about 12 cm across). Origin at the foot, standing along +Y, the handle toward +X.
- **Stars and dust.** `THREE.Points` in a shared material, gray between the two palette colors, like the faint
  stars in the original.


## Sakuya (`src/characters/sakuya.js`)

- Shared Humanoid rig with a fitted torso, puffed shoulders, wrist frills, flared skirt and a waist bow.
- A scalloped maid headband, short uneven bob, bangs and two small side braids distinguish her from Remilia.
  Hair uses the existing deterministic `StrandBatch`/chain system; the braids have a small analytic sway.
- The shot grows her from the ceramic shard to normal human scale. The overhead arms unfold before the
  body rights itself. Both arms use one quaternion motion curve, including the IK-authored gesture keys.
- `?lab=sakuya` shows the model in isolation. Joint probes and `tools/motion.mjs --char sakuya` work normally.
- The hair silhouette, skirt flare and folded-arm poses remain approximate; see the current status notes.

`makeCupFragments()` builds six curved, thick bowl sectors plus the foot and handle. These are real meshes
with fracture edges and depth, visible in the witness camera, rather than flat silhouettes or video textures.


## Flandre (`src/characters/flandre.js`)

- Reuses Remilia’s child rig and bob/cap construction, with a fuller cap, side bow, separate ponytail,
  longer arms and broader bodice. The Remilia constructor accepts overrides without changing her own defaults.
- Two extruded curved branches carry eight faceted pendants each. Their outer width follows their length;
  the crystals have straight profile edges (`smooth: 1`) rather than a rounded lathe silhouette.
- `poseArch()` changes the branch centerline while preserving thickness; it evaluates from saved vertices,
  so seeking never accumulates deformation. Pendant attachment heights follow the same arch.
- `?lab=flandre` provides a turntable. Arm, head and wing-tip joints are available to the probe/motion tools.
- Hair and ponytail use the deterministic chain system. Cap, ponytail and hand contours remain approximate.

`makeKnife()` builds an extruded pointed blade, guard and grip. The grip is its origin and the blade extends
along local +Y. The shot attaches it to Sakuya’s palm, caches the release transform, then flies it analytically.
The later blade is a separate katana, described below.


## Youmu (`src/characters/youmu.js`)

Uses Sakuya’s rig with longer arms (`Sakuya` accepts optional rig parameters; its defaults are unchanged). The maid
headband, braids and apron bow are hidden. From the drawings at 59.9 – 62.3 s: a round bob cut straight at the jaw
(a solid lathe under thickened locks, so the cut ends read without comb-like gaps); a thin hairband with one tall
ribbon loop standing over her left temple and leaning outward (screen right when she faces the camera), plus a
small loop behind it; an A-line skirt to the knee. The shot scales her head by 1.12 (uniformly; an earlier
non-uniform 1.22 × 1.02 × 1.4 made it boxy). The anatomical left hand holds the sword (screen-right in the front
view). The sword is animated first, then `placeHand` solves contact with a continuous elbow pole; the free hand's
pole swings behind her after the whirl, so that arm stops being akimbo and hangs by the hilts. `?lab=youmu`
isolates the model.

## Yuyuko (`src/characters/yuyuko.js`)

Uses Remilia’s rig with the wings removed and a larger head (`headR` 0.122) with a stronger face profile
(`headGeometry` takes a `nose` height now; the default is unchanged). From the close-up at 63.9 – 70 s: a tall,
puffy mob cap (as tall above the brow as her face is long), set back so the face stands in front of it in profile;
its frilled rim is a ruffled band plus two drooping flaps, over the brow and on her right (not a brim all round,
which read as a helmet); the crest is a flattened cone leaning back, so it reads as a triangle both from the front
and in profile. Remilia's jaw-length bob, wavier and thicker, longer at the back, the locks beside the face kept
short so the jaw line shows. A high kimono collar just under the chin (leaving the dark notch the profile shows),
broad shoulders, ruffled furisode sleeves and a floor-length robe. The left palm holds an opening pleated fan.
`?lab=yuyuko` isolates the model; `--tweak` now also runs on lab turntables, so close views are one command
(`--tweak "(f,t)=>{f.camera.fov=10; ...}"`).

## Garden props (`src/props/garden.js`)

The katana and two sheaths are extruded meshes; the fan has radial folds in depth. The ghost is an
ellipsoid with a tapered tube tail. The cherry tree (as seen at 63.25 s): a trunk rising to a fork under the right
edge of a low, rounded blossom crown (lumpy clusters around a solid core); on the right, three bare limbs fork seven
times each, spreading in the picture plane and ending in fine twigs a few millimetres thick. Seeded, its meshes are
merged to reduce draw calls. Petals use seeded instanced meshes with
analytic positions and rotations. No reference frames, raster tracing or video textures enter the scene.


### Expression and prop fixes

Flandre's smile is a thin crescent laid onto the face surface between nose and chin (`Flandre.onFace` projects
the flat shape onto the head mesh), shown from 55.35 s as on the original and widening into a grin during the bow.
It draws over the fringe (no depth test), since the original shows the grin under her bangs. Its material follows
`paper` each frame. (It used to float at eye level, 2 cm in front of the face, which looked wrong whenever she moved.)
Youmu wears both scabbards crossed behind her waist, attached to her hips (`SHEATH_WORN`, hips space): each runs from
one hip, in front, across to behind the other, rising a little, so they read as an X from the front and stick out
front and back in profile. The receiving scabbard is an empty, longer sheath, distinct from the second sheathed
sword; it leaves her waist for the sheathing, its opening on the held blade's axis. The late foreground blossom is a separate
extruded, cupped petal with a notched tip, rather than another small atmospheric instance.
