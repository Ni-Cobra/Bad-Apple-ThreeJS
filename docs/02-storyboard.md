# 02 — Storyboard analysis (0:00 – 0:35)

Method: the original was decoded at 10 fps and 30 fps into labeled contact sheets (`tools/py/compare.py`,
`tools/py/seq.py`), then every beat was timed to the frame. For each beat, the table gives what the original
shows and how the 3D recreation stages it. The staging is physical: one world, real positions, real camera moves.

## World layout

| Element | Where it lives |
| --- | --- |
| Reimu | Standing at the world origin, facing +Z, on a cliff top. The cliff uses the background color, so it is invisible in the final render but visible behind the scenes. |
| Apple | In Reimu's left hand. Thrown at 12.0 s, it **keeps rising** like in the original (no gravity): a fast launch that settles into a steady climb of 1.3 m/s, drifting forward. |
| Marisa | Flies along world +Z, riding side-saddle, about 8 m above the cliff top. She passes just over the rising apple and snatches it at 14.785 s, then carries it in her left hand. |
| Castle | Static, about 260 m ahead of Marisa along her flight line, below and to the left. |
| Stars | A sky dome centered on the camera, which makes them effectively infinitely far. |
| Dust | A box of small flecks around the flight path. They streak into speed lines when the camera moves fast. |

## Beats

