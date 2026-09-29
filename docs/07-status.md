# 07 — Status (0:00 – 1:10.5) and next steps

## Review pass (faces, 44 s morph, garden entrance)

Reimu's talking mouth removed (closed profile, as drawn); Patchouli's head turn re-timed (31.35 – 31.85 s); the
44 s fragment melts into Sakuya over four frames; Flandre's smile placed on her face; Yuyuko glides in at 59 s;
Youmu's scabbards hang crossed from her hips. Details and per-span scores in 06-agent-process.md.
Full pass (2115 frames, 0 – 70.5 s): **mean 0.9012, median 0.9070** (before 0.9008 / 0.9070). The deliverable
`deliverable/bad_apple_3d.mp4` and `score.csv` were rebuilt on 2026-09-29.

## Scene fixes and half-second extension

The source now ends at **70.5 s**. Reimu's bow, hair and animated mouth are reworked;
Flandre's smile remains visible at the flip; the incoming blade no longer disappears behind her torso;
Youmu's blade aligns with the empty scabbard; the foreground petal is staged for the future boat transition.

Selected agreement before → after: 8.0 s **0.909 → 0.924**, 8.5 s **0.877 → 0.901**, 11 s
**0.793 → 0.820**, 58.067 s **0.920 → 0.977**, 61.8 s **0.814 → 0.824**, 62.2 s
**0.793 → 0.805**, 70.5 s **0.827 → 0.997**. Reimu's front silhouette trades some agreement for the
reworked proportions (4 s **0.930 → 0.902**, 6 s **0.931 → 0.914**); the profile improves.
The smile barely changes the full-frame score and was checked in a close-up.

Comparison strips and disagreement maps: `tmp_out/cmp/final_faces{,_diff}.png` and
`tmp_out/cmp/final_late{,_diff}.png`. Affected motion clips are in `tmp_out/review-*.mp4`.
32 frames passed pixel-exact reverse seeking with BTS interleaved, with no browser errors.
The receiving sheath's axis and blade centerline match within 1e-12 m at four insertion times.
Full deliverable rebuilt on 2026-09-29: `deliverable/bad_apple_3d.mp4`, **1920×1080, 30 fps,
70.5 s / 2115 frames**, with the original soundtrack, comparison, BTS and running score.
Current full-pass agreement: **mean 0.9008, median 0.9070**. Over the shared 0–70 s interval the mean
is **0.9007**, unchanged to four decimals from milestone 6b. Scores are saved in both
`deliverable/score.csv` and `tmp_out/score.csv`. Historical milestone scores below are retained.

## Measured fidelity

`tools/py/score.py` decodes the original and the render at 160×120 and counts, for each frame, the share of
pixels that fall on the same side of mid-gray in both (silhouette agreement).

### Milestone 6b: 56.5 – 70 s polished by eye

Over **2100 frames**: **mean 0.9007, median 0.9083** (before: 0.9005 / 0.9096). The 0 – 56.5 s prefix is unchanged
(pixel-identical stills; 0.9093 / 0.9159). The 56.5 – 70 s span: **0.8643 / 0.8729** (before 0.8634 / 0.8751); its
worst frame is now **62.70 s, 0.548** (the crown sweeping in), up from 0.172. By passage, mean before → after: blade
0.788 → 0.798, Youmu 0.854 → 0.854, tree 0.749 → 0.768, Yuyuko 0.913 → 0.908.

The score barely moves; the point of the pass is how it reads. Yuyuko has a mob cap with a crest instead of a
helmet, a face in profile and a timed head turn; Flandre is no longer stretched; the tree shot has the original's
composition (both characters beside the tree, the crown wiping in and out); Youmu's head, skirt and sword whirl follow
the drawings. The Yuyuko close-up's −0.004 is accepted for that (06-agent-process.md, section 19).

| Second | Mean agreement |
| ---: | ---: |
| 57 | 0.789 |
| 58 | 0.899 |
| 59 | 0.851 |
| 60 | 0.854 |
| 61 | 0.852 |
| 62 | 0.787 |
| 63 | 0.794 |
| 64 | 0.936 |
| 65 | 0.915 |
| 66 | 0.892 |
| 67 | 0.905 |
| 68 | 0.893 |
| 69 | 0.905 |

### Milestone 6: continuation through 1:10

