#!/usr/bin/env node
// Headless deterministic renderer.
//   node tools/render.mjs stills --times 1,2.5,7 [--view final|bts] [--out tmp_out/stills] [--query lab=reimu]
//   node tools/render.mjs video --from 0 --to 24 [--fps 30] [--view final|bts] [--out tmp_out/final.mp4] [--samples 10]
//   --tweak "(f, t, T) => { f.patchouli.cap.visible = false; }": run after each shot has posed the film (debugging)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './server.mjs';

const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const W = Number(opt('w', 960)), H = Number(opt('h', 720));
const view = opt('view', 'final');
const samples = opt('samples') ? Number(opt('samples')) : undefined;   // default: director decides per shot

const server = await startServer(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-angle=vulkan', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?w=${W}&h=${H}&${opt('query', '')}`);
await page.waitForFunction(() => window.BA && window.BA.ready, null, { timeout: 60000 });

const tweak = opt('tweak');
async function grab(t) {
  const b64 = await page.evaluate(async ({ t, view, samples, tweak }) => {
    if (tweak) {
      const T = await import('three');
      const fn = new Function('return (' + tweak + ')')();
      window.BA.film.director.tweak = (f, tt) => fn(f, tt, T);
    }
    window.BA.renderFrame(t, { view, samples });
    return window.BA.readPixels();
  }, { t, view, samples, tweak });
  const raw = Buffer.from(b64, 'base64');
  // flip rows (GL is bottom-up)
  const out = Buffer.alloc(raw.length);
  const row = W * 4;
  for (let y = 0; y < H; y++) raw.copy(out, (H - 1 - y) * row, y * row, (y + 1) * row);
  return out;
}

function ffmpeg(args) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  return p;
}

if (mode === 'stills') {
  const outDir = opt('out', 'tmp_out/stills');
  fs.mkdirSync(outDir, { recursive: true });
  const times = opt('times', '0').split(',').map(Number);
  for (const t of times) {
    const buf = await grab(t);
    const file = path.join(outDir, `${view}_${t.toFixed(2)}.png`);
    await new Promise((res) => {
      const p = ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', '-frames:v', '1', file]);
      p.on('close', res);
      p.stdin.end(buf);
    });
    console.log(file);
  }
} else if (mode === 'video') {
  const fps = Number(opt('fps', 30));
  const from = Number(opt('from', 0)), to = Number(opt('to', 24));
  const out = opt('out', `tmp_out/${view}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const p = ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out]);
  const n = Math.round((to - from) * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    const buf = await grab(t);
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once('drain', r));
    if (i % 30 === 0) process.stderr.write(`\r${view} frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  p.stdin.end();
  await new Promise((r) => p.on('close', r));
  console.error(`\nwrote ${out}`);
}

await browser.close();
server.close();
