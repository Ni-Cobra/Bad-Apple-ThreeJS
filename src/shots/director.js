import * as THREE from 'three';
import { setPalette } from '../core/materials.js';
import { SHOTS, CUTS } from './shots.js';
import { ridePose } from './poses.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _box = new THREE.Box3();
// the film camera model's scale for a witness camera `dist` away (the body is 1.6 units long)
const gizmoSize = (dist) => THREE.MathUtils.clamp(dist * 0.03, 0.01, 0.3);

/*
 * The Director evaluates the shot list at time t: it hides/shows actors, poses them, places the camera and
 * sets the palette. Each shot is { name, t0, t1, apply(film, t, ctx), bts?(film, t), shutter? }.
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
    for (const o of [f.garden, f.flandre.root, f.knife, f.sakuya.root, f.cupFragments, f.reimu.root, f.patchouli.root, f.remilia.root, f.cup, f.floor, f.rider, f.marisa.root, f.apple, f.core, f.broom, f.castle, f.stars, f.dust, f.cliff]) o.visible = false;
    f.wipe = null;
  }

  apply(t) {
    const f = this.film;
    this.resetVisibility();
    if (this.lab) this.applyLab(t);
    else {
      const shot = this.shotAt(t);
      this.current = shot;
      shot.apply(f, t);
    }
    if (this.tweak) this.tweak(f, t);          // tools/tune.mjs: a camera tweak under test (also on ?lab= turntables)
    f.camera.updateProjectionMatrix();
    f.camera.updateMatrixWorld();
  }

  /*
   * The witness camera. A shot lists what belongs in its scene (`btsFrame`: [{ at, r, w }], spheres; w fades an item
   * in from the first one), or just a point (`btsTarget`). The witness frames those items together with the film
   * camera (unless `btsCamera: false`), no closer than `btsDist`, from a side view of the camera's line of sight
   * (`btsSide` radians off it) or from a fixed world direction (`btsAngle`, used by the close transitions).
   */
  applyBts(t) {
    const f = this.film;
    const shot = this.current || this.shotAt(t);
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
    // Ground grid only where there is no scenery floor (the cliff top is the floor in the day shots).
    f.grid.visible = typeof shot.groundY === 'function';
    if (f.grid.visible) f.grid.place(target.x, shot.groundY(f, t), target.z, Math.max(8, dist * 2.5));
  }

  applyLab(t) {
    const f = this.film;
    setPalette(0);
    const which = this.lab;
    const a = t * 0.8;
    if (which === 'youmu' || which === 'yuyuko') {
      f.garden.visible = true; f.garden.position.set(0, 0, 0); f.garden.quaternion.identity();
      for (const child of f.garden.children) child.visible = false;
      const v = f[which]; v.root.visible = true;
      v.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] }, shoulderL: [0, 0, 12], shoulderR: [0, 0, 12] });
      v.update(t);
      f.camera.fov = 30; f.camera.position.set(Math.sin(a) * 3.8, 1.1, Math.cos(a) * 3.8); f.camera.lookAt(0, 0.95, 0);
    } else if (which === 'flandre') {
      const v = f.flandre;
      v.root.visible = true;
      v.pose({ shoulderL: [0, 0, 15], shoulderR: [0, 0, 15] });
      v.poseWings([0, 0, 0], [0, 0, 0]); v.update(t);
      f.camera.fov = 30;
      f.camera.position.set(Math.sin(a) * 3.6, 1, Math.cos(a) * 3.6); f.camera.lookAt(0, 0.9, 0);
    } else if (which === 'sakuya') {
      f.sakuya.root.visible = true;
      f.sakuya.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] }, shoulderL: [0, 0, 20], shoulderR: [0, 0, 20] });
      f.sakuya.update(t);
      f.camera.fov = 30;
      f.camera.position.set(Math.sin(a) * 3.8, 1, Math.cos(a) * 3.8);
      f.camera.lookAt(0, 0.85, 0);
    } else if (which === 'reimu') {
      f.reimu.root.visible = true;
      f.reimu.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] }, shoulderL: [0, 0, 12], shoulderR: [0, 0, 12], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0] });
      f.reimu.update(t, {});
      f.camera.fov = 30;
      f.camera.position.set(Math.sin(a) * 4.2, 1.0, Math.cos(a) * 4.2);
      f.camera.lookAt(0, 0.85, 0);
    } else if (which === 'marisa') {
      f.rider.visible = true; f.marisa.root.visible = true; f.broom.visible = true;
      const ride = ridePose();
      f.marisa.pose(ride);
      f.broom.position.set(0, 0.62, 0);
      f.marisa.update(t, { wind: new THREE.Vector3(0, 0, -1.2) });
      f.camera.fov = 30;
      f.camera.position.set(Math.sin(a) * 5, 1.1, Math.cos(a) * 5);
      f.camera.lookAt(0, 0.8, 0);
    } else if (which === 'reimuhead') {
      // side close-up of the head (turntable), to check the face profile against the hair
      f.reimu.root.visible = true;
      f.reimu.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] } });
      f.reimu.update(t, {});
      f.camera.fov = 30;
      const b = Math.PI / 2 + t * 0.6;
      f.camera.position.set(Math.sin(b) * 1.0, 1.28, Math.cos(b) * 1.0);
      f.camera.lookAt(0, 1.28, 0);
    } else if (which === 'patchouli' || which === 'patchead' || which === 'hand') {
      // ?lab=patchouli: turntable, right arm raised forward (sleeve), book in the left hand; ?lab=patchead: head;
      // ?lab=hand: her right hand pointing (the 0:34 close-up)
      const p = f.patchouli;
      p.root.visible = true;
      p.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] }, shoulderR: which === 'hand' ? [-55, 0, 18] : [-80, 0, 8], elbowR: which === 'hand' ? [-105, 0, 0] : [-10, 0, 0],
        gripR: which === 'hand' ? 1 : 0.25, pointR: which === 'hand' ? 1 : 0, thumbR: which === 'hand' ? Number(new URLSearchParams(location.search).get('thumb') || 0) : 0, shoulderL: [-20, 0, 10], elbowL: [-100, 0, 0], wristL: [0, 0, 0], gripL: 0.6 });
      p.holdBook([0, -0.06, 0.05], [0, 0, 0]);
      p.update(t, {});
      f.camera.fov = 30;
      if (which === 'patchouli') {
        f.camera.position.set(Math.sin(a) * 4.4, 0.9, Math.cos(a) * 4.4);
        f.camera.lookAt(0, 0.75, 0);
      } else if (which === 'hand') {
        const c = p.j.handR.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.04, 0));
        f.camera.position.set(c.x + Math.sin(a) * 0.5, c.y, c.z + Math.cos(a) * 0.5);
        f.camera.lookAt(c);
      } else {
        // head turntable; t = 0 is her left profile (the close-up's view), then every 90° per second
        const b = Math.PI / 2 + t * Math.PI / 2;
        f.camera.position.set(Math.sin(b) * 0.9, 1.2, Math.cos(b) * 0.9);
        f.camera.lookAt(0, 1.2, 0);
      }
    } else if (which === 'remilia' || which === 'remhead') {
      // ?lab=remilia: turntable, wings spread as in the front view at 37.5 s; ?lab=remhead: her head
      const r = f.remilia;
      r.root.visible = true;
      r.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] }, shoulderL: [0, 0, 8], shoulderR: [-20, 0, 10], elbowL: [-8, 0, 0], elbowR: [-100, 0, 0] });
      r.poseWings([15, 12, 0], [15, 12, 0]);
      r.update(t, {});
      f.camera.fov = 30;
      if (which === 'remilia') {
        f.camera.position.set(Math.sin(a) * 3.2, 0.95, Math.cos(a) * 3.2);
        f.camera.lookAt(0, 0.8, 0);
      } else {
        f.camera.position.set(Math.sin(a) * 1.0, 1.15, Math.cos(a) * 1.0);
        f.camera.lookAt(0, 1.12, 0);
      }
    } else if (which === 'cup') {
      f.cup.visible = true; f.cup.position.set(0, 0.2, 0); f.cup.rotation.set(0, a, 0);
      f.camera.fov = 30;
      f.camera.position.set(0, 0.23, 0.4); f.camera.lookAt(0, 0.23, 0);
    } else if (which === 'core') {
      f.core.visible = true; f.core.position.set(0, 0.25, 0); f.core.rotation.set(0.15, a, 0);
      f.camera.fov = 30;
      f.camera.position.set(0, 0.2, 0.55); f.camera.lookAt(0, 0.2, 0);
    } else if (which === 'props' || which === 'apple') {
      // ?lab=apple: the same turntable with two bites taken out of it
      f.apple.userData.setBites(which === 'apple' ? [{ c: new THREE.Vector3(1.55, 0.15, 0), r: 0.95 }, { c: new THREE.Vector3(0.4, 0.1, 1.5), r: 0.95 }] : []);
      f.apple.visible = true; f.apple.position.set(0, 0.2, 0); f.apple.rotation.set(0, a, 0);
      f.camera.fov = 30;
      f.camera.position.set(0, 0.25, 0.8); f.camera.lookAt(0, 0.2, 0);
    }
    f.camera.updateProjectionMatrix();
    f.camera.updateMatrixWorld();
  }
}
