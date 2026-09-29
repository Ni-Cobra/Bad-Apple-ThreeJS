# 01 — Overview

## Goal

Recreate the silhouette music video in real-time 3D with Three.js. Characters, props, effects, camera moves
and transitions are modeled and animated from scratch. The final camera view is rendered to look like the
two-tone original, and a second "behind the scenes" render shows the real geometry and staging.

The cast is **Reimu** (the apple girl), **Marisa** (the witch on the broom), **Patchouli** (the girl the
apple core turns into) and **Remilia** (the girl with bat wings Patchouli turns into), modeled from the original's
silhouettes, plus **Sakuya** (the maid who emerges from the cup fragment) and **Flandre** (the girl with crystal wings), **Youmu** (the swordswoman) and **Yuyuko** (the woman with the fan; see [04-characters.md](04-characters.md)).

## Milestones: 0:00 – 0:24, 0:24 – 0:35, 0:35 – 0:41, 0:41 – 0:47, 0:47 – 0:56.5, then 0:56.5 – 1:10.5 (this delivery)

The deliverable is one video, `deliverable/bad_apple_3d.mp4` (1920×1080, not committed; regenerate it with the
commands below):

| Where | Contents |
| --- | --- |
| Top left | The original |
| Top right | The recreation (final render) |
| Bottom left | Title, an optional line of credits (`./make_video.sh "..."`), timecode, frame counter |
| Bottom, center left | The behind-the-scenes witness camera, at half size |
| Bottom right | The agreement score: this frame, mean and median so far, and a graph of the per-frame score and its running mean over the last 10 seconds |

The soundtrack is taken at compose time from the local `bad_apple_original.mp4` (not committed, per `.gitignore`).

## Running

Setup (details in [08-handoff.md](08-handoff.md)): Node, ffmpeg on `PATH`, a `.venv` with numpy and pillow, and
the original video at the repo root as `bad_apple_original.mp4` (not committed).

```bash
npm install                       # three, playwright
npx playwright install chromium
node tools/server.mjs 8080        # then open:
#   http://127.0.0.1:8080/?play                 bare preview, click to start audio
#   http://127.0.0.1:8080/?t=9.5                a single instant
#   http://127.0.0.1:8080/?t=9.5&view=bts       behind the scenes
#   http://127.0.0.1:8080/?lab=reimu            turntables (reimu | marisa | reimuhead | patchouli | patchead | hand | remilia | remhead | sakuya | flandre | youmu | yuyuko | cup | props | apple | core)
```

## Rendering

```bash
./make_video.sh "GPT-6 Astra + Opus 5.5 + Human feedback"   # everything below, then deliverable/bad_apple_3d.mp4
./make_video.sh "..." --reuse                                # re-compose from the passes already in tmp_out/

node tools/render.mjs video --from 0 --to 70.5 --out tmp_out/final.mp4
node tools/render.mjs video --from 0 --to 70.5 --view bts --out tmp_out/bts.mp4
tools/compose.sh tmp_out/final.mp4 tmp_out/bts.mp4 70.5 deliverable "TITLE"    # -> bad_apple_3d.mp4 + score.csv
.venv/bin/python tools/py/score.py bad_apple_original.mp4 tmp_out/final.mp4 70.5   # per-second fidelity score
```

`.venv` needs `numpy` and `pillow`. Rendering is deterministic: the same commit always gives the same frames.
