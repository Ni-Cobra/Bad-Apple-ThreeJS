# Repository Guidelines

## Project Structure & Module Organization

`index.html` loads the Three.js film through `src/main.js`. `src/film.js` owns the scene; `src/shots/` defines and evaluates timed shots; `src/characters/`, `src/props/`, and `src/core/` hold models, animation helpers, materials, and rendering code. `tools/` contains the local server, headless renderer, comparison scripts, and Python image analysis tools. `docs/` records the storyboard, architecture, progress, and handoff notes. Generated media belongs in gitignored `tmp_out/`; the deliverable video (`./make_video.sh "TITLE"`) goes in gitignored `deliverable/`. The reference video, `bad_apple_original.mp4`, is a local asset and is not committed.

## Build, Test, and Development Commands

Install dependencies with `npm install && npx playwright install chromium`; rendering also needs `ffmpeg` on `PATH`. Run `node tools/server.mjs 8080` and open `http://127.0.0.1:8080/?play` for a live preview (`?t=9.5&view=bts` for one instant behind the scenes, `?lab=reimu` for a turntable). Render selected frames with `node tools/render.mjs stills --times 15,15.2 --out tmp_out/stills`; render a segment with `node tools/render.mjs video --from 0 --to 41 --out tmp_out/final.mp4`. There is no build step. Python comparison tools need a local `.venv` with `numpy` and `pillow`; see `docs/08-handoff.md` for setup.

## Coding Style & Naming Conventions

Follow the existing ES module style: two-space indentation, semicolons, single-quoted strings, and descriptive camelCase variables and functions. Keep animation deterministic: scene state at time `t` must render independently of previous frames. Put shot timing and camera keys in `src/shots/shots.js`; use `flow()` for continuous character motion. Python tools use four-space indentation and snake_case names. No formatter or linter is configured.

## Testing Guidelines

There is no automated test suite or coverage target; `npm test` is a placeholder that exits with an error. For visual changes, run `tools/cmp.sh NAME t1 t2 ...` at affected times, inspect its comparison strip and disagreement map, and check the agreement scores. Use `node tools/probe.mjs --times 14.79 --expr "f.apple.position.toArray()"` for exact scene positions. Compare motion over a segment, not only isolated frames.

## Commit & Pull Request Guidelines

Recent commits use short, descriptive subjects such as `Extend to 0:35: ...` and `Rework 0:36 - 0:41 after review: ...`; describe the affected shot or behavior. In pull requests, summarize the timing range and visual change, link any relevant issue, and include comparison frames or scores when appearance changes. Update the relevant storyboard, transition, status, or handoff docs alongside staging changes.
