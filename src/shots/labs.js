/*
 * Turntables: one model alone at the origin, the camera circling it. Open http://127.0.0.1:8080/?lab=NAME&t=0.8
 * (add &view=bts for the shaded behind-the-scenes look), or render them:
 *   node tools/render.mjs stills --times 0,1,2,3 --query lab=NAME --out tmp_out/lab
 * Each entry shows and poses what it needs (the director has hidden everything) and places f.camera:
 *   hero: (f, t) => { f.hero.root.visible = true; f.hero.pose({ ... }); turntable(f.camera, t); },
 */
export const LABS = {
  empty: (f, t) => turntable(f.camera, t),
};

// circle the origin at `dist`, `y` high, looking at height `lookY`; `speed` radians per second
export function turntable(cam, t, { dist = 4, y = 1, lookY = 0.85, speed = 0.8, fov = 30 } = {}) {
  const a = t * speed;
  cam.fov = fov;
  cam.up.set(0, 1, 0);
  cam.position.set(Math.sin(a) * dist, y, Math.cos(a) * dist);
  cam.lookAt(0, lookY, 0);
}