Over **2100 frames (70 seconds)**: **mean 0.9005, median 0.9096**.
The new 56.5–70 s span scores **0.8634 / 0.8751**. The existing prefix stays at
**0.9093 / 0.9159** (the CSV is rounded to four decimals). The weakest new frame is **63.6667 s,
0.1720**, where the tree crosses the lens on the wrong side during the fast move. This is a known
visual limitation, not a missing frame or rendering failure.

The continuation adds Flandre’s incoming blade, Youmu’s turn and sword sweep, her floating ghost,
a petal-filled garden and tree transition, and Yuyuko’s opening fan and profile turn. The film
now ends at 70 seconds. Earlier animation curves remain unchanged.

Validation includes comparison strips and disagreement maps, full-rate sword/tree motion sheets,
reverse-order/BTS rendering, exact grip probes and camera boundary probes. A broader seek check found
one pre-existing 28.5 s mismatch, also present in a clean archived starting checkout; all new frames passed.
The sword wrist peaks at 2.62 m/s during the swing, with 27 m/s² peak acceleration; the elbow peaks at
2.15 m/s and 32 m/s². The fan and sword keep palm contact within numerical precision.

| Second | Mean agreement |
| ---: | ---: |
| 57 | 0.792 |
| 58 | 0.897 |
| 59 | 0.856 |
| 60 | 0.846 |
| 61 | 0.854 |
| 62 | 0.778 |
| 63 | 0.786 |
| 64 | 0.937 |
| 65 | 0.922 |
| 66 | 0.892 |
| 67 | 0.911 |
| 68 | 0.900 |
| 69 | 0.909 |

### Milestone 5: slower Remilia arm and extension to 0:56.5

Over 1695 freshly rendered frames: **mean 0.9093, median 0.9160**. The existing 0–47 s span remains
**0.9194 / 0.9246** to four decimals. The new 47–56.5 s span scores **0.8595 / 0.8601**;
its weakest frame is 50.4667 s (0.6412, the close-up wing reveal).

Remilia's hand still transfers at 36.5167 s, but its descent now settles at 37.05 and joins the cup at 37.12.
Peak wrist speed drops from 2.76 to 0.95 m/s; peak acceleration drops from 51 to 9 m/s².
The continuation covers Sakuya's knife gesture and throw, the knife becoming Flandre's crystal wing,
Flandre's turn and open palms, then her head bow and palette inversion. It ends before the next blade.

| Second | Mean agreement | What |
| ---: | ---: | --- |
| 47 | 0.929 | Sakuya finishes her gesture |
| 48 | 0.859 | Turn and raised knife |
| 49 | 0.929 | Throw and knife flight |
| 50 | 0.797 | Knife-to-wing transition and crystal close-up |
| 51 | 0.851 | Pull-back and head turn |
| 52 | 0.846 | Head leads the body turn |
| 53 | 0.855 | Front view and first palm opens |
| 54 | 0.867 | Second palm opens |
| 55 | 0.828 | Held gesture and beginning of head bow |
| 56–56.5 | 0.813 | Fingers curl and palette inverts |

Validation: 33 reverse-order frame comparisons with BTS interleaved passed pixel-exactly with no browser
errors. Across tiny time steps, the hand swap stays within 0.002 mm, knife release within 0.045 mm,
and knife-to-wing tip/camera within 0.035 mm. Motion segments, comparison strips and disagreement maps
were reviewed; syntax checks and `git diff --check` pass. The whole-video scores above use 160×120;
local motion experiments use 320×240 and should not be compared directly with them.

### Milestone 4: full review and polish through 0:47

Over 1410 freshly rendered frames: **mean 0.9194, median 0.9246**, up from 0.9166 / 0.9230.
The 41–47 s section is now **0.9477 / 0.9646**; its weakest frame remains 45.4667 s (0.8207).

The priority fix is the 0:36 hand transition: the outgoing arm hides exactly at the swap; individual finger
and thumb rotations transfer with the wrist; the thumb bends along the palm instead of protruding out of it.
The hand reaches the cup sooner, with an earlier wing opening and refined pull-back. The rest of the review
improves Reimu's profile framing, Marisa's catch skirt and close-ups, ceramic fracture edges and Sakuya's skirt.

