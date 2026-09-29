import * as THREE from 'three';
import { AccumPipeline } from './core/pipeline.js';
import { Film } from './film.js';

/*
 * Entry point. Exposes window.BA for the headless renderer (tools/render.mjs) and drives an interactive
 * preview when opened in a browser (index.html?play).
 *
 * Views:
 *   final — the film camera, flat two-tone silhouettes, accumulated motion blur (what is compared to the original)
 *   bts   — "behind the scenes": an orbiting witness camera, shaded normals + wireframe, film-camera frustum,
 *           ground grid; shows the actual 3D geometry and staging.
 */
const params = new URLSearchParams(location.search);
const W = Number(params.get('w') || 960), H = Number(params.get('h') || 720);

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
THREE.ColorManagement.enabled = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
canvas.style.width = '100%';
canvas.style.maxWidth = `${W}px`;

const film = new Film(W / H, W, H);
const pipe = new AccumPipeline(renderer, W, H);

function renderFrame(t, { view = 'final', samples, shutter } = {}) {
  samples = samples ?? film.director.samplesAt(t);
  if (view === 'final') {
    const sh = shutter ?? film.shutterAt(t);
    pipe.render(t, (tt, tc) => film.pose(tt, 'final', tc), { samples, shutter: sh });
  } else {
    pipe.render(t, (tt, tc) => film.pose(tt, 'bts', tc), { samples: 4, shutter: 0 });
  }
}

async function readPixels() {
  // Returns the canvas as a base64 PNG-less raw RGBA buffer (bottom-up rows).
  const gl = renderer.getContext();
  const buf = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
  return btoa(s);
}

window.BA = { renderFrame, readPixels, film, W, H, ready: true };

// ---- interactive preview ----
if (params.has('play') || params.has('t')) {
  const view = params.get('view') || 'final';
  let t0 = Number(params.get('t') || 0);
  const audio = new Audio('bad_apple_original.mp4');
  const start = performance.now();
  if (params.has('play')) {
    audio.currentTime = t0;
    document.addEventListener('click', () => audio.play(), { once: true });
  }
  const loop = () => {
    const t = params.has('play') ? (audio.paused ? t0 + (performance.now() - start) / 1000 : audio.currentTime) : t0;
    renderFrame(t, { view, samples: 2 });
    if (params.has('play')) requestAnimationFrame(loop);
  };
  loop();
}
