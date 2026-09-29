import * as THREE from 'three';
import { Humanoid, chain } from './humanoid.js';
import { lathe, ellipsoid, mesh, hairShell, loft, StrandBatch } from '../core/geo.js';
import { rng } from '../core/timeline.js';

/*
 * Reimu — the apple girl (0:00 – 0:14).
 * Silhouette features, as the original shows them: a huge bow on the top-back of the head whose two loops
 * end in lace frills and span about twice the head's width; two sidelocks in front of the ears, each
 * wrapped in a frilled hair tube; spiky bangs; shoulder-blade-length back hair; long, wide detached
 * sleeves that start at the shoulder with a squared top and carry a lace frill down the outer seam and
 * round the cuff; a small standing collar with an ascot; a long flared skirt.
 */
export class Reimu extends Humanoid {
  constructor() {
    super({ scale: 1 });
    const j = this.j;
    const R = this.o.headR;
    const rand = rng(7);
    // Closed lips and a receding chin in the face mesh: in the 7 – 11 s profile her mouth never opens.
    this.headMesh.geometry.dispose();
    this.headMesh.geometry = Reimu.faceGeometry(R);

    // ---------- hair ----------
    const cap = hairShell(R * 1.12, { brow: 0.4, nape: 0.78 });
    cap.scale.set(1.03, 1.04, 1.14);    // full front volume: in profile her bangs stand out past the brow
    cap.position.set(0, R * 1.14, R * 0.0);
    j.head.add(cap);

    this.hairSpecs = [];
    const add = (s) => { this.hairSpecs.push(s); return s; };

    // Back hair: fan of locks rooted on the back of the scalp, down to the shoulder blades.
    for (let i = 0; i < 26; i++) {
      const a = THREE.MathUtils.lerp(-1.75, 1.75, i / 25) + (rand() - 0.5) * 0.08;   // azimuth, 0 = straight back
      const h = 0.25 + rand() * 0.45;
      const root = new THREE.Vector3(Math.sin(a) * R * 1.02, R * (1.1 + h * 0.5), -Math.cos(a) * R * 1.0 - R * 0.12);
      const out = new THREE.Vector3(Math.sin(a) * 0.55, -0.4, -Math.cos(a) * 0.6).normalize();
      const len = (Math.abs(a) > 1.4 ? 0.28 : 0.35) + rand() * 0.045;
      add({ kind: 'back', root, dir: out, len, seg: 12, r0: 0.043, r1: 0.0, flat: 0.65, stiff: 0.42, phase: rand() * 6.28, amp: 0.018 + rand() * 0.018 });
    }
    // Short side locks over the ears (kept behind the cheek line so the face profile stays clear).
    for (const s of [1, -1]) {
      for (let k = 0; k < 2; k++) {
        const root = new THREE.Vector3(s * R * (0.95 + k * 0.05), R * (1.1 - k * 0.06), R * (-0.25 - k * 0.2));
        add({ kind: 'side', root, dir: new THREE.Vector3(s * 0.4, -0.9, -0.1).normalize(), len: 0.2 - k * 0.03, seg: 9, r0: 0.018, r1: 0, flat: 0.4, stiff: 0.55, phase: rand() * 6.28, amp: 0.04 });
      }
    }
    // Sidelocks: long flat locks in front of the ears, down to the chest, each wrapped in a hair tube.
    this.sidelocks = [];
    for (const s of [1, -1]) {
      const root = new THREE.Vector3(s * R * 0.84, R * 1.18, R * 0.3);
      this.sidelocks.push(add({ kind: 'sidelock', s, root, dir: new THREE.Vector3(s * 0.25, -1, 0.12).normalize(), len: 0.3, seg: 12, r0: 0.024, r1: 0.0, flat: 0.45, stiff: 0.7, phase: rand() * 6.28, amp: 0.035,
        profile: (u) => (u < 0.55 ? 1 : u < 0.8 ? 0.8 : 0.8 * (1 - (u - 0.8) / 0.2) + 0.15) }));
    }
    // Bangs: long spiky locks over the forehead, of uneven length.
    for (let i = 0; i < 13; i++) {
      const a = THREE.MathUtils.lerp(-1.1, 1.1, i / 12);
      const root = new THREE.Vector3(Math.sin(a) * R * 0.82, R * 1.84, Math.cos(a) * R * 0.98 + 0.01);
      const dir = new THREE.Vector3(Math.sin(a) * 0.45, -0.3, Math.cos(a)).normalize();
      add({ kind: 'bang', root, dir, len: 0.075 + (i % 3 === 1 ? 0.022 : 0) + (i % 4 === 0 ? 0.012 : 0) + rand() * 0.012, seg: 7, r0: 0.021, r1: 0, flat: 0.45, stiff: 0.2, phase: rand() * 6.28, amp: 0.02 });
    }
    this.hair = new StrandBatch(this.hairSpecs, { radial: 8 });
    j.head.add(this.hair.mesh);

    // Hair tubes: frilled cylinders threaded on the sidelocks (placed along the lock every frame).
    const tubeGeo = lathe([[0.012, 0.004], [0.026, 0.0], [0.03, -0.006], [0.022, -0.012], [0.021, -0.07], [0.029, -0.078], [0.025, -0.086], [0.012, -0.088]], {
      segments: 40, sz: 0.7, smooth: 2, radial: (a, y) => 1 + 0.12 * Math.max(0, Math.cos(a * 10)) * (y > -0.015 || y < -0.068 ? 1 : 0.35),
    });
    this.tubes = this.sidelocks.map(() => { const m = mesh(tubeGeo); j.head.add(m); return m; });

    // ---------- the bow ----------
    this.bow = Reimu.makeBow();
    this.bow.position.set(0, R * 1.8, -R * 0.62);
    this.bow.rotation.x = -0.15;   // leans back: seen in profile, the loops are a thin lobe tilted backward
    j.head.add(this.bow);

    // ---------- clothes ----------
    // Vest (sleeveless, bare shoulders) over the bodice and waist.
    j.chest.add(mesh(lathe([[0.07, -0.08], [0.108, -0.06], [0.126, 0.02], [0.13, 0.09], [0.11, 0.13], [0.06, 0.16]], { segments: 28, sz: 0.7 })));
    j.spine.add(mesh(lathe([[0.105, -0.03], [0.1, 0.05], [0.108, 0.11]], { segments: 28, sz: 0.72 })));
    // Standing collar, pointed at the front, and the ascot below it.
    j.chest.add(mesh(lathe([[0.046, 0.14], [0.05, 0.19], [0.058, 0.215]], { segments: 24, sz: 0.9, radial: (a) => 1 + 0.18 * Math.pow(Math.max(0, Math.cos(a)), 6) })));
    const knot = mesh(ellipsoid(0.03, 0.022, 0.018));
    knot.position.set(0, 0.155, 0.075);
    j.chest.add(knot);
    for (const s of [1, -1]) {
      const flap = mesh(lathe([[0.001, 0], [0.02, -0.02], [0.026, -0.06], [0.018, -0.085], [0.001, -0.09]], { segments: 10, sz: 0.3 }));
      flap.position.set(0.008 * s, 0.15, 0.078);
      flap.rotation.set(0.25, 0, 0.25 * s);
      j.chest.add(flap);
    }

    // Long flared skirt with pleats (follows the hips, with a lagging sway applied in update()).
    this.skirt = new THREE.Group();
    j.hips.add(this.skirt);
    this.skirt.add(mesh(lathe([[0.118, 0.07], [0.14, -0.02], [0.2, -0.22], [0.27, -0.46], [0.315, -0.6], [0.312, -0.615]], {
      segments: 64, sz: 0.85, radial: (a, y) => 1 + 0.045 * Math.max(0, -y) * Math.cos(a * 16),
    })));

    // Detached sleeves: cloth tubes swept along the arm every frame, in shoulder space (see updateSleeve()).
    for (const side of ['L', 'R']) {
      this.addSleeve(side, 25, 30);
      // Ribbon tying the top of the sleeve round the upper arm.
      const tie = mesh(lathe([[0.046, 0.0], [0.05, -0.012], [0.046, -0.024]], { segments: 20 }));
      tie.position.y = -0.03;
      j['shoulder' + side].add(tie);
    }
  }

