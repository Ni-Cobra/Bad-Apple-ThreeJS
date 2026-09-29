import * as THREE from 'three';
import { setPalette } from '../core/materials.js';
import { SHOTS, CUTS } from './shots.js';
import { LABS } from './labs.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _box = new THREE.Box3();
// the film camera model's scale for a witness camera `dist` away (the body is 1.6 units long)
const gizmoSize = (dist) => THREE.MathUtils.clamp(dist * 0.03, 0.01, 0.3);
// behind the scenes on a turntable (?lab=NAME&view=bts): the model stands at the origin
const LAB_SHOT = { btsTarget: () => new THREE.Vector3(0, 0.9, 0), btsDist: 5, groundY: () => 0 };

/*
 * The Director evaluates the shot list at time t: it hides every registered object, then the shot playing at t
 * shows and poses its actors, places the camera and sets the palette. See src/shots/shots.js for a shot's fields.
 * Transitions live inside shots as continuous camera/actor motion, so there are no hard cuts to fix up.
 */
export class Director {
  constructor(film) {
    this.film = film;
    this.lab = new URLSearchParams(globalThis.location?.search || '').get('lab');
  }

  shotAt(t) {
    if (t < SHOTS[0].t0) return SHOTS[0];      // sub-frames of frame 0 sample slightly negative times
    for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s;
    return SHOTS[SHOTS.length - 1];
  }

  // Keep motion-blur sub-samples on the same side of a hidden cut as the frame they belong to.
  clampToCut(t, tFrame) {
    for (const c of CUTS) {
      if (tFrame < c && t >= c) return c - 1e-4;
      if (tFrame >= c && t < c) return c;
    }
    return t;
  }

  // More sub-frames where the motion is fast, so long blur streaks stay smooth instead of ghosting.
  samplesAt(t) {
    const s = this.shotAt(t);
    if (s.fast && s.fast.some(([a, b]) => t >= a && t <= b)) return 32;
    return 10;
  }

  shutterAt(t) {
    const s = this.shotAt(t).shutter ?? 1 / 45;
    return typeof s === 'function' ? s(t) : s;
  }

  resetVisibility() {
    const f = this.film;
    for (const o of f.cast) o.visible = false;
    f.wipe = null;
  }

  apply(t) {
    const f = this.film;
    this.resetVisibility();
    if (this.lab) {
      const lab = LABS[this.lab];
      if (!lab) throw new Error(`no turntable "${this.lab}" in src/shots/labs.js (have: ${Object.keys(LABS).join(', ')})`);
      setPalette(0);
      lab(f, t);
    } else {
      const shot = this.shotAt(t);
      this.current = shot;
      shot.apply(f, t);
    }
    if (this.tweak) this.tweak(f, t);          // tools/tune.mjs, render.mjs --tweak: a change under test
    f.camera.updateProjectionMatrix();
    f.camera.updateMatrixWorld();
  }

  /*
   * The witness camera. A shot lists what belongs in its scene (`btsFrame`: [{ at, r, w }], spheres; w fades an item
   * in from the first one), or just a point (`btsTarget`). The witness frames those items together with the film
   * camera (unless `btsCamera: false`), no closer than `btsDist`, from a side view of the camera's line of sight
   * (`btsSide` radians off it) or from a fixed world direction (`btsAngle`, for close transitions).
   */
  applyBts(t) {
    const f = this.film;
    const shot = this.lab ? LAB_SHOT : (this.current || this.shotAt(t));
    const val = (v, d) => (typeof v === 'function' ? v(f, t) : (v ?? d));
    if (shot.btsExtras) shot.btsExtras(f, t);
    const items = shot.btsFrame ? shot.btsFrame(f, t) : [{ at: shot.btsTarget ? shot.btsTarget(f, t) : f.camera.position.clone(), r: 0 }];
    const base = items[0].at;
    const spheres = items.map(({ at, r = 0, w = 1 }) => ({ at: base.clone().lerp(at, w), r: r * w }));
    const fit = (list) => {
      _box.makeEmpty();
      for (const { at, r } of list) { _box.expandByPoint(_v.copy(at).subScalar(r)); _box.expandByPoint(_v.copy(at).addScalar(r)); }
      const c = _box.getCenter(new THREE.Vector3());
      return { c, R: Math.max(...list.map(({ at, r }) => at.distanceTo(c) + r)) };
    };
    let { c: target, R } = fit(spheres);
    const subject = target.clone(), camPos = f.camera.position;
    const HALF = THREE.MathUtils.degToRad(22.5);
    // the film camera's body is sized for the witness distance: fit again with it, twice
    const withCam = shot.btsCamera !== false;
    for (let k = 0; withCam && k < 2; k++) {
      const size = gizmoSize(Math.max(val(shot.btsDist, 0), R / Math.sin(HALF)));
      ({ c: target, R } = fit([...spheres, { at: camPos, r: size * 2 }]));
    }
    const dist = Math.max(val(shot.btsDist, 0), (R / Math.sin(HALF)) * 1.05);
    let a;
    if (shot.btsAngle !== undefined) a = val(shot.btsAngle);
    else {
      // beside the film camera's line of sight; straight above or below the subject, a fixed direction instead
      const d = _v.copy(camPos).sub(subject);
      const flat = Math.hypot(d.x, d.z), k = THREE.MathUtils.smoothstep(flat / (d.length() || 1), 0.1, 0.35);
      const side = val(shot.btsSide, 1.0), a1 = Math.atan2(d.x, d.z) + side, a0 = 0.9;
      a = Math.atan2(Math.sin(a1) * k + Math.sin(a0) * (1 - k), Math.cos(a1) * k + Math.cos(a0) * (1 - k));
    }
    a += Math.sin(t * 0.35) * 0.25;
    const cam = f.btsCamera;
    cam.fov = 45;
    cam.near = THREE.MathUtils.clamp(dist * 0.005, 0.002, 0.05);
    cam.far = 3000;
    cam.position.set(target.x + Math.sin(a) * dist, target.y + dist * 0.4, target.z + Math.cos(a) * dist);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    // the film camera: its frustum reaches the subject
    const fwd = f.camera.getWorldDirection(_v);
    const depth = THREE.MathUtils.clamp(Math.max(_w.copy(subject).sub(camPos).dot(fwd), subject.distanceTo(camPos) * 0.5), 0.15, 15);
    f.camRig.visible = withCam;
    f.camRig.update(f.camera, gizmoSize(dist), depth);
    // Ground grid only where the shot gives a ground height (leave it out where scenery is the floor).
    f.grid.visible = typeof shot.groundY === 'function';
    if (f.grid.visible) f.grid.place(target.x, shot.groundY(f, t), target.z, Math.max(8, dist * 2.5));
  }
}