| Edited span | Before | After |
| --- | ---: | ---: |
| 7.3–12 s: profile close-up | 0.8431 | 0.8577 |
| 14.4–18 s: catch, whip and bite | 0.8238 | 0.8292 |
| 25.6–27 s: core close-up and release | 0.9172 | 0.9219 |
| 35.8–37.1 s: hand transition | 0.8993 | 0.9032 |
| 41–44 s: falling cup and fragments | 0.9382 | 0.9426 |
| 44–47 s: Sakuya entrance | 0.9465 | 0.9527 |

These are means from the same 160×120 full-video measurement. Local trade-offs remain: second 11 loses
0.0038 while the profile span gains 0.0146; second 25 loses 0.0013 while the core span gains 0.0047.
The score includes background, so small objects can score well despite imperfect contours.

Validation: 31 reverse-order frame comparisons with BTS interleaved (pixel-identical, no browser errors),
hand-swap wrist/index/thumb contact within 0.001 mm across a 20 μs step, catch continuity within 0.384 mm,
full-rate hand/motion comparisons, whole-video contact sheet, disagreement maps, syntax checks and
`git diff --check`. Both new passes have 1410 frames. The three comparison exports include original audio.
See [the process notes](06-agent-process.md#16-full-review-and-polish-through-047) for retained and rejected experiments.

### Milestone 4 before polishing: 0:00 – 0:47

Over 1410 frames: **mean 0.917, median 0.923**. The new 41–47 s section: **mean 0.942, median 0.960**;
the lowest new frame is 45.4667 s (0.817, the fast upright reveal). The original 0–41 s pass is preserved.
The score includes background pixels, so the small spinning shard's high agreement does not imply an exact shape match.

| Second | Score | What |
| ---: | ---: | --- |
| 41 | 0.972 | Cup fall, rise in frame and clockwise tilt |
| 42 | 0.905 | Palette inversion and cup fracture |
| 43 | 0.938 | Debris drops away; the camera follows one fragment |
| 44 | 0.977 | Fragment becomes the overhead spinning figure |
| 45 | 0.930 | Sakuya grows, turns upright and lowers her arms |
| 46 | 0.932 | Profile/back/profile turn and the beginning of her gesture |

Validation: comparison strips and disagreement maps, full-rate morph sheets, segment motion comparisons,
13-frame out-of-order/BTS pixel determinism check (passed), JavaScript syntax checks and `git diff --check`.
Both final and BTS videos are 960×720, 30 fps, 1410 frames / 47 seconds. The three comparison deliverables
include the original audio. `tmp_out/score.csv` contains the full timeline's per-frame measurements.

### Milestone 3: 0:00 – 0:41

Over the 1230 frames: **mean 0.913, median 0.918**. The new section, 35 – 41 s: **mean 0.888, median 0.897**; the
lowest frame is 40.67 s (0.80, the cup just below her hands). Seconds 0 – 33 are unchanged; 34 s went from 0.919 to
0.921 (the finger now pivots partly at the knuckle).

After the review (see [06-agent-process.md](06-agent-process.md#14-035--041-after-review)) the morph hand becomes
Remilia's own hand and she holds the cup with both hands to the end; the motion was smoothed. First version in
brackets:

| Second | Score | What |
| ---: | ---: | --- |
| 35 | 0.904 (0.904) | The push onto her hand, the wag |
| 36 | 0.892 (0.905) | The finger gun, the hand turning palm to us and becoming Remilia's, the pull-back onto her |
| 37 | 0.899 (0.906) | Remilia's front view, bopping, the cup in both hands at her waist |
| 38 | 0.896 (0.903) | The same |
| 39 | 0.853 (0.834) | Her turn with the cup, then the profile |
| 40 | 0.881 (0.848) | The profile, both hands on the cup (0.90 – 0.91), the release (0.77 – 0.85), the fall (0.88 – 0.99) |

### Milestone 2: 0:00 – 0:35

Over the 1050 frames: **mean 0.917, median 0.928**. The new section, 24 – 35 s: **mean 0.944, median 0.950**;
the lowest frame is 26.47 s (0.84, the release). Two review passes polished 29 – 35 s, and a third applied their
lessons to 0 – 28 s:

- **First pass** (the bop, the head, the arms by IK, the wag drawing by drawing, re-solved cameras): 0.940 →
  0.947 (see [06-agent-process.md](06-agent-process.md#10-polishing-29--35-s-after-review)).
- **Second pass: making the motion flow.** Her movement was robotic: every key eased to a stop and the arm
  switched between IK and FK. It is now on motion curves timed frame by frame on the original, the arm is one
  curve, and the camera path is a motion curve too. 0.947 → 0.951, every second improved or unchanged (see
  [06-agent-process.md](06-agent-process.md#11-making-patchoulis-motion-flow-29--35-s-second-review)).

- **Third pass: motion on 0 – 28 s** (details only; see
  [06-agent-process.md](06-agent-process.md#12-applying-the-motion-lessons-to-0--28-s)). The night-flight camera,
  the opening pull-back, the crane after the throw, Reimu's arm before the throw and Marisa's poses moved onto
  motion curves where that scored at least as well. 0 – 24 s: 0.902 / 0.911 → **0.905 / 0.917**. Seconds that
  moved: 14: 0.944 → 0.948, 15: 0.722 → 0.742, 17: 0.806 → 0.816, 22: 0.902 → 0.909, 23: 0.908 → 0.918,
  24: 0.899 → 0.909. The rest changed by at most 0.003 (19 and 20 s: −0.002).

| Second | Score | | Second | Score | | Second | Score |
| ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| 24 | 0.909 | | 28 | 0.954 | | 32 | 0.956 (0.947, 0.930) |
| 25 | 0.915 | | 29 | 0.968 (0.968, 0.963) | | 33 | 0.934 (0.931, 0.921) |
| 26 | 0.920 | | 30 | 0.971 (0.971, 0.969) | | 34 | 0.919 (0.916, 0.914) |
| 27 | 0.981 | | 31 | 0.958 (0.952, 0.944) | | | |

(In brackets: after the first polishing pass, and before it.)

### Milestone 1: 0:00 – 0:24

Over the 720 frames:

**Mean 0.902, median 0.911.** For comparison: 0.841 / 0.868 at milestone 1 (placeholder characters), 0.863 /
0.898 with Reimu and Marisa before the staging corrections, and 0.885 / 0.903 after them, before the polishing
sweep (see [06-agent-process.md](06-agent-process.md#7-polishing-sweep)).

| Second | Score (milestone 1) | | Second | Score (milestone 1) | | Second | Score (milestone 1) |
| ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| 0 | 1.000 (1.000) | | 8 | 0.845 (0.822) | | 16 | 0.850 (0.701) |
| 1 | 0.958 (0.860) | | 9 | 0.840 (0.781) | | 17 | 0.805 (0.719) |
| 2 | 0.885 (0.738) | | 10 | 0.823 (0.776) | | 18 | 0.929 (0.878) |
| 3 | 0.918 (0.804) | | 11 | 0.845 (0.830) | | 19 | 0.970 (0.909) |
| 4 | 0.937 (0.878) | | 12 | 0.971 (0.943) | | 20 | 0.973 (0.920) |
| 5 | 0.945 (0.876) | | 13 | 0.986 (0.941) | | 21 | 0.919 (0.896) |
| 6 | 0.920 (0.871) | | 14 | 0.944 (0.817) | | 22 | 0.902 (0.854) |
| 7 | 0.859 (0.856) | | 15 | 0.724 (0.637) | | 23 | 0.908 (0.873) |

## Staging corrections after review

Three passages had been staged from a misreading of the original (details in
[06-agent-process.md](06-agent-process.md#6-correcting-three-misreadings-of-the-original)):

- **Opening (0–4.9 s):** a straight zoom-out from her chest while Reimu bops on the measured beat, instead of
  a 180° orbit. Seconds 1–5 went from 0.79–0.92 to 0.81–0.96.
- **Throw and catch (12–15.3 s):** the apple keeps rising; Marisa flies in over it and snatches it (IK), and
  the palette inverts on the catch with the framing unchanged, instead of a falling apple and a lens-covering
  dive. Second 14 went from 0.81 to 0.89, second 15 from 0.63 to 0.73.
- **Bites (16–21 s):** Marisa brings the apple to her mouth and bites it (16.95 s, then 19.7 s and 21.0 s);
  the apple keeps a bite mark. The close-up was re-framed around it: second 16 went from 0.67 to 0.80.
- **No lift after the catch:** she carries the apple straight from where she caught it to her mouth (IK on
  an arc clear of the broom), instead of raising it overhead first.

The polishing sweep then matched the apple's measured screen path (seconds 12–13: 0.94 → 0.97–0.99), the
wide shots' framing and slow bob (seconds 19–20: 0.92–0.94 → 0.97), and the bite close-up (second 16: 0.80 →
0.85).

## Known issues (candidates for the next pass)

| Where | What |
| --- | --- |
| 36.4 – 36.7 s | The hand now transfers continuously, including individual finger/thumb rotations, and the old arm hides at the swap. The head/wing framing and curled-hand outline still differ from the drawings. |
| 40.6 – 40.75 s (0.80 – 0.84) | The release: the original's arm stays in the top of the frame a little longer; ours leaves slightly sooner (the cup's forward drift, which keeps her legs out of the drop). |
| 39.0 – 39.6 s (0.81 – 0.85) | Remilia's turn: the original's body lags further behind her head (three-quarters at 39.45 s while the head is in profile) and its screen-left wing folds up almost vertically; the camera keys there are closer than the original's framing looks, covering that pose difference (pushing in later scored up to 0.12 lower). |
| 37 – 38.9 s (0.90 – 0.91) | Remilia's front view: the original's hair flares wider at the jaw, its bow is a bigger fan and its wing scallops are sharper; the tries at each (see 06, section 13) scored lower. |
| 42.3 – 43.2 s | Unequal fracture edges improve the crescent rims; the pieces remain broader and less concave than the reference shards, with approximate separation and tumbling. |
| 43.4 – 44.26 s | The selected fragment is now pointed, but still rotates through a more triangular (and larger) outline than the curved drawing; it now melts into Sakuya's growing body over four frames instead of cutting. |
| 45.3 – 45.7 s | Sakuya's upright reveal: the skirt narrows and lengthens into the standing pose, but camera tilt and arm outlines still differ. |
| 46 – 47 s | The bob, headband and folded-arm silhouette are approximate. The gesture is continuous, but its elbows/hands do not match every drawing. |
| 48–49.2 s | Sakuya’s knife pose and throwing arm remain approximate, especially during the fast turn. |
| 50.3–50.9 s | The wing reveal is the weakest new passage: crystal size/spacing and camera framing differ from the drawings. A larger-crystal trial scored lower and was rejected. |
| 51–56.5 s | Flandre’s head, ponytail and wing fan outlines remain approximate; the final curled hands and bowed head need further shape refinement. |
| 57.4–57.9 s | Flandre’s shoulders and sleeve puffs are narrower than the drawing as the torso fills the frame (the old widening hid this and distorted her). |
| 58.1–62.65 s | Youmu's scabbards now hang crossed from her hips; the second one crosses a little differently from the drawing during the sheathing (61.7 – 62.4 s). Her ghost's path and tail differ. The blade on the left reaches further than the drawn one at 58.8 – 59.2 s. |
| 7.3–11.7 s | Reimu's profile close-up is framed looser than the original (her head smaller and further right); the mouth is now a static closed profile, as drawn. |
| 31.4–32.1 s | Patchouli's hat crescent flips with her head turn; the drawn one keeps pointing right until after 32 s. |
| 62.65–63.45 s | The tree crown is rounder and a little wider than the drawn one (≈ −0.02 on the wide shot). |
| 63.65–63.78 s | The whip lands about one frame early (63.75 vs 63.78 s). |
| 63.85–70 s | Yuyuko's frontal hair shows gaps between locks at the collar; the fan is larger than drawn at 66 – 67.7 s. |
| 28.5 s seeking | A pre-existing history-dependent morph frame was reproduced in both the clean starting checkout and this extension. |
| After 70 s | Not staged. |
| 26.4 – 26.6 s (0.84 – 0.90) | The release: in the original her arm stays in frame about 0.1 s longer while the core falls out of the bottom. Ours leaves earlier (her swoop up and the camera's drop), and the frame-to-frame change at 26.47 – 26.5 is larger than the original's. |
| 25.6 – 26.4 s (0.87 – 0.92) | The close-up of her arm: our elbow bends into a sharper V, and wisps of hair show at the top right where the original has a sliver of brim. |
| 28.4 – 28.6 s | The morph: our figure lying in the core reads a little shorter and blurrier than the original's long blob (0.95). |
| 25.4 s on | The castle is hidden once it has left the push-in's frame; physically the level close-up camera would still catch its spire. |
| 33.9 – 34.1 s (0.90) | The push-in onto her face: our camera starts it from rest and accelerates a little harder than the original (0.08 of the frame changes per frame at 33.95 s, the original 0.05); the hand is a little closer to her face at 33.75 – 33.85 s. |
| 34.7 – 34.9 s (0.91 – 0.92) | The wag's fast flick (left, up, right within 0.1 s): the smooth swing through the drawings is a frame off the original's held drawings there. |
| 31.7 s (0.94) | Facing us with the arm out: the original's book edge shows at her side; ours is hidden. Timing is not the cause (a yaw offset gains under 0.003). |
| 34 – 35 s (0.91 – 0.93) | The fist is a rounded mass, not modeled fingers, and a little tall; the sleeve on the pointing forearm reads thinner than the original's. |
| 15 s (0.76) | The catch close-up (14.8 – 15.26 s now holds its framing, 0.88 – 0.89; the rest of the second is the whip pan) keeps more of her arm and body in frame than the original, which shows a thin arm from the broom line at the top edge. Lowering the broom to match brings even more of her body in, so it scores lower. The whip pan (15.26–15.9 s) is still busier than the original's. |
| 17 s (0.81) | The pull-back from the bite close-up: the brim reads as a smooth edge where the original shows a jagged hair edge. |
| 9 – 11 s | The profile camera now sits farther back. The head/hand framing improves, but the bow projects vertically and the head/fruit contours remain approximate. |
| 18 – 21 s (0.92 – 0.97) | The later bites are small at this scale; the bite mark reads best in medium shots (17.4–18 s). |
| General | The flat hair strands can show slightly faceted tips in extreme close-ups. |

## Production numbers

- Current delivery: **2100 frames / 70 seconds**, final and BTS at 960×720 / 30 fps. The 56.5 – 70 s polish was
  rendered as a suffix (`tmp_out/polish70/suffix-*.mp4`) and joined without re-encoding to the unchanged prefix
  (`tmp_out/extend70/prefix-*.mp4`); both passes decode to 2100 frames. The previous passes, score and deliverable are
  kept in `tmp_out/polish70/before-*`.
- Previous delivery (milestone 6): **2100 frames / 70 seconds**, final and BTS at 960×720 / 30 fps.
  `tmp_out/final.mp4`, `tmp_out/bts.mp4`, and the 1920×1080 comparison with original audio at
  `deliverable/bad_apple_3d.mp4` were regenerated. `tmp_out/score.csv` covers all 2100 frames.
  Prefix and corrected suffix renders are in `tmp_out/extend70/`, joined at 56.5 seconds without re-encoding.

- Previous delivery: 1695 frames (0–56.5 s), freshly rendered for both final and BTS at 960×720 / 30 fps.
  Current passes are `tmp_out/final.mp4` and `tmp_out/bts.mp4`; the deliverable video (`tools/compose.sh`) is
  `deliverable/bad_apple_3d.mp4`. Intermediate media and the hand-speed baseline are in `tmp_out/extend56/`.
  Passes were split at 44 s and joined without re-encoding. BTS also needed shorter sessions after two
  browser interruptions; completed frames were retained and export resumed at the next frame.
  `tmp_out/score.csv` contains all 1695 per-frame measurements. Older generated media was absent this session.

- Previous milestone: 1230 frames (0 – 41 s) at 960×720, 10–32 sub-frames each, in about 7.5 minutes. The
  behind-the-scenes pass takes about 6.5 minutes too. Both run on CPU (llvmpipe) because headless Chromium on this machine has no GPU
  access.
- All character and prop geometry is procedural; no reference-video textures are used in the scene.

## Next steps

(Handoff notes, setup and lessons learned: [08-handoff.md](08-handoff.md).)

1. Fix the known issues above, especially 15 – 17 s and the release at 26.4 s.
2. Continue from 1:10 in the same format as [02-storyboard.md](02-storyboard.md), in chunks of about 6 – 20 s:
   inspect the petal transition after Yuyuko’s profile before extending the camera path.
3. Use `tools/tune.mjs` for camera keys from the start (after the pose roughly matches), and `tools/py/blob.py`
   to turn tracked shapes into tables.
4. Grow the cast as later sections require, modeling each character from the original's silhouettes.
