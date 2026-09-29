# Kickoff prompt

<!--
  For the human: set the target below (any span from 0:00), then start your agent in this repository with
  "Read PROMPT.md and follow it." (or paste this whole file as the first message).
-->

**TARGET: 0:00 – 0:24**

---

You are recreating the *Bad Apple!!* shadow-art music video in **true 3D** with Three.js, in this repository, for
the span given by TARGET above. The engine, tools and delivery pipeline are ready; the scene is empty. Every
character, prop, camera move and transition in that span is yours to model, stage and animate.

The finished film must be a real 3D production: a world of modeled, rigged characters filmed by a moving
camera, whose two-tone render matches the original's silhouettes, motion and timing, and which looks right from
any other angle too.

## Non-negotiable: true 3D, no shortcuts

1. **Every character is a full 3D model**: head, face profile, hair, torso, arms with hands and fingers, legs and
   feet, clothes and accessories, built as volumes (lathes, lofts, capsules, strands, cloth) on a jointed skeleton
   and animated through that skeleton. It must read as that character from every side, including sides the film
   never shows. The behind-the-scenes view and a `?lab=` turntable of each character are how this gets checked.
2. **Props, scenery and effects are 3D objects too**, placed in one persistent world. Framing comes from where
   the camera and the actors actually are.
3. **Nothing from the original goes into the scene.** No frames, pixels, masks, traced outlines or textures from
   the video; no 2D planes, sprites or billboards cut to a silhouette's shape; no extruded outlines; no
   screen-space overlays that draw shapes; no per-frame deformation of geometry to fit the original's mask. A
   genuinely thin object (a blade, a petal, a sheet of paper) may be a thin mesh, modeled, not traced.
4. **The original is a reference only.** Watch it, measure it (positions, sizes, angles, timings) and score
   against it. Measurements enter the code as numbers (a camera key, a timing, a proportion), never as images.
5. **The score is a guide, not the goal.** Don't game it with absurd cameras, shapes that only work from one
   angle or blobs standing in for characters. The right character at 0.88 beats an unrecognizable one at 0.95.
6. **Build it yourself.** Don't look for other recreations of this video, and don't read other branches of this
   repository.

## What to deliver

- Every beat of the TARGET span, in the original's order and timing: each character and prop, each camera move,
  palette inversion and transition.
- Motion that flows: performances on motion curves, characters bopping on the song's beat, and no snapping from
  pose to pose.
- `./make_video.sh --to <TARGET end, in seconds> "TITLE"` builds `deliverable/bad_apple_3d.mp4`: the original and
  yours side by side, the behind-the-scenes view and the running score. Set `TO` in `make_video.sh` to the target
  end.
- `docs/STORYBOARD.md`: the world layout (where everyone is in one world) and a beat table: time, what the
  original shows, how you stage it in 3D.
- `docs/STATUS.md`: the latest full-pass score (mean, median, the weakest seconds), known issues, and the
  experiments you rejected and why.

## How to work

1. **Set up** (README.md): the npm packages, Chromium, `.venv`, and `bad_apple_original.mp4` at the root. Check
   that `tools/cmp.sh smoke 0 1` runs.
2. **Read** `docs/ENGINE.md` (how the engine works, every tool) and `docs/ADVICE.md` (lessons from an earlier
   attempt: they will save you days).
3. **Study the target span** on contact sheets (`tools/py/sheet.py`, 10 fps, then 30 fps for fast beats) and write
   `docs/STORYBOARD.md`. List every beat that can be read two ways (front or back, falling or a camera rising,
   what an object is) with your reading of it.
4. **Checkpoint:** show the human the storyboard and the ambiguous beats and wait for answers before building
   those. If no human is available, take the most literal reading and write it down.
5. **Model the characters** in `src/characters/` from measured proportions. Give each a turntable in
   `src/shots/labs.js` and check it from all sides in the behind-the-scenes look.
6. **Stage shot by shot** in `src/shots/shots.js`. Loop with `tools/cmp.sh` and `tools/py/pair.py`: framing first,
   then the model. Solve camera keys with `tools/tune.mjs` once the pose roughly matches, constrained to the move
   the original makes.
7. **Animate** with `flow()` curves timed on full-rate sheets (`tools/pairsheet.sh`), and check the peaks with
   `tools/motion.mjs`.
8. **Render and score** the whole span at milestones (every 6 – 12 s of film), update `docs/STATUS.md`, and show
   the human the strips and sheets for review. Commit at each milestone.

You are done when the whole TARGET span is staged, `make_video.sh` builds the deliverable, every character holds
up on its turntable, the motion has been reviewed on full-rate sheets, and `docs/STATUS.md` has the final score.
