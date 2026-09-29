import * as THREE from 'three';
import { Humanoid, chain } from './humanoid.js';
import { lathe, limb, ellipsoid, mesh, hairShell, StrandBatch, ClothStrip } from '../core/geo.js';
import { rng } from '../core/timeline.js';

/*
 * Marisa — the witch on the broom (0:14.8 onward).
 * Silhouette features, as the original shows them: a witch hat whose tall crown rises and then flops
 * backward, with a large bow on the front of the band; long, wavy hair that streams back from under the
 * brim in jagged strands, plus a single braid on her left; puffed sleeves; a full skirt; a large apron
 * bow at the back of the waist whose two ribbon tails stream behind her. She rides side-saddle (both legs
 * on her left, see poses.js).
 */
export class Marisa extends Humanoid {
  constructor() {
    super({ scale: 1, legLen: 0.76, armR: [0.03, 0.024, 0.023, 0.018] });   // slim arms (the 0:25 close-up)
    const j = this.j;
    const R = this.o.headR;
    const rand = rng(33);

    // ---------- hair ----------
    const cap = hairShell(R * 1.13, { brow: 0.42, nape: 0.72 });
    cap.position.set(0, R * 1.1, -R * 0.08);
    j.head.add(cap);
    this.hairSpecs = [];
    const add = (s) => { this.hairSpecs.push(s); return s; };
    // Long wavy locks all round the sides and back, rooted under the brim.
    for (let i = 0; i < 44; i++) {
      const a = THREE.MathUtils.lerp(-2.5, 2.5, i / 43) + (rand() - 0.5) * 0.1;   // 0 = straight back
      const root = new THREE.Vector3(Math.sin(a) * R * 1.02, R * (1.3 + rand() * 0.25), -Math.cos(a) * R * 1.0 - R * 0.1);
      const out = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
      const front = Math.abs(a) > 1.9;       // the locks framing the face are a little shorter
      add({ kind: 'long', root, out, dir: new THREE.Vector3(Math.sin(a) * 0.5, -0.75, -Math.cos(a) * 0.5).normalize(),
        len: (front ? 0.36 : 0.5) + rand() * 0.16, seg: 12, r0: 0.03, r1: 0, flat: 0.45, stiff: front ? 0.55 : 0.32,
        phase: rand() * 6.28, amp: 0.07 + rand() * 0.05, waves: 1.5 + rand() * 1.2 });
    }
    // Bangs
    for (let i = 0; i < 11; i++) {
      const a = THREE.MathUtils.lerp(-1.05, 1.05, i / 10);
      const root = new THREE.Vector3(Math.sin(a) * R * 0.8, R * 1.78, Math.cos(a) * R * 0.55);
      add({ kind: 'bang', root, dir: new THREE.Vector3(Math.sin(a) * 0.5, -0.3, Math.cos(a)).normalize(), len: 0.1 + (i % 2) * 0.03 + rand() * 0.02, seg: 6, r0: 0.02, r1: 0, flat: 0.5, stiff: 0.2, phase: rand() * 6.28, amp: 0.02 });
    }
    // The braid on her left, in front of the shoulder: a strand whose radius pulses like plaited hair.
    add({ kind: 'braid', root: new THREE.Vector3(R * 0.9, R * 1.1, R * 0.15), dir: new THREE.Vector3(0.25, -1, 0.15).normalize(),
      len: 0.3, seg: 18, r0: 0.024, r1: 0.012, flat: 0.85, stiff: 0.6, phase: 1.3, amp: 0.04,
      profile: (u) => (u > 0.92 ? 1.6 : 0.7 + 0.3 * Math.abs(Math.sin(u * Math.PI * 8))) });
    this.hair = new StrandBatch(this.hairSpecs, { radial: 6 });
    j.head.add(this.hair.mesh);

    // ---------- hat ----------
    this.hat = new THREE.Group();
    this.hat.position.set(0, R * 1.72, -R * 0.1);
    this.hat.rotation.x = -0.14;
    j.head.add(this.hat);
    // brim: wide and thin, with a gentle wave
    this.hat.add(mesh(lathe([[0.1, 0.012], [0.18, 0.004], [0.26, -0.01], [0.29, -0.018], [0.285, -0.024], [0.18, -0.01], [0.1, -0.006]], {
      segments: 56, radial: (a) => 1 + 0.035 * Math.sin(a * 3 + 0.5),
    })));
    // crown: rises, then flops backward and down (a tube swept along a crooked spine, tapered to a point)
    const crownCurve = new THREE.CatmullRomCurve3([
      [0, 0, 0], [0, 0.1, -0.01], [0, 0.18, -0.04], [0, 0.24, -0.1], [0, 0.26, -0.18], [0, 0.24, -0.26], [0.01, 0.19, -0.3],
    ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    const RS = 24, TS = 32;
    const crownGeo = new THREE.TubeGeometry(crownCurve, TS, 1, RS, false);
    const cp = crownGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const u = Math.floor(i / (RS + 1)) / TS;
      const c = crownCurve.getPointAt(u);
      const r = 0.115 * Math.pow(1 - u, 1.05) + 0.003;
      const v = new THREE.Vector3(cp.getX(i), cp.getY(i), cp.getZ(i)).sub(c).setLength(r);
      cp.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
    }
    crownGeo.computeVertexNormals();
    this.hat.add(mesh(crownGeo));
    this.hat.add(mesh(lathe([[0.118, 0.0], [0.114, 0.04]], { segments: 32 })));   // band
    // the big bow on the front of the band: two puffed loops standing up, and a knot
    const hatBow = new THREE.Group();
    hatBow.position.set(0.02, 0.035, 0.11);
    hatBow.rotation.set(0.25, 0.3, 0);
    for (const s of [1, -1]) {
      const loop = mesh(ellipsoid(0.075, 0.052, 0.03));
      loop.position.set(s * 0.068, 0.03, 0);
      loop.rotation.z = s * 0.45;
      hatBow.add(loop);
    }
    hatBow.add(mesh(ellipsoid(0.028, 0.03, 0.025)));
    this.hat.add(hatBow);

    // ---------- clothes ----------
    j.chest.add(mesh(lathe([[0.07, -0.08], [0.108, -0.06], [0.124, 0.02], [0.128, 0.09], [0.11, 0.13]], { segments: 28, sz: 0.7 })));
    // full skirt with petticoat volume
    this.skirt = new THREE.Group();
    j.hips.add(this.skirt);
    this.skirt.add(mesh(lathe([[0.115, 0.07], [0.17, -0.01], [0.25, -0.11], [0.3, -0.22], [0.31, -0.28], [0.27, -0.3], [0.18, -0.28]], {
      segments: 56, sz: 0.9, radial: (a, y) => 1 + 0.07 * Math.max(0, -y - 0.12) * Math.cos(a * 9),
    })));
    // puffed short sleeves, sleeves, cuffs, boots
    for (const side of ['L', 'R']) {
      const puff = mesh(ellipsoid(0.075, 0.07, 0.07)); puff.position.y = -0.03;
      j['shoulder' + side].add(puff);
      j['shoulder' + side].add(mesh(limb(this.o.upperArm * 0.92, 0.033, 0.026)));
      j['elbow' + side].add(mesh(limb(this.o.foreArm * 0.9, 0.025, 0.021)));
      const cuff = mesh(lathe([[0.022, 0.0], [0.028, -0.02], [0.029, -0.03]], { segments: 16 }));
      cuff.position.y = -this.o.foreArm * 0.72;
      j['elbow' + side].add(cuff);
      const boot = mesh(lathe([[0.045, 0.0], [0.05, -0.12], [0.046, -0.3], [0.04, -0.37]], { segments: 16 }));
      boot.position.y = -this.o.shin * 0.32;
      j['knee' + side].add(boot);
      const toe = mesh(lathe([[0.001, -0.02], [0.036, 0.0], [0.04, 0.1], [0.034, 0.16], [0.001, 0.19]], { segments: 12, sx: 0.95, sz: 0.6 }));
      toe.rotation.x = Math.PI / 2; toe.position.set(0, -0.04, -0.04);
      j['ankle' + side].add(toe);
    }

    // ---------- apron bow at the back of the waist ----------
    this.apronBow = new THREE.Group();
    this.apronBow.position.set(0, 0.02, -0.1);
    j.spine.add(this.apronBow);
    for (const s of [1, -1]) {
      const loop = mesh(ellipsoid(0.1, 0.055, 0.03));
      loop.position.set(s * 0.085, 0.02, -0.01);
      loop.rotation.z = s * 0.35;
      this.apronBow.add(loop);
    }
    this.apronBow.add(mesh(ellipsoid(0.03, 0.03, 0.025)));
    // two ribbon tails (spine space), streaming with the wind
    this.tails = [1, -1].map((s) => {
      const pts = Array.from({ length: 14 }, () => new THREE.Vector3());
      const strip = new ClothStrip(3, 14, (i, jj, u, v, out, w) => {
        const width = 0.06 * (1 - 0.2 * v) * (v > 0.9 ? (1 - Math.abs(u - 0.5) * 2) * 0.6 + 0.4 : 1);
        out.copy(pts[jj]).addScaledVector(w, (u - 0.5) * width);
      });
      j.spine.add(strip.mesh);
      return { s, pts, strip };
    });
  }

  /** wind: world-space vector (relative air flow, e.g. opposite to flight velocity), flutter: 0..1 */
  update(t, { wind = new THREE.Vector3(), flutter = 1 } = {}) {
    this.root.updateMatrixWorld(true);
    const down = new THREE.Vector3(0, -1, 0).add(wind);
    const windStrength = wind.length();
    down.normalize();

    // --- hair (head space) ---
    const g = this.worldDirToLocal('head', down, new THREE.Vector3());
    const R = this.o.headR;
    const col = [{ c: new THREE.Vector3(0, R * 1.1, -R * 0.1), r: R * 1.15 }, ...this.bodyColliders()];
    const side = new THREE.Vector3();
    for (const s of this.hairSpecs) {
      const segLen = s.len / s.seg;
      const amp = s.amp * (1 + windStrength * 1.2) * flutter;
      const wave = (i, u) => [Math.sin(t * 6 + s.phase + u * 5) * amp * u, Math.sin(t * 4.7 + s.phase * 1.7 + u * 4) * amp * u];
      let curl = null;
      if (s.kind === 'long') {
        // soft waves along the lock; the locks fan out well past the brim, so their tips jag its outline
        side.copy(s.out);
        curl = (u) => side.clone().multiplyScalar(0.3 * Math.sin(u * Math.PI * s.waves + s.phase) * u + 0.5 * u);
      } else if (s.kind === 'bang') {
        curl = (u) => new THREE.Vector3(0, -0.8 * u, -0.3 * u);
      }
      chain(s.points, s.root, s.dir, g, s.seg, segLen, s.stiff, wave, s.kind === 'bang' ? null : col, curl);
    }
    this.hair.commit();

    // --- skirt: blown back by the airflow (hips space) ---
    const gh = this.worldDirToLocal('hips', down, new THREE.Vector3());
    const rest = new THREE.Vector3(0, -1, 0);
    this.skirt.quaternion.setFromUnitVectors(rest, rest.clone().lerp(gh, 0.75).normalize());

    // --- apron-bow tails (spine space) ---
    const gs = this.worldDirToLocal('spine', down, new THREE.Vector3());
    for (const { s, pts, strip } of this.tails) {
      const start = new THREE.Vector3(s * 0.03, 0.0, -0.12);
      const dir0 = new THREE.Vector3(s * 0.35, -1, -0.3).normalize();
      const ph = s > 0 ? 0 : 2.1;
      const w = (0.05 + windStrength * 0.1) * flutter;
      chain(pts, start, dir0, gs, pts.length - 1, 0.42 / (pts.length - 1), 0.25, (k, v) => [
        Math.sin(t * 7 - v * 7 + ph) * w * v, Math.sin(t * 8.5 - v * 8 + ph + 1) * w * v * 1.3,
      ], [{ c: new THREE.Vector3(0, -0.2, 0), r: 0.2 }]);
      strip.update(new THREE.Vector3(s * 0.4, 0, 0.9).normalize());
    }
  }

  /** Neck, shoulders and back, in head space: long hair drapes over them. */
  bodyColliders() {
    const inv = new THREE.Matrix4().copy(this.j.head.matrixWorld).invert();
    const at = (joint, off, r) => ({ c: new THREE.Vector3(...off).applyMatrix4(this.j[joint].matrixWorld).applyMatrix4(inv), r });
    return [at('chest', [0, 0.1, -0.02], 0.13), at('chest', [0, -0.02, -0.03], 0.13), at('shoulderL', [0, 0, 0], 0.075), at('shoulderR', [0, 0, 0], 0.075)];
  }
}