  static faceGeometry(R) {
    const geometry = Humanoid.headGeometry(R, { jaw: 0.2, chin: 0.07, nose: 0.18, segments: [64, 128] });
    const p = geometry.attributes.position;
    const g = (y, c, w) => Math.exp(-(((y - c) / w) ** 2));
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / R, front = Math.max(0, p.getZ(i) / R);
      // Closed lips in profile, as in the 7 – 11 s close-up (they never part there): a hollow under the nose,
      // the upper lip, a small notch, the lower lip a little behind it, a hollow, the point of the chin. Broad across
      // the cheeks: a narrow center dent disappears behind the cheek in profile.
      const lips = -0.03 * g(y, -0.46, 0.06) + 0.06 * g(y, -0.62, 0.07) - 0.035 * g(y, -0.72, 0.03)
        + 0.04 * g(y, -0.83, 0.06) - 0.035 * g(y, -0.98, 0.06) + 0.035 * g(y, -1.14, 0.07);
      p.setZ(i, p.getZ(i) + R * lips * Math.pow(front, 0.3));
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  /** The bow: a small knot and two lofted loops that flare outward and end in a lace frill. */
  static makeBow() {
    const g = new THREE.Group();
    const knot = mesh(ellipsoid(0.034, 0.042, 0.03));
    g.add(knot);
    const N = 72;       // points per ring
    const U = 16;       // rings along the loop
    for (const sx of [1, -1]) {
      const rings = [];
      const ring = (u, grow, frill) => {
        const cx = sx * (0.02 + u * 0.18 + grow);
        const cy = 0.012 + 0.012 * u * u;
        const cz = -0.012 * u;
        const h = 0.035 + 0.035 * Math.pow(u, 0.55);          // half height
        const d = 0.02 + 0.016 * Math.pow(u, 0.7);   // half depth: the loops open up a little toward their ends
        const pts = [];
        for (let k = 0; k < N; k++) {
          const a = (k / N) * Math.PI * 2;
          const c = Math.cos(a), s = Math.sin(a);
          // squarish section (superellipse): the loops read as broad, square-ended ribbons
          const e = 2 / 3.2;
          const y = Math.sign(s) * Math.pow(Math.abs(s), e) * h;
          const z = Math.sign(c) * Math.pow(Math.abs(c), e) * d;
          // lace teeth along the outer edge: every other point sticks out further along x
          const tooth = frill ? frill * (k % 2 ? 1 : 0.35) * (0.8 + 0.2 * Math.cos(a * 3)) : 0;
          pts.push(new THREE.Vector3(cx + sx * tooth, cy + y * (1 + (frill ? 0.06 : 0)), cz + z));
        }
        rings.push(pts);
      };
      for (let i = 0; i <= U; i++) ring(i / U, 0, 0);
      ring(1, 0.002, 0.022);      // the frill flange, just beyond the loop's end
      g.add(mesh(loft(rings)));
    }
    return g;
  }

  /**
   * Secondary motion. t: time (s). wind: world-space vector (added to gravity for hair/cloth).
   * swayAmp: global amplitude of idle sway.
   */
  update(t, { wind = new THREE.Vector3(), swayAmp = 1, skirtLag = [0, 0, 0] } = {}) {
    const j = this.j;
    const down = new THREE.Vector3(0, -1, 0).add(wind).normalize();
    this.root.updateMatrixWorld(true);

    // --- hair (head space) ---
    const g = this.worldDirToLocal('head', down, new THREE.Vector3());
    const colliders = this.headColliders();
    for (const s of this.hairSpecs) {
      const segLen = s.len / s.seg;
      const wave = (i, u) => [
        Math.sin(t * 2.1 + s.phase + u * 3) * s.amp * u * swayAmp,
        Math.sin(t * 1.7 + s.phase * 1.3 + u * 2.5) * s.amp * u * swayAmp,
      ];
      let curl = null;
      if (s.kind === 'bang') curl = (u) => new THREE.Vector3(0, -0.8 * u, -0.3 * u);
      chain(s.points, s.root, s.dir, g, s.seg, segLen, s.stiff, wave, s.kind === 'bang' ? null : colliders, curl);
    }
    this.hair.commit();

    // --- hair tubes ride on the sidelocks, about half way down ---
    const up = new THREE.Vector3(0, 1, 0);
    this.sidelocks.forEach((s, k) => {
      const i = 6;
      const tube = this.tubes[k];
      tube.position.copy(s.points[i - 1]);
      const dir = new THREE.Vector3().subVectors(s.points[i - 1], s.points[i + 1]).normalize();
      tube.quaternion.setFromUnitVectors(up, dir);
    });

    // --- detached sleeves (shoulder space): wide toward the cuff, sagging up to 15 cm, lace on the seam and cuff ---
    for (const side of ['L', 'R']) {
      this.updateSleeve(side, t, down, { radius: (u) => 0.056 + 0.06 * Math.pow(u, 0.9), sag: (u) => 0.15 * Math.pow(u, 1.2), sway: swayAmp, seam: true, teeth: true });
    }

    // --- skirt sway ---
    this.skirt.rotation.set(skirtLag[0], skirtLag[1], skirtLag[2]);
  }

  headColliders() {
    // Colliders in head-local space: cranium + neck + shoulders/back (from body joints).
    const R = this.o.headR;
    const list = [{ c: new THREE.Vector3(0, R * 1.1, -R * 0.12), r: R * 1.18 }];
    const inv = new THREE.Matrix4().copy(this.j.head.matrixWorld).invert();
    const add = (joint, off, r) => {
      const p = new THREE.Vector3(...off).applyMatrix4(this.j[joint].matrixWorld).applyMatrix4(inv);
      list.push({ c: p, r });
    };
    add('chest', [0, 0.1, -0.02], 0.14);
    add('chest', [0.1, 0.1, -0.02], 0.12);
    add('chest', [-0.1, 0.1, -0.02], 0.12);
    add('chest', [0, -0.02, -0.03], 0.14);
    add('spine', [0, 0.0, -0.02], 0.13);
    add('shoulderL', [0, 0, 0], 0.08);
    add('shoulderR', [0, 0, 0], 0.08);
    return list;
  }
}
