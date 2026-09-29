#!/usr/bin/env node
// Motion check: samples joints of a character every 1/60 s and prints each joint's speed and its acceleration peaks.
// Snaps, whips and stops show up as spikes that single frames and the agreement score miss.
//   node tools/motion.mjs --char hero --joints wristR,elbowR,head --from 3 --to 6 [--every 0.1]
// --char NAME is the film's f[NAME]; a joint is looked up as f[NAME].j[joint] (a rig's joint table), else by object
// name under f[NAME] (or f[NAME].root). --every also prints a speed/acceleration row per interval. --char camera samples
// the film camera instead: its position ('pos') and a point 1 m ahead of it ('aim', whose speed shows the camera
// turning). --space NAME measures in the local space of the Object3D f[NAME] (a vehicle or a moving stage, whose own
// motion would swamp the character's); the default is world space.
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const who = opt('char', 'camera');
const space = opt('space', 'world');
const joints = who === 'camera' ? ['pos', 'aim'] : opt('joints', 'wristR,elbowR,head').split(',');
const a = Number(opt('from', 0)), b = Number(opt('to', 2)), dt = 1 / 60, every = Number(opt('every', 0));
const server = await startServer(0);
const browser = await chromium.launch({ args: ['--use-angle=vulkan', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?w=320&h=240`);
await page.waitForFunction(() => window.BA && window.BA.ready, null, { timeout: 60000 });
const P = await page.evaluate(async ({ who, joints, a, b, dt, space }) => {
  const T = await import('three');
  const f = window.BA.film, c = f[who], out = [];
  for (let t = a; t <= b + 1e-9; t += dt) {
    f.pose(t, 'final');
    if (who === 'camera') {
      const ahead = new T.Vector3(0, 0, -1).applyQuaternion(f.camera.quaternion).add(f.camera.position);
      out.push([f.camera.position.toArray(), ahead.toArray()]);
      continue;
    }
    out.push(joints.map((n) => {
      const o = c.j?.[n] ?? (c.isObject3D ? c : c.root).getObjectByName(n);
      if (!o) throw new Error(`no joint "${n}" on f.${who}`);
      const p = o.getWorldPosition(new T.Vector3());
      return (space === 'world' ? p : f[space].worldToLocal(p)).toArray();
    }));
  }
  return out;
}, { who, joints, a, b, dt, space });
await browser.close();
server.close();

const d = (u, v) => u.map((x, i) => x - v[i]), len = (u) => Math.hypot(...u);
joints.forEach((n, j) => {
  const p = P.map((r) => r[j]);
  const v = p.map((_, i) => d(p[Math.min(i + 1, p.length - 1)], p[Math.max(i - 1, 0)]).map((x) => x / (2 * dt)));
  const acc = v.map((_, i) => len(d(v[Math.min(i + 1, v.length - 1)], v[Math.max(i - 1, 0)])) / (2 * dt));
  const sp = v.map(len), t = (i) => (a + i * dt).toFixed(2);
  const peaks = acc.map((x, i) => [x, i]).sort((x, y) => y[0] - x[0]).reduce((s, [x, i]) => {
    if (s.length < 5 && s.every(([, k]) => Math.abs(k - i) * dt > 0.1)) s.push([x, i]);
    return s;
  }, []);
  const im = sp.indexOf(Math.max(...sp));
  console.log(`${n}: max speed ${sp[im].toFixed(2)} m/s at ${t(im)}; acceleration peaks (m/s²) ${peaks.map(([x, i]) => `${t(i)}:${x.toFixed(0)}`).join(', ')}`);
  if (every) for (let i = 0; i < p.length; i += Math.round(every / dt)) console.log(`  ${t(i)}  ${sp[i].toFixed(2)} m/s  ${acc[i].toFixed(1)} m/s²`);
});