| Time (s) | Original | Recreation |
| --- | --- | --- |
| 0.00 – 1.40 | Solid black. | The camera starts **right on Reimu's chest** (0.13 m from her, in front of her left shoulder), so the whole view is her silhouette. |
| 1.40 – 4.90 | White breaks in from the right edge; the camera zooms out from her upper body as she bops, until the whole bow is in view. | One **straight pull-back** from the front, eased in from rest: fast at first (0.8 m/s), slowing to about 0.5 m/s. Distances were measured on the original (head and shoulders fill the frame at 2.5 s, the bow's top reaches the frame at 4.1 s). |
| 0.00 – 6.70 | She bops to the music: her head dips on every beat, her body sways side to side. | The bop is **measured on the original**: a knee-dip bounce at every beat (lowest at 4.42 s + k × 0.421 s), a hip sway over four beats with the upper body 0.13 s behind, and a slow idle turn. The camera settles at 2.2–2.3 m. |
| 6.70 – 7.30 | Quick push-in, blurred transition to a profile shot. | The camera **pushes in and swings 90°** to her left side as she raises the apple, blurred with 32 sub-frames. |
| 7.30 – 10.95 | Profile: apple held low in front of her chest, then raised; slow zoom; she bows her head toward it. | Slow dolly-in on a spline; pose blends `W_HOLD_LOW` (forearm level) → `W_HOLD` (forearm upright, the sleeve hanging under it) → `W_HOLD_CLOSE`. Her arm runs on a motion curve up to the wind-up: the held poses drift instead of freezing. |
| 10.95 – 11.72 | The arm drops out of frame, the head bows, the camera drifts left. | Pose `W_LOWER`, then a wind-up (`W_WIND`); the camera tracks forward (+Z) so she moves to the right edge. The lowering flows into the wind-up without stopping at `W_LOWER`. |
| 11.72 – 12.05 | The arm swings through the frame (heavy blur) and throws. | Linear swing to `W_THROW`; the apple is released at **12.0 s**, launched at (0, 8.6, 3.3) m/s. |
| 12.05 – 12.50 | White sky; the apple drops back in from the top. | The camera **cranes up after the apple but lags**. The apple leaves the top of the frame, then the crane catches up and it re-enters from the top. |
| 12.20 – 14.60 | The apple comes in from the top, sinks to the lower part of the frame, rises back above center and settles just below it, growing slightly as the camera closes in. | The apple's screen position and size were **measured on the original** every 0.1 s; the camera is solved so the rising apple lands exactly there, at the distance its measured size implies. |
| 14.60 – 14.785 | The broom slides in along the top of the frame from the right, then her body. | **Marisa flies in over the apple** (right to left in this framing). She leans far down to her left, legs trailing behind, and IK brings her hand to the apple exactly at 14.785 s. |
| 14.785 | Colors invert on the catch: the apple now hangs from her hand, the broom a band at the top. | The **palette flips on the catch**, framing unchanged: the night shot's camera starts exactly where the day camera ends (see [05-transitions.md](05-transitions.md)). |
| 14.80 – 15.26 | Close-up: the apple hangs from her hand; the arm runs up to the top of frame, a leg at the top right. | The camera flies with her, holding the framing. Her body is behind the apple, above the frame; only the arm and a leg show. The night camera is a motion curve through its keys, so this hold stays a hold (a uniform spline had it drifting toward the coming whip). |
| 15.26 – 15.90 | Whip pan; the broom and her body cross the top of the frame, then the broom with the bristles on the right. | The camera whips to her left side below the broom and drifts along it, while the apple travels up. |
| 15.26 – 16.85 | She brings the apple straight up to her mouth (she never lifts it overhead); her face in profile on the right, the apple held clear of it. | IK carries the apple from where she caught it to in front of her face on an arc clear of the broom, then to her mouth. The camera ends on her left side, a little below her face. |
| 16.85 – 17.20 | **She bites the apple.** | The apple is pressed to her mouth and her head dips. When she pulls it away, the apple has a **bite mark** where her mouth touched it. |
| 17.20 – 18.20 | Pull-back reveals the hat, then the whole rider on the broom; the bitten apple at her mouth. | Continuous spline pull-back and orbit to her left side. |
| 18.20 – 21.10 | Wide: the rider small in the center, faint stars; she keeps the apple at her mouth. | The camera flies with her at 6.2–6.5 m. She bobs slowly on screen as in the original (measured: highest at 19.5 s, lowest at 20.45 s). She leans forward, hair, skirt and apron-bow ribbons streaming back, and **takes two more bites** (19.7 s and 21.0 s). Her poses from 15.3 to the let-go run on a motion curve; each held pose drifts a little toward the next. |
| 21.10 – 22.15 | Speed lines; the rider accelerates and grows; the view swings behind her. | Speed boost of up to about 34 m/s plus an orbit from her side to behind her. The dust streaks through the motion blur. |
| 22.15 – 24.00 | Seen from behind and above, flying toward a castle in the lower left; the bristles fan out to the lower right. | The camera follows behind her, above her left shoulder, so the side-saddle legs are foreshortened below her. The castle's position is **solved** so it lands in the lower-left of the frame at t = 23.3 s. |

## 0:24 – 0:35

Method as above, plus measurement: `tools/py/blob.py` tracks the ink blob's centroid, area, bounding box and
principal axis frame by frame. The falling core's screen path, size and roll, and the figure's roll as she
rights herself, are **tables measured on the original**; the camera is solved from them. Other camera keys were
solved against the original with `tools/tune.mjs` (see [06-agent-process.md](06-agent-process.md#9-024--035)).
Two stagings were asked of the reviewer before building: the core-to-girl morph (a 3D transformation) and the
palette wipe (the original's own device).

### World layout, continued

| Element | Where it lives |
| --- | --- |
| Core | What is left of the apple. Marisa eats it off screen (the apple becomes the core at 23 s, hidden behind her), holds it out, and drops it; it falls about 13 m, turning into Patchouli on the way down. |
| Patchouli's stage | A ground point below the fall, placed once (`ensureStage`) so she lands where the core's path puts her. Its floor is background-colored (visible behind the scenes). Stage space: +Z is the screen's right at 29 s, the camera is on the -X side. |

### Beats

| Time (s) | Original | Recreation |
| --- | --- | --- |
| 24.00 – 25.00 | Seen from behind, flying toward the castle. | The existing flight continues. |
| 25.00 – 25.60 | She grows fast in place, holding something out to her left; the castle drops out of the bottom left. | She holds the **core out to her left side** by the stem (IK on the pinch point between thumb and index). The camera rushes in from behind and below her onto the arm; keys solved against the original. The castle is hidden once it has left the frame (the level close-up would otherwise catch its spire). |
| 25.60 – 26.40 | Close-up: an arm from the right edge, the hand drooping, a bitten-down apple core pinched by the stem. | The hand droops from the wrist, the core hangs from the fingertips and swings a little. Camera orbit solved around the pinch point (0.87 → 0.91). |
| 26.40 – 26.66 | The fingers open and the core drops; the arm leaves the top of the frame. | The fingers open at `T_DROP` = 26.42; the wrist is then held where it was (no IK jump), she flicks the core down and a little to her left, then swoops up and speeds off. The camera tracks the core from the release on: the flick and the toss carry it out of the column of her legs. |
| 26.66 – 27.25 | Black: the core tumbles counter-clockwise, rising in the frame as the camera catches up. | **Tracking camera solved from the measured table**: centroid, area (distance) and roll (the stem's direction, unwrapped: about 450 – 550°/s). The core falls with drag. |
| 27.25 – 27.40 | A soft straight edge at 30° sweeps from the lower-left corner to the upper-right one: white on black ink again. | **Palette wipe**: a full-screen pass inverts the frame behind the edge (`wipeMat`), measured on three drawings; then the palette switches to day. |
| 27.40 – 28.10 | The core rises out of the top, then comes back big and blurred from the top right. | Same tracking camera (in the clipped frames the core's centre is estimated from its visible part). |
| 28.00 – 28.43 | The core grows on screen and settles at the centre. | The core **swells** to the length of a person (×14.7) while the camera backs off to keep its measured size. |
| 28.43 – 28.62 | The core's flared ends become a robe's hem and a head of hair. | **3D transformation**: she grows out of the core (scale 0.75 → 1) as it shrinks inside her; the stem end becomes her head. |
| 28.43 – 29.07 | The figure keeps turning counter-clockwise, slowing, and lands upright at the lower left. | She keeps the core's roll (same measured table, about the camera's axis) while her feet follow a smooth curve down to rest at 28.95. The camera tracks her hips on the measured centroid path. |
| 29.07 – 35.00 | She bops to the beat, like the others. | **Measured** on the top of her cap: a dip every 0.42 s (the song's beat, the same as Reimu's), about 0.15 beat ahead of Reimu's dips, 2.5 cm deep. Knee dip and a small head nod, as for Reimu. |
| 29.07 – 30.45 | Patchouli stands in 3/4 view facing right, a book against her chest (its top corner tipped out past her shoulder), her right arm hanging, the hand showing at her back hip; the camera zooms in, then pans. | The book is placed in hips space and her left hand reaches its bottom edge by IK. Stage-space camera path; keys solved as a level dolly (distance, height, sideways offset, pitch). |
| 30.45 – 30.90 | Her right hand rises in front of her, under the book, to her chest. | One slow move (about 0.4 s), not a snap. All her motion runs on **motion curves** (`flow`): the velocity carries through the keys, nothing stops dead at a key, and each part (body yaw, head direction, torso and book, right arm, hand) has its own curve so they overlap. |
| 30.95 – 31.15 | She turns to face us. | Body yaw −33° → −80° over 0.2 s. |
| 31.13 – 31.75 | Her right arm comes out to her right at shoulder height, quickly to 31.5, then drifting; the sleeve hangs from it like a bell; her head still turned to the screen's right. | The hand's track was **measured** on the original (the leftmost point of the silhouette above the hips, frame by frame) and the IK keys for her wrist were set and solved against it, the depth held on a smooth trend (the silhouette can't see it). |
| 31.35 – 31.85 | Her head turns round to the left in one even half second: turning from 31.37, facing us at 31.58, left profile by 31.85 (timed frame by frame on the head). | A separate curve for where her face points (in the world), shared by neck and head, with a small dip and tilt into the turn, a little past it, then settling. Peak head speed about 14° per frame (it was 23° per frame over 31.58 – 31.92, which read as a snap). |
| 31.77 – 32.35 | The arm stretches out fully to the left, palm open (31.77 – 31.93), then sweeps straight back and down as she swings round to her left profile; her hair swings out behind. It never holds at full stretch. | A quick flick to full reach, then the sweep. The palm rolls over as the arm sweeps down (the elbow's bend flips while the arm is straight, so the upper arm doesn't spin later). The book goes down to her hip; a gust along the turn swings the hair. |
| 32.60 – 33.48 | The far arm rises from hanging to horizontal in one steady lift, the trumpet sleeve hanging from it. | Shoulder keys every 0.14 s from the measured lift (about 40° below horizontal at 32.9 s, level at 33.45 s). |
| 33.48 – 33.88 | The elbow folds the forearm up, the hand high in front of her, the sleeve hanging from the forearm. | The elbow and hand trail the shoulder by a frame or two (overlapping action), fading out as the hand comes to the exact pointing pose. |
| 33.88 – 34.10 | The hand comes down in front of her face, index raised; the camera pushes in (33.85 – 34.2). | The pointing pose (wrist where the original has it, the finger straight up) is solved once into joint angles, so the whole gesture is one curve. Camera keys at 33.85, 34.0 and 34.2 re-solved; the camera path is a motion curve too, so the push-in eases into the close-up. |
| 34.10 – 35.00 | Close-up: face in profile under the cap, the forearm rising diagonally, the finger wagging. | The wag was read **drawing by drawing** (right, up, left, up, right, up, left, …); the finger swings smoothly through those drawings (each taken at the middle of the time it is held), and a short shutter (1/90 s) keeps it as crisp as the drawings. |

## 0:35 – 0:41

Method as for 0:24 – 0:35: contact sheets at 4 and 30 fps, then the shapes measured frame by frame (row widths of
Remilia's front view, the top of her cap for the bop, the cup's blob for its fall). One beat was put to the reviewer
before staging: Patchouli's hand turning into Remilia's wing (a 3D morph was chosen, like the core's, over an
occlusion hand-off and a 2D silhouette morph). After review, the reviewer described the beat more precisely: the
pointing hand becomes Remilia's own hand, palm facing, which goes on to hold the cup she already holds in her other
hand; she holds it with both hands to the end and lets it fall gently.

### World layout, continued

| Element | Where it lives |
| --- | --- |
| Remilia | On Patchouli's stage, where Patchouli stands, facing the camera (stage −X); Patchouli turns into her. Later she turns to her right (the screen's left, stage −Z). |
| Terrace | Patchouli's floor (background-colored) is a terrace whose edge runs just in front of where they stand (stage z = −0.28). The cup falls past it. |
| Teacup | In Remilia's left hand in front of her waist (inside her silhouette); her right hand, the one that was Patchouli's, comes down and holds it too, and she keeps both hands on it until she lets it fall at 40.56 s. |

### Beats

| Time (s) | Original | Recreation |
| --- | --- | --- |
| 35.00 – 35.45 | The camera pushes onto her raised hand and pans left; her face leaves the frame at the right. | Stage-space camera keys solved against the original (`tools/tune.mjs`). |
| 35.00 – 36.05 | The finger keeps wagging, once per beat: left 35.1, right 35.35, left 35.57, right 35.8, left 36.0. | The wag keys read drawing by drawing, as for 34 – 35 s. The finger takes 40% of each swing (it pivots at the knuckle) and the hand 60%: the drawings are inconsistent (at 35.6 the fist stays put, at 35.8 it tilts with the finger), and that split scored best. |
| 36.05 – 36.40 | The hand turns so the finger points up to the left, the thumb comes up (a finger gun), the forearm swings flatter. | The finger leans on to −1.45 wag units, the thumb stands up from the top of the fist (`thumbR`), the wrist moves out so the forearm flattens, and the sleeve slides back past the elbow (`sleeveBack`). |
| 36.40 – 36.53 | The camera pulls back; the hand turns its palm toward us, the fingers curled like claws, the forearm running steeply down; Remilia's head appears at the top right and her wing's edge rises beside the hand. | Patchouli's hand turns palm to the camera (a quarter turn of the wrist from the finger gun) and opens, curled, her elbow dropping; her head shrinks into Remilia's (36.37 – 36.47). At `T_SWAP` (36.517, between two frames) Remilia's right hand, hidden until then, appears exactly where Patchouli's is: the same position, orientation, individual finger/thumb rotations, grip and size (scaled ×1.39), her elbow where Patchouli's is. |
| 36.53 – 36.95 | The hand goes down in front of her; the wing fills the left of the frame. | Patchouli's arm hides at the swap and her body shrinks away (36.517 – 36.6), while Remilia's hand comes down in front of her chest to the cup at her waist, shrinking back to its own size. After the speed review, this move takes about 0.6 s and settles by 37.12; her right wing sweeps out behind it. A short shutter until 36.85 keeps it sharp like the original. |
| 36.60 – 37.10 | The camera pulls back fast and pans right onto her: front view, waist up, wings spread. | Keys solved against the original, then thinned to one move (dropping a key that swung the camera sideways cost 0.003 and halved its acceleration peaks). |
| 36.90 – 38.95 | She bops, wings spread, her hands at her waist (the cup inside her silhouette), the elbows at her sides. | **Measured** on the top of her cap: dips every beat (0.421 s, at 37.35 + k × beat), 0.1 s after Reimu's, about 2 cm deep, and a slow sway. The wings flap a little with the bop. |
| 38.95 – 39.45 | Her screen-left wing folds up; a teacup appears out at her side at chest height; she turns toward the screen's left, the head first. | The cup has one motion curve for its foot in her hips space (`CUP_PATH`), and both hands follow it by IK with their palms' orientations: her left hand under it, her right on its side. It comes out to her right side and up, then forward. The head turns to profile by 39.42, the body only reaches it at 40.0. The wings sweep back behind her, the right one folding up first. |
| 39.45 – 40.45 | Profile, the cup held up at chin height, the upper arm hanging and the forearm rising; she looks down at it; the camera pushes in. | Both hands on the cup, the far one hidden behind it and the near arm. The cup stands upright in the world, its handle away from the camera. |
| 40.30 – 40.75 | She straightens her arm, turning the hand palm down over the cup, and lets it fall. | Both hands come over the rim, palm down (her left one in an arc out from under the cup), lifting it a little; at `T_CUP` = 40.56 it falls with no flick, keeping only a little of her hands' forward reach; both arms go on reaching out, side by side, the far one hidden behind the near one. |
| 40.60 – 41.00 | The camera drops with the cup: the arm leaves the top of the frame, the cup sinks to the bottom and rises back as the camera catches up. | **Tracking camera solved from the measured table** (the cup's centre and width, frame by frame, as for the core). The cup falls freely past the terrace's edge, turning slowly (its handle comes round to the screen's right, as the original shows at 41.2 s). |

After 41 s the cup falls until about 42.1 s and shatters as the palette inverts: that fall is longer than the
terrace's height would allow for a cup dropped to the floor, hence the terrace.


## 0:41 – 0:47

The cup keeps falling while the camera overtakes it, then it descends to the lower edge and breaks. A rim
fragment separates from the debris and turns into Sakuya, first seen from above with both arms spread.
The camera reveals her upright body as she spins, lowers her arms, turns and starts a forward gesture.

| Time (s) | Reference beat | 3D staging |
| --- | --- | --- |
| 41.00 – 42.10 | Cup rises to the top, tilts clockwise and drops toward the bottom. | Continue the existing fall and camera basis; extend measured centroid and rim-width keys. Slow the axial spin so the handle stays on the right. |
| 42.10 | White cup on black replaces black cup on white. | `T_SHATTER = 42.083333`, between frames 1262 and 1263; registered in `CUTS`. Direct frame decoding confirms frame 1263 is the first inverted drawing. |
| 42.12 – 43.15 | Cracks spread; curved bowl pieces, foot and handle separate; a rim fragment rises. | Six thick curved ceramic sectors with unequal fracture edges, a foot and a handle take over the cup's transform, separate on analytic paths and rotate. The breakup is stylized in space; no ground impact surface is shown in the reference or added here. |
| 43.15 – 44.00 | Most debris leaves the bottom; the camera centers on one spinning shard. | Follow the rim fragment with a smooth camera move, while the remaining pieces fall away. |
| 44.00 – 44.26 | The shard rounds out and sprouts arms; frame by frame the outline changes a little each time (no cut). | Her body grows out of the fragment from half size while the fragment shrinks into her crown (`T_FRAG_END`); the fragment keeps its screen size against the camera's pull-back, so both show for four frames. Her arms grow outward. Match the incoming camera to the outgoing shard camera. |
| 44.20 – 45.25 | An overhead figure spins counterclockwise, hands spread; she grows in frame. | Full 3D rig viewed from above. Unwrapped spin at 9.2 rad/s, continuous model growth to human scale and a matching camera dolly. |
| 45.25 – 45.85 | The skirt and torso become visible as she spins upright; arms sweep down. | Blend the overhead rotation into upright yaw without reversing the spin. Tilt, scale, camera and arm curves overlap. |
| 45.85 – 47.00 | Profile, then back and opposite profile; one arm folds across the chest and reaches forward. | Independent yaw and camera motion curves; IK-authored arm keys are solved once to local joint quaternions and interpolated through the gesture. A small beat dip continues. |

## 0:47 – 0:56.5

| Time (s) | Reference beat | 3D staging |
| --- | --- | --- |
| 47.00 – 47.65 | Sakuya raises the extended hand and curls its fingers; the other arm supports the gesture. | Continue the independent arm quaternion curves. Rotate the palm upward, curl the fingers and settle the skirt after the spin. |
| 47.65 – 48.30 | She draws the arm inward, turns through a broad back view and shows the opposite profile; a knife rises beside her head. | Continue the unwrapped yaw into the right-facing profile. Fold the far arm inside the body silhouette; the knife grip sits in the near palm and its blade emerges as the wrist rises. |
| 48.30 – 49.00 | Knife upright, held beside her face, with a slight beat dip. | Grip and knife share the palm position. The waist bow is modeled with pointed folds, visible behind her in profile. |
| 49.00 – 49.35 | A fast turn and throw toward the screen’s left; the camera leaves her behind. | `T_KNIFE = 49.133333`: the thrown prop inherits the held transform. A camera handoff begins from the outgoing camera, then follows the analytic flight. |
| 49.35 – 50.15 | Knife crosses the frame, then grows as the camera travels toward its edge. | Camera keys use measured knife bounding boxes. It moves right on screen while flying left in world space because the camera overtakes it. |
| 50.15 – 50.80 | The straight blade curves into a branching wing and pointed crystals appear below; Flandre enters from the right. | Match the blade tip to the outer wing tip and preserve the camera at the handoff. Deform the branch centerline while keeping its thickness, extend the crystals and pull back along the wing. |
| 50.80 – 52.60 | Back view; she looks around before her body follows. | Separate body yaw and head look curves. Her side bow and ponytail move from screen-left to screen-right through the turn. |
| 52.60 – 53.30 | She turns to the front; the wings sweep edge-on and reopen. | Unwrapped body yaw, overlapping head turn and wing pitch curves; crystal swing stays deterministic. |
| 53.30 – 54.65 | One hand opens palm-up, then the other. | IK-authored poses are converted to local joint quaternion curves; both arms continue through the gesture without solver switches. |
| 54.65 – 56.18 | Both palms open; the camera approaches while she bops. A thin smile shows on her lower face from 55.35. | Continuous framing and hand curves, small periodic body/head motion. The smile lies on the face surface between nose and chin (`Flandre.onFace`). |
| 56.20 – 56.50 | Palette inverts; she lowers her head slightly and curls her hands; her smile widens into a grin that shows under the fringe. | `T_FLANDRE_FLIP = 56.183333`, halfway between frames 1685 and 1686. The bow is 12° (a 28° bow turned her face to the floor and hid the grin the original shows). Blade geometry for the following beat is deliberately absent. |

The previous delivery stopped at **56.5 s**, just before the next blade appears.


## 0:56.5 – 1:10.5

| Time (s) | Reference beat | 3D staging |
| --- | --- | --- |
| 56.50 – 57.02 | Flandre keeps her head lowered as the camera approaches. | A straight push toward her chest (`flandrePush`); her head rises out of the top, the wings hold their height. Her figure is only scaled about the lens (invisible in the final frame, leaving room for the blade), never widened. |
| 57.02 – 58.08 | A white sword enters from the right and crosses her chest; her silhouette fills the frame. | Extruded katana, in front of the figure. The camera tracks its measured height. |
| 58.10 – 59.65 | Black background; the camera follows the blade to Youmu, holding it beside her face. Her ghost floats above; Yuyuko glides in from the left edge (59.0) and settles in the distance by 59.5. | Matched camera and sword transforms at 58.083333. Reveal the rig, two sheaths worn crossed behind her waist, ghost and deterministic petals while pulling back. Yuyuko's glide (`yuyukoGlide`, on her first mark) follows her measured screen track. |
| 59.65 – 60.57 | Youmu turns from profile to front, the sword up-left behind her head, her free hand on her hip. | Independent unwrapped body/head angles and a continuous sword position/orientation curve. The sword hand follows the grip by IK. |
| 60.57 – 60.97 | A fast cut down to the right; the long blade held pointing at the bottom-right corner. | `swordGesture`: 290 → 314°; the blade reaches full length by 60.7 s. |
| 61.03 – 61.37 | The blade whips up counter-clockwise past vertical as her arm rises up-right, drawn as wide blur wedges. | Unwrapped angle 312 → 445 → 545 → 585°; a 1/25 s shutter during the whirl gives the wedges. |
| 61.37 – 62.65 | From the raised hand the blade points down-left across her body; the arm lowers to shoulder height, the free arm hangs by the hilts, she turns to her right as the camera pushes in. | The elbow's pole swings behind her (the arm stops being akimbo); body yaw to 44°, look to 52°; the push-in starts at 61.45 s. |
| 62.65 – 62.85 | The pull-back to the right sweeps the blossom crown in from the right over Youmu. | The tree stands right of Youmu's close-up (`TREE_AT`); the camera path (`treePath`) starts from her camera at rest. Youmu, her sheaths and ghost, and Yuyuko take their wide-shot marks at 62.75 s, when both old and new marks are out of frame. |
| 62.85 – 63.45 | Wide shot: the crown on the left, the trunk at 0.6 of the frame, bare limbs fanning out to the right; Yuyuko small at the bottom left facing the tree, Youmu and her ghost at the right. | Recursive bare limbs ending in fine twigs; tree size and height grid-searched on 63.0 – 63.4. |
| 63.45 – 63.65 | The camera pushes in: the crown grows. | Dolly toward the crown; Youmu leaves the frame on the right and is hidden before the pan. |
| 63.65 – 63.78 | The crown whips out to the left and Yuyuko's close-up is there. | A pan right: Yuyuko's close-up rig is turned 55° right of the wide shot (`YUYUKO_AT`, `yuyukoQuat`), and the camera's orientation eases in (cubic) so the crown lingers, then whips. Short shutter (1/1500 s): the original draws these frames sharp. She takes her close-up mark at 63.68 s, when both marks are out of frame. |
| 63.78 – 65.35 | Yuyuko bops gently, facing the camera amid drifting petals. | Separate body/head motion and measured framing keys; tall mob cap with frill flaps and a pointed crest, jaw-length hair, high collar, ruffled sleeves. |
| 65.35 – 66.00 | She raises and opens a fan at screen-right. | A pleated mesh opens at the palm, with hand contact preserved. |
| 66.00 – 67.00 | The fan remains open; she faces the camera. | Held. |
| 67.00 – 67.50 | Her head turns into profile (3/4 at 67.1, profile by 67.5); the body follows. | `yuyukoYaw`, timed on the full-rate sheet; the face profile (nose, mouth, chin, the notch above the collar) shows from 67.5 s. |
| 67.50 – 70.00 | She holds the profile as the camera travels right, leaving her at the left edge. | The look passes 90° (to 108°) so her profile stays square to the camera's oblique view. A separate foreground petal tumbles in from 68.1 s. |
| 70.00 – 70.50 | Yuyuko leaves the frame; the foreground petal grows and tumbles toward the center. | Continue the pan, grow and turn `heroPetal`; end at 70.5 s before the boat transformation. |
