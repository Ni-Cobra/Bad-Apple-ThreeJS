import * as THREE from 'three';
import { lathe, limb, ellipsoid, mesh, ClothStrip } from '../core/geo.js';

const D2R = Math.PI / 180;
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

/*
 * Procedural humanoid rig built from rigid, overlapping, smooth parts (lathes/ellipsoids) parented to a joint
 * hierarchy. For a silhouette film, rigid parts with generous overlap at joints read exactly like a skinned
 * mesh, while staying trivially deterministic.
 *
 * Conventions: character faces +Z, up is +Y, character's LEFT is +X. Limbs hang along -Y from their joint.
 * Poses are Euler angles in degrees (XYZ order). Right-side limbs are mirrored automatically: give both sides
 * the same "anatomical" angles (e.g. shoulder z > 0 lifts either arm sideways, away from the body).
 *   shoulder: x < 0 raises the arm forward, z > 0 raises it sideways, y twists
 *   elbow:    x < 0 bends the forearm forward/up
 *   hip:      x < 0 lifts the thigh forward; knee: x > 0 bends the shin backward
 */
export class Humanoid {
  constructor(opts = {}) {
    const o = (this.o = Object.assign({
      scale: 1,
      legLen: 0.78,      // hip joint height from the sole
      spineLen: 0.09,
      chestLen: 0.21,
      neckLen: 0.14,
      shoulderW: 0.145,
      upperArm: 0.25,
      foreArm: 0.22,
      thigh: 0.39,
      shin: 0.37,
      headR: 0.1,
      armR: [0.038, 0.03, 0.031, 0.022],   // upper arm (shoulder, elbow), forearm (elbow, wrist) radii
      handScale: 1,
      fist: false,     // a rounded mass for the curled fingers that shows as the grip closes (for close-ups)
    }, opts));

    this.root = new THREE.Group();          // placement in the world
    this.j = {};
    const J = (name, parent, x = 0, y = 0, z = 0) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, y, z);
      (parent || this.root).add(g);
      this.j[name] = g;
      return g;
    };

    const hips = J('hips', null, 0, o.legLen, 0);
    const spine = J('spine', hips, 0, o.spineLen, 0);
    const chest = J('chest', spine, 0, o.chestLen * 0.55, 0);
    const neck = J('neck', chest, 0, o.chestLen * 0.62, -0.005);
    const head = J('head', neck, 0, o.neckLen * 0.55, 0.005);

    // ---- body meshes ----
    // Pelvis
    hips.add(mesh(lathe([[0.001, -0.1], [0.07, -0.095], [0.125, -0.06], [0.135, -0.01], [0.12, 0.04], [0.1, 0.08], [0.001, 0.09]], { sz: 0.72 })));
    // Waist + ribcage
    spine.add(mesh(lathe([[0.001, -0.03], [0.1, -0.02], [0.092, 0.05], [0.1, 0.1], [0.001, 0.12]], { sz: 0.7 })));
    chest.add(mesh(lathe([[0.001, -0.06], [0.1, -0.05], [0.118, 0.02], [0.125, 0.08], [0.12, 0.12], [0.07, 0.15], [0.001, 0.16]], { sz: 0.66 })));
    // Bust hint (reads in profile)
    const bust = mesh(ellipsoid(0.1, 0.055, 0.06));
    bust.position.set(0, 0.035, 0.035);
    chest.add(bust);
    // Neck
    const neckMesh = mesh(limb(o.neckLen * 0.9, 0.034, 0.036, { segments: 12 }));
    neckMesh.rotation.x = Math.PI;
    neckMesh.position.y = -0.02;
    neck.add(neckMesh);
    // Head
    this.headMesh = mesh(Humanoid.headGeometry(o.headR));
    this.headMesh.position.set(0, o.headR * 1.05, 0.01);
    head.add(this.headMesh);

    // ---- arms & legs ----
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      const clav = J('clav' + side, chest, 0.02 * s, 0.12, -0.005);
      const sh = J('shoulder' + side, clav, (o.shoulderW - 0.02) * s, 0, 0);
      const el = J('elbow' + side, sh, 0, -o.upperArm, 0);
      const wr = J('wrist' + side, el, 0, -o.foreArm, 0);
      sh.add(mesh(ellipsoid(0.045, 0.045, 0.045)));
      sh.add(mesh(limb(o.upperArm, o.armR[0], o.armR[1])));
      el.add(mesh(limb(o.foreArm, o.armR[2], o.armR[3])));
      this.buildHand(wr, side, s);

      const hip = J('hip' + side, hips, 0.085 * s, -0.035, 0);
      const knee = J('knee' + side, hip, 0, -o.thigh, 0);
      const ankle = J('ankle' + side, knee, 0, -o.shin, 0);
      hip.add(mesh(limb(o.thigh, 0.068, 0.045)));
      knee.add(mesh(limb(o.shin, 0.044, 0.028)));
      const foot = mesh(lathe([[0.001, -0.02], [0.03, 0.0], [0.034, 0.1], [0.03, 0.15], [0.001, 0.17]], { segments: 12, sx: 0.95, sz: 0.55 }));
      foot.rotation.x = Math.PI / 2;
      foot.position.set(0, -0.035, -0.035);
      ankle.add(foot);
    }

    this.root.scale.setScalar(o.scale);
    this.rest = {};
    for (const [k, g] of Object.entries(this.j)) this.rest[k] = { p: g.position.clone(), q: g.quaternion.clone() };
  }

  static headGeometry(R, { jaw = 0.35, chin = 0.05, mouth = 0, nose = 0.13, segments = [48, 32] } = {}) {
    // Anime-proportioned head: round cranium, flat vertical face plane, small nose, pointed chin.
    // jaw: how much the lower face recedes; chin: the chin's point; mouth: depth of an open mouth's notch; nose: its height.
    // segments: the sphere's [width, height] divisions (fine facial profiles need more rings).
    const g = new THREE.SphereGeometry(1, ...segments);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const s = Math.max(0, -y);                      // lower half -> face / jaw
      const front = Math.max(0, z);
      x *= 1 - 0.5 * Math.pow(s, 1.2);                // jaw narrows toward the chin
      y = y * (1 + 0.32 * s);
      z = z * (1 - jaw * s) + 0.3 * s * Math.pow(front, 1.5);   // keep the face plane vertical
      // nose (small, pointed) and chin tip
      const noseK = Math.exp(-((x * x) / 0.006 + ((y + 0.3) ** 2) / 0.012));
      const chinK = Math.exp(-((x * x) / 0.03 + ((y + 1.18) ** 2) / 0.02));
      const mouthK = Math.exp(-((x * x) / 0.02 + ((y + 0.72) ** 2) / 0.006));
      z += (nose * noseK + chin * chinK - mouth * mouthK) * front;
      p.setXYZ(i, x * R * 0.92, y * R, z * R);
    }
    g.computeVertexNormals();
    return g;
  }

  buildHand(wr, side, s) {
    const hand = new THREE.Group();
    hand.name = 'hand' + side;
    hand.scale.setScalar(this.o.handScale);
    wr.add(hand);
    this.j['hand' + side] = hand;
    // palm: thin in X (palm faces -X*s when hanging), wide in Z
    const palm = mesh(lathe([[0.001, 0.005], [0.018, 0.0], [0.024, -0.03], [0.022, -0.07], [0.001, -0.078]], { segments: 12, sx: 0.55, sz: 1.15 }));
    hand.add(palm);
    this.fingers = this.fingers || {};
    const f = [];
    const zs = [0.02, 0.007, -0.007, -0.019];
    const lens = [0.03, 0.034, 0.031, 0.025];
    for (let k = 0; k < 4; k++) {
      const base = new THREE.Group();
      base.position.set(0, -0.07, zs[k]);
      hand.add(base);
      base.add(mesh(limb(lens[k], 0.0075, 0.0068, { segments: 8 })));
      const mid = new THREE.Group();
      mid.position.y = -lens[k];
      base.add(mid);
      mid.add(mesh(limb(lens[k] * 0.8, 0.0068, 0.0055, { segments: 8 })));
      const tip = new THREE.Object3D();
      tip.position.y = -lens[k] * 0.8 - 0.005;
      mid.add(tip);
      f.push({ base, mid, tip });
    }
    const thumb = new THREE.Group();
    thumb.position.set(-0.008 * s, -0.018, 0.024);
    thumb.rotation.set(-0.6, 0, -0.35 * s);
    hand.add(thumb);
    thumb.add(mesh(limb(0.035, 0.009, 0.007, { segments: 8 })));
    const tmid = new THREE.Group();
    tmid.position.y = -0.035;
    thumb.add(tmid);
    tmid.add(mesh(limb(0.025, 0.007, 0.0055, { segments: 8 })));
    const ttip = new THREE.Object3D();
    ttip.position.y = -0.03;
    tmid.add(ttip);
    let fist = null;
    if (this.o.fist) {
      // the curled middle, ring and little fingers read as one rounded mass against the palm
      fist = mesh(ellipsoid(0.024, 0.036, 0.032));
      fist.position.set(-0.01 * s, -0.062, 0.002);
      hand.add(fist);
    }
    this.fingers[side] = { f, thumb, tmid, ttip, s, fist };
  }

  /** grip in [0,1]: 0 = relaxed open hand, 1 = fist. spread: extra finger splay. point: the index finger
   *  straightens (0..1) whatever the grip, as in pointing. thumb: the thumb stands out from a fist (0..1). */
  setGrip(side, grip, spread = 0, point = 0, thumbOut = 0) {
    const { f, thumb, tmid, s, fist } = this.fingers[side];
    if (fist) {
      const k = THREE.MathUtils.smoothstep(grip, 0.55, 0.95);
      fist.visible = k > 0;
      fist.scale.setScalar(Math.max(k, 1e-3));
    }
    f.forEach(({ base, mid }, k) => {
      const straight = k === 0 ? point : 0;
      base.rotation.set((k - 1.5) * spread * 0.12, 0, -s * (0.25 + grip * 1.35) * (1 - straight) + s * 0.1 * straight);
      mid.rotation.set(0, 0, -s * (0.2 + grip * 1.4) * (1 - straight));
    });
    if (fist) {
      // A fist wraps the thumb across the curled fingers; thumbOut spreads it away from the index.
      const k = thumbOut;
      thumb.position.y = -0.018 - 0.022 * k;       // (a raised thumb stands from the top of the fist)
      // An extended thumb spreads in the palm's YZ plane, not along its normal (X).
      thumb.rotation.set((-0.6 + grip * 0.7) * (1 - k) - 0.65 * k, 0, (-0.35 * s - s * grip * 0.25) * (1 - k));
      tmid.rotation.set(0.6 * k, 0, s * grip * 0.6 * (1 - k));
    } else {
      thumb.rotation.set(-0.6 + grip * 0.35, 0, -0.35 * s - s * grip * 0.5);
      tmid.rotation.set(0, 0, -s * grip * 0.8);
    }
  }

  /**
   * Apply a pose object. Keys (all optional): root {pos:[x,y,z], rot:[x,y,z]}, hips, spine, chest, neck, head,
   * clavL/R, shoulderL/R, elbowL/R, wristL/R, hipL/R, kneeL/R, ankleL/R (Euler degrees), gripL/R (0..1),
   * hipsPos:[x,y,z] offset.
   */
  pose(p) {
    for (const [k, g] of Object.entries(this.j)) {
      const r = this.rest[k];
      if (r) { g.position.copy(r.p); g.quaternion.copy(r.q); }
    }
    if (p.root) {
      if (p.root.pos) this.root.position.fromArray(p.root.pos);
      if (p.root.rot) this.root.rotation.set(p.root.rot[0] * D2R, p.root.rot[1] * D2R, p.root.rot[2] * D2R, 'YXZ');
    }
    if (p.hipsPos) this.j.hips.position.add(_v.fromArray(p.hipsPos));
    for (const [k, v] of Object.entries(p)) {
      const g = this.j[k];
      if (!g || !Array.isArray(v)) continue;
      const mirror = k.endsWith('R') && k !== 'hipsR' ? -1 : 1;
      _e.set(v[0] * D2R, v[1] * D2R * mirror, v[2] * D2R * mirror, 'XYZ');
      g.quaternion.multiply(_q.setFromEuler(_e));
    }
    this.setGrip('L', p.gripL ?? 0.25, p.spreadL ?? 0, p.pointL ?? 0, p.thumbL ?? 0);
    this.setGrip('R', p.gripR ?? 0.25, p.spreadR ?? 0, p.pointR ?? 0, p.thumbR ?? 0);
    this.root.updateMatrixWorld(true);
  }

  /**
   * Two-bone IK for an arm, applied on top of the current pose: moves the wrist of `side` to the world point
   * `target`, the elbow bending toward the world point `pole`. `weight` (0..1) blends from the posed arm to
   * the solved one. The elbow still only bends about its own X axis, like the FK poses.
   */
  reach(side, target, pole, weight = 1) {
    if (weight <= 0) return;
    const sh = this.j['shoulder' + side], el = this.j['elbow' + side];
    this.root.updateMatrixWorld(true);
    const S = sh.getWorldPosition(new THREE.Vector3());
    const k = this.o.scale;
    const a = this.o.upperArm * k, b = this.o.foreArm * k;
    const toT = new THREE.Vector3().subVectors(target, S);
    const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const dir = toT.normalize();
    const n = new THREE.Vector3().subVectors(pole, S);
    n.addScaledVector(dir, -n.dot(dir));
    if (n.lengthSq() < 1e-8) n.set(0, -1, 0).addScaledVector(dir, -dir.y);
    n.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const E = S.clone().addScaledVector(dir, a * cosA).addScaledVector(n, a * sinA);
    const T = S.clone().addScaledVector(dir, d);
    // shoulder frame: local -Y runs down the upper arm, local +Z is the side the forearm bends toward
    const y = new THREE.Vector3().subVectors(S, E).normalize();
    const f = new THREE.Vector3().subVectors(T, E);
    const z = f.clone().addScaledVector(y, -f.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    const qw = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const qParent = sh.parent.getWorldQuaternion(new THREE.Quaternion());
    const qSh = qParent.invert().multiply(qw);
    const fl = f.normalize().applyQuaternion(qw.clone().invert());
    const qEl = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(-fl.z, -fl.y));
    sh.quaternion.slerp(qSh, weight);
    el.quaternion.slerp(qEl, weight);
    this.root.updateMatrixWorld(true);
  }

  /** Where a pinched object is held, in world space: at the index fingertip, a little toward the thumb's. */
  pinchPoint(side, out = new THREE.Vector3()) {
    const { f, ttip } = this.fingers[side];
    f[0].tip.updateMatrixWorld(true);
    ttip.updateMatrixWorld(true);
    out.setFromMatrixPosition(f[0].tip.matrixWorld);
    return out.lerp(_v.setFromMatrixPosition(ttip.matrixWorld), 0.2);
  }

  /**
   * A cloth sleeve swept along the arm (see updateSleeve), parented to the shoulder: `cols` points round each of
   * `rows` rings.
   */
  addSleeve(side, cols = 25, rows = 30) {
    const chains = Array.from({ length: cols }, () => Array.from({ length: rows }, () => new THREE.Vector3()));
    const cloth = new ClothStrip(cols, rows, (i, jj, u, v, out) => out.copy(chains[i][jj]));
    this.j['shoulder' + side].add(cloth.mesh);
    this.sleeves = this.sleeves || {};
    this.sleeves[side] = { s: side === 'L' ? 1 : -1, chains, cloth, cols, rows };
    return cloth.mesh;
  }

  /**
   * Re-shape a sleeve for the current pose. The sleeve is a sequence of rings swept along the arm itself
   * (shoulder → elbow → wrist, ending `end` short of the wrist), so the arm is always inside it. The loose cloth
   * on the gravity side of each ring sags, more and more toward the cuff: when the forearm is raised, the sleeve
   * hangs under it as a wide bag. o: { radius(u), sag(u), sway (amplitude), seam (lace frill down the outer back
   * seam), teeth (toothed cuff), end, slide (a loose sleeve slides down a raised forearm toward the elbow, 0..1) }.
   * `down` is world gravity plus wind.
   */
  updateSleeve(side, t, down, o) {
    const { s, chains, cloth, cols: C, rows: Rn } = this.sleeves[side];
    const j = this.j;
    const gl = this.worldDirToLocal('shoulder' + side, down, new THREE.Vector3());
    const el = j['elbow' + side];
    const E = el.position.clone();
    const fore = new THREE.Vector3(0, -1, 0).applyQuaternion(el.quaternion);
    const Wr = E.clone().addScaledVector(fore, this.o.foreArm);
    const slide = (o.slide ?? 0) * this.o.foreArm * Math.max(0, -fore.dot(gl));
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0.012 * s, -0.03, 0), E.clone().multiplyScalar(0.5), E, Wr.clone().addScaledVector(fore, -(o.end ?? 0.02) - slide)], false, 'centripetal');
    const ph = side === 'L' ? 0 : 1.7;
    const sw = o.sway ?? 1;
    const seamDir = new THREE.Vector3(s, 0, -0.6).normalize();   // the frilled seam runs down the outer back
    const c = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3();
    for (let k = 0; k < Rn; k++) {
      const u = k / (Rn - 1);
      path.getPointAt(u, c);
      path.getTangentAt(u, T);
      N.set(1, 0, 0).addScaledVector(T, -T.x);
      if (N.lengthSq() < 1e-4) N.set(0, 0, 1).addScaledVector(T, -T.z);
      N.normalize();
      B.crossVectors(T, N);
      const r = o.radius(u);
      const sag = o.sag(u);
      const swayX = (Math.sin(t * 1.9 + ph + u * 2.2) * 0.05 + Math.sin(t * 3.1 + ph * 2 + u * 3.5) * 0.018) * u * sw;
      const swayZ = Math.sin(t * 1.4 + ph + u * 1.5) * 0.045 * u * sw;
      for (let i = 0; i < C; i++) {
        const a = (i / (C - 1)) * Math.PI * 2;
        d.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a));
        const p = chains[i][k].copy(c).addScaledVector(d, r);
        const hang = Math.max(0, (d.dot(gl) + 0.35) / 1.35);
        p.addScaledVector(gl, sag * hang);
        p.x += swayX * hang; p.z += swayZ * hang;
        if (o.seam) {
          // lace: a frill down the seam (teeth alternate ring by ring)
          p.addScaledVector(d, Math.pow(Math.max(0, d.dot(seamDir)), 10) * (k % 2 ? 0.026 : 0.01) * Math.min(1, u * 8));
        }
        if (o.teeth && k === Rn - 1) p.addScaledVector(T, i % 2 ? 0.02 : 0.004).addScaledVector(gl, i % 2 ? 0.012 : 0);
      }
    }
    cloth.update();
  }

  /** World -> local direction helper: express world vector `wv` in joint `name` space. */
  worldDirToLocal(name, wv, out = new THREE.Vector3()) {
    this.j[name].getWorldQuaternion(_q2);
    return out.copy(wv).applyQuaternion(_q2.invert());
  }
}

/**
 * Compute a hanging chain (hair lock / cloth column) in a joint's local space.
 * start, dir0: local root point & initial direction; grav: local unit "down" (already includes wind);
 * n segments of length segLen; stiff: how long the chain keeps its initial direction (0..1);
 * wave(i, u) -> [dx, dz] small angular offsets for animation. colliders: [{c: Vector3, r}] in local space.
 */
export function chain(out, start, dir0, grav, n, segLen, stiff, wave, colliders, curl = null) {
  out[0].copy(start);
  const d = _w;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const k = Math.min(1, Math.pow(u, 0.6) * (1 - stiff) * 2.2);
    d.copy(dir0).lerp(grav, k);
    if (curl) d.add(curl(u));
    if (wave) {
      const [a, b] = wave(i, u);
      d.x += a; d.z += b;
    }
    d.normalize();
    out[i].copy(out[i - 1]).addScaledVector(d, segLen);
    if (colliders) {
      for (const { c, r } of colliders) {
        _v.subVectors(out[i], c);
        const L = _v.length();
        if (L < r) out[i].copy(c).addScaledVector(_v, r / Math.max(L, 1e-5));
      }
    }
  }
  return out;
}

export { D2R };
