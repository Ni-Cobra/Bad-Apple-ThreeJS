#!/usr/bin/env node
// Pose the film at given times and evaluate a JS expression in the page (film is in scope as `f`, THREE as `T`).
//   node tools/probe.mjs --times 14.7,14.8 --expr "f.camera.position.toArray()"
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const server = await startServer(0);
const browser = await chromium.launch({ args: ['--use-angle=vulkan', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?w=320&h=240`);
await page.waitForFunction(() => window.BA && window.BA.ready, null, { timeout: 60000 });
for (const t of opt('times', '0').split(',').map(Number)) {
  const r = await page.evaluate(async ({ t, expr }) => {
    const T = await import('three');
    const f = window.BA.film;
    f.pose(t, 'final');
    return JSON.stringify(new Function('f', 'T', `return (${expr});`)(f, T), (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v));
  }, { t, expr: opt('expr', 'null') });
  console.log(t.toFixed(3), r);
}
await browser.close();
server.close();
