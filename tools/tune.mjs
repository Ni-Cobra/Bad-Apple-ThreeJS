#!/usr/bin/env node
// Grid search over a camera tweak: for every combination of the parameters, pose the film at the given times,
// apply the tweak to the film camera, render at 320x240 and score the silhouette agreement with the original.
//   node tools/tune.mjs --times 25.8,26,26.2 --grid "dx=-0.1,0,0.1;dy=0,0.03" \
//     --tweak "(f, t, p, T) => { f.camera.translateX(p.dx); f.camera.translateY(p.dy); }"
// The tweak runs after the shot has placed the camera (film `f`, time `t`, parameters `p`, THREE as `T`).
// Prints the best combinations; the shot code is not changed, copy the winner into it by hand.
// With --search "x=1.7,y=1.3" --step 0.2 instead of --grid: coordinate descent from those values, halving the
// step when no single-parameter move helps (--rounds halvings), which solves a camera key in a few dozen renders.
// --rider / --stage: shorthand tweak that places the camera from x,y,z (position) and tx,ty,tz (target) in the
// rider's space (Marisa's flight) or the stage's (Patchouli's ground point, +Z = screen right at 29 s).
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { startServer } from './server.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const W = 320, H = 240;
const times = opt('times', '0').split(',').map(Number);
const grid = opt('grid', '').split(';').filter(Boolean).map((s) => {
  const [k, v] = s.split('=');
  return [k.trim(), v.split(',').map(Number)];
});
const samples = Number(opt('samples', 4));
const RIDER = `(f, t, p, T) => { f.camera.position.copy(f.rider.localToWorld(new T.Vector3(p.x, p.y, p.z))); f.camera.up.set(0, 1, 0);
  f.camera.lookAt(f.rider.localToWorld(new T.Vector3(p.tx, p.ty, p.tz))); if (p.fov) f.camera.fov = p.fov; }`;
const STAGE = RIDER.replaceAll('f.rider', 'f.stage');
const tweak = argv.includes('--rider') ? RIDER : argv.includes('--stage') ? STAGE : opt('tweak', '() => {}');

const orig = times.map((t) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', 'bad_apple_original.mp4', '-frames:v', '1',
    '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 24 });
  return r.stdout;
});

const combos = grid.reduce((acc, [k, vs]) => acc.flatMap((c) => vs.map((v) => ({ ...c, [k]: v }))), [{}]);
const server = await startServer(0);
const browser = await chromium.launch({ args: ['--use-angle=vulkan', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?w=${W}&h=${H}`);
await page.waitForFunction(() => window.BA && window.BA.ready, null, { timeout: 60000 });

async function score(p) {
  const per = [];
  for (let i = 0; i < times.length; i++) {
    const b64 = await page.evaluate(async ({ t, p, tweak, samples }) => {
      const T = await import('three');
      const fn = new Function('return (' + tweak + ')')();
      window.BA.film.director.tweak = (f, tt) => fn(f, tt, p, T);
      window.BA.renderFrame(t, { samples });
      window.BA.film.director.tweak = null;
      return window.BA.readPixels();
    }, { t: times[i], p, tweak, samples });
    const raw = Buffer.from(b64, 'base64');
    let ok = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const r = raw[((H - 1 - y) * W + x) * 4] < 128, o = orig[i][y * W + x] < 128;
        if (r === o) ok++;
      }
    }
    per.push(ok / (W * H));
  }
  return { p, mean: per.reduce((a, b) => a + b, 0) / per.length, per };
}
const fmt = (r) => `${r.mean.toFixed(4)} ${JSON.stringify(r.p, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v))} ${r.per.map((v) => v.toFixed(3)).join(' ')}`;

if (opt('search')) {
  let p = Object.fromEntries(opt('search').split(',').map((kv) => kv.split('=')).map(([k, v]) => [k.trim(), Number(v)]));
  const steps = Object.fromEntries(Object.keys(p).map((k) => [k, Number(opt('step', 0.1))]));
  let best = await score(p);
  console.log('start', fmt(best));
  for (let round = 0; round < Number(opt('rounds', 4)); round++) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const k of Object.keys(p)) {
        for (const d of [1, -1]) {
          const r = await score({ ...p, [k]: p[k] + d * steps[k] });
          if (r.mean > best.mean + 1e-5) { best = r; p = r.p; improved = true; break; }
        }
      }
    }
    for (const k of Object.keys(steps)) steps[k] /= 2;
    console.log('round', round, fmt(best));
  }
} else {
  const results = [];
  for (const p of combos) results.push(await score(p));
  results.sort((a, b) => b.mean - a.mean);
  for (const r of results.slice(0, Number(opt('top', 8)))) console.log(fmt(r));
  const base = results.find((r) => Object.values(r.p).every((v) => v === 0));
  if (base) console.log('baseline', base.mean.toFixed(4));
}
await browser.close();
server.close();
