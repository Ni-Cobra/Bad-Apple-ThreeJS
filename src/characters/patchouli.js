import * as THREE from 'three';
import { Humanoid, chain } from './humanoid.js';
import { lathe, limb, ellipsoid, mesh, hairShell, StrandBatch } from '../core/geo.js';
import { rng } from '../core/timeline.js';

/*
 * Patchouli — the girl the apple core turns into (0:28.4 onward).
 * Silhouette features, as the original shows them: a puffy mob cap larger than her head, overhanging her brow,
 * with a crescent moon standing on its front and a bow at its front and back edges; long straight hair falling
 * to her thighs; a lock in front of each ear down to her chest, tied at the end; a long robe flaring to the
 * ankles, only her shoes showing below it; long trumpet sleeves that hang from a raised arm; a book held against
 * her chest.
 */
export class Patchouli extends Humanoid {
  constructor() {
    super({ scale: 0.94, legLen: 0.74, headR: 0.105, armR: [0.03, 0.024, 0.023, 0.018], handScale: 1.5, fist: true });
    const j = this.j;
    const R = this.o.headR;
    const rand = rng(51);
    // a fuller jaw than the others (in the 0:34 close-up her chin is almost under her nose), mouth open: talking
    this.headMesh.geometry = Humanoid.headGeometry(R, { jaw: 0.12, chin: 0.1, mouth: 0.12 });

    // ---------- hair ----------
    const cap = hairShell(R * 1.1, { brow: 0.4, nape: 0.8, backWidth: 1.3 });
    cap.position.set(0, R * 1.1, -R * 0.06);
    j.head.add(cap);
    this.hairSpecs = [];
    const add = (s) => { this.hairSpecs.push(s); return s; };
    // The back curtain: straight locks rooted round the back of the head, down to the thighs.
    for (let i = 0; i < 36; i++) {
      const a = THREE.MathUtils.lerp(-1.35, 1.35, i / 35) + (rand() - 0.5) * 0.08;   // 0 = straight back (none at the sides: the neck shows)
      const root = new THREE.Vector3(Math.sin(a) * R * 1.0, R * (1.35 + rand() * 0.2), -Math.cos(a) * R * 1.0 - R * 0.08);
      const edge = Math.abs(a) > 1.15;
      add({ kind: 'back', root, a, dir: new THREE.Vector3(Math.sin(a) * 0.15, -0.8, -Math.cos(a) * 0.6).normalize(),
        len: (edge ? 0.55 : 0.78) + rand() * 0.1, seg: 14, r0: 0.05, r1: 0, flat: 0.4, stiff: 0.3,
        phase: rand() * 6.28, amp: 0.03 + rand() * 0.03 });
    }
    // A lock in front of each ear, down to the chest (tied near its end, see the ribbons below).
    this.sidelocks = [];
    for (const s of [1, -1]) {
      this.sidelocks.push(add({ kind: 'side', s, root: new THREE.Vector3(s * R * 0.86, R * 1.1, R * 0.28), dir: new THREE.Vector3(s * 0.2, -1, 0.1).normalize(),
        len: 0.36, seg: 12, r0: 0.03, r1: 0.004, flat: 0.5, stiff: 0.7, phase: rand() * 6.28, amp: 0.025,
        profile: (u) => (u < 0.78 ? 1 - 0.3 * u : u < 0.84 ? 0.55 : 0.9 - (u - 0.84) * 3) }));
    }
    // Bangs: straight, down to the brow.
    for (let i = 0; i < 13; i++) {
      const a = THREE.MathUtils.lerp(-1.15, 1.15, i / 12);
      const root = new THREE.Vector3(Math.sin(a) * R * 0.8, R * 1.8, Math.cos(a) * R * 0.66);
      add({ kind: 'bang', root, dir: new THREE.Vector3(Math.sin(a) * 0.4, -0.35, Math.cos(a)).normalize(), len: 0.075 + (i % 2) * 0.015 + rand() * 0.015, seg: 6, r0: 0.02, r1: 0, flat: 0.45, stiff: 0.2, phase: rand() * 6.28, amp: 0.015 });
    }
    this.sleeveTuck = 0;       // 0..1, set by the shot: her right sleeve falls back along the pointing forearm
    this.sleeveBack = 0;       // 0..1, set by the shot: and slides down past the elbow
    this.hair = new StrandBatch(this.hairSpecs, { radial: 6 });
    j.head.add(this.hair.mesh);
    // ribbons tying the sidelocks (placed on the lock every frame)
    this.lockTies = this.sidelocks.map(() => {
      const g = Patchouli.makeBow(0.028);
      j.head.add(g);
      return g;
    });

    // ---------- the mob cap ----------
    this.cap = new THREE.Group();
    this.cap.position.set(0, R * 1.38, -R * 0.4);
    this.cap.rotation.x = -0.04;
    j.head.add(this.cap);
    // a puffed dome, widest just above its rim (a muffin, not a ball), with a soft frill round the rim that
    // overhangs the brow
    this.cap.add(mesh(lathe([[0.001, 0.145], [0.08, 0.138], [0.13, 0.116], [0.158, 0.082], [0.171, 0.04], [0.175, 0.0], [0.17, -0.028], [0.152, -0.036]], {
      segments: 48, sz: 1.02, radial: (a, y) => 1 + 0.025 * Math.cos(a * 7) * Math.max(0, 0.08 - y) * 8,
    })));
    this.cap.add(mesh(lathe([[0.15, -0.032], [0.168, -0.044], [0.177, -0.056], [0.174, -0.062], [0.157, -0.056], [0.143, -0.047]], {
      segments: 64, smooth: 2, radial: (a) => 1 + 0.035 * Math.max(0, Math.cos(a * 16)),
    })));
    // the crescent moon standing on the front of the cap, horns pointing back
    const moon = mesh(new THREE.TorusGeometry(0.036, 0.012, 8, 24, Math.PI * 1.25));
    moon.scale.set(1, 1, 0.5);
    moon.position.set(0, 0.15, 0.075);
    moon.rotation.set(0, Math.PI / 2, Math.PI * 0.45);
    this.cap.add(moon);
    // bows at the front and back of the rim (in profile a small knot sticking out; from the front, two loops)
    // (their loops point forward and back: in profile they stick out like the original's small bow-ties)
    for (const z of [0.18, -0.175]) {
      const b = Patchouli.makeBow(0.03, 0.42);
      b.position.set(0, -0.03, z);
      b.rotation.set(0, Math.PI / 2, 0);
      this.cap.add(b);
    }

    // ---------- the robe ----------
    // bodice (chest) and a long robe from the waist to the ankles, flaring, with a soft wave at the hem
    j.chest.add(mesh(lathe([[0.07, -0.08], [0.105, -0.06], [0.122, 0.02], [0.126, 0.09], [0.11, 0.13], [0.06, 0.16]], { segments: 28, sz: 0.88 })));
    j.spine.add(mesh(lathe([[0.108, -0.03], [0.104, 0.05], [0.11, 0.11]], { segments: 28, sz: 0.9 })));
    this.robe = new THREE.Group();
    j.hips.add(this.robe);
    this.robe.add(mesh(lathe([[0.12, 0.08], [0.14, -0.02], [0.17, -0.2], [0.21, -0.4], [0.24, -0.58], [0.25, -0.636], [0.242, -0.646]], {
      segments: 64, sz: 0.95, radial: (a, y) => 1 + 0.03 * Math.max(0, -y - 0.3) * Math.cos(a * 11),
    })));
    // ribbons at the waist: two short tails hanging at the front
    for (const s of [1, -1]) {
      const tail = mesh(limb(0.16, 0.012, 0.009, { segments: 6, sx: 1.8, sz: 0.5 }));
      tail.position.set(s * 0.05, 0.02, 0.1);
      tail.rotation.set(0.12, 0, s * 0.12);
      j.spine.add(tail);
      const b = Patchouli.makeBow(0.03);
      b.position.set(0, 0.03, 0.105);
      j.spine.add(b);
    }

    // ---------- sleeves: long trumpet sleeves swept along the arm, sagging toward the cuff ----------
    for (const side of ['L', 'R']) this.addSleeve(side, 25, 28);

    // a longer, thicker index finger (it carries the 0:34 close-up)
    for (const side of ['L', 'R']) this.fingers[side].f[0].base.scale.set(1.3, 1.25, 1.3);

    // ---------- the book: placed in hips space by the shot (so it bops with her); her left hand reaches it ----------
    this.book = new THREE.Group();
    const cover = mesh(new THREE.BoxGeometry(0.17, 0.24, 0.035));
    cover.position.set(0, 0.12, 0);
    this.book.add(cover);
    j.hips.add(this.book);
  }

  /** A ribbon bow: two flat loops and a knot, `w` wide per loop, `h` their height relative to w. */
  static makeBow(w, h = 0.62) {
    const g = new THREE.Group();
    for (const s of [1, -1]) {
      const loop = mesh(ellipsoid(w, w * h, w * 0.35));
      loop.position.set(s * w * 0.9, 0, 0);
      loop.rotation.z = s * 0.35;
      g.add(loop);
    }
    g.add(mesh(ellipsoid(w * 0.35, w * 0.38, w * 0.3)));
    return g;
  }

  /** Where the book is, in hips space (its origin is the middle of its bottom edge). */
  holdBook(pos, rot) {
    this.book.position.fromArray(pos);
    this.book.rotation.set(rot[0], rot[1], rot[2]);
  }

  /** Where her left hand holds the book (world): its bottom edge, toward the spine. */
  bookGrip(out = new THREE.Vector3()) {
    this.book.updateMatrixWorld(true);
    return this.book.localToWorld(out.set(0.05, 0.01, 0));
  }

  /** wind: world-space vector added to gravity (spins, gusts); sway: idle sway amplitude */
  update(t, { wind = new THREE.Vector3(), sway = 1 } = {}) {
    this.root.updateMatrixWorld(true);
    const down = new THREE.Vector3(0, -1, 0).add(wind).normalize();
    const g = this.worldDirToLocal('head', down, new THREE.Vector3());
    const col = this.hairColliders();
    for (const s of this.hairSpecs) {
      const segLen = s.len / s.seg;
      const amp = s.amp * sway * (1 + wind.length());
      const wave = (i, u) => [Math.sin(t * 2.3 + s.phase + u * 3) * amp * u, Math.sin(t * 1.9 + s.phase * 1.3 + u * 2.5) * amp * u];
      let curl = null;
      if (s.kind === 'bang') curl = (u) => new THREE.Vector3(0, -0.8 * u, -0.3 * u);
      else if (s.kind === 'back') {
        // the curtain opens a little toward its ends
        const out = new THREE.Vector3(Math.sin(s.a) * 0.3, 0, -Math.cos(s.a) * 0.4);
        curl = (u) => out.clone().multiplyScalar(0.15 * u);
      }
      chain(s.points, s.root, s.dir, g, s.seg, segLen, s.stiff, wave, s.kind === 'bang' ? null : col, curl);
    }
    this.hair.commit();
    // ribbons near the ends of the sidelocks
    this.sidelocks.forEach((s, k) => {
      const tie = this.lockTies[k];
      tie.position.copy(s.points[9]);
      const dir = new THREE.Vector3().subVectors(s.points[8], s.points[10]).normalize();
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    });
    // trumpet sleeves: narrow at the shoulder, wide at the cuff, the cloth under a raised arm hanging low
    // (on a raised forearm the wide cuff falls back: the sleeve slides a little and bunches into a tube)
    for (const side of ['L', 'R']) {
      const fore = new THREE.Vector3(0, -1, 0).transformDirection(this.j['elbow' + side].matrixWorld);
      const raised = Math.max(0, -fore.dot(down)), hanging = Math.max(0, fore.dot(down));
      // (a hanging arm's cuff flares less)
      // (sleeveBack: the sleeve slides down past the elbow as she turns the pointing hand, 36 s)
      const back = side === 'R' ? this.sleeveBack : 0;
      this.updateSleeve(side, t, down, { radius: (u) => (0.042 + 0.06 * Math.pow(u, 1.6) * (1 - 0.3 * raised - 0.35 * hanging) * (1 - 0.5 * back)), sag: (u) => 0.1 * Math.pow(u, 1.5) * (1 - 0.4 * raised) * (side === 'R' ? 1 - 0.75 * this.sleeveTuck : 1), sway: 0.6 * sway, end: -0.01 + 0.14 * back, slide: 0.2 });
    }
    // the robe swings a little with the hips' motion (gravity in hips space)
    const gh = this.worldDirToLocal('hips', down, new THREE.Vector3());
    const rest = new THREE.Vector3(0, -1, 0);
    this.robe.quaternion.setFromUnitVectors(rest, rest.clone().lerp(gh, 0.6).normalize());
  }

  /** Head, neck, shoulders, back and the robe's back, in head space: the long hair drapes over them. */
  hairColliders() {
    const R = this.o.headR;
    const inv = new THREE.Matrix4().copy(this.j.head.matrixWorld).invert();
    const at = (joint, off, r) => ({ c: new THREE.Vector3(...off).applyMatrix4(this.j[joint].matrixWorld).applyMatrix4(inv), r });
    return [{ c: new THREE.Vector3(0, R * 1.1, -R * 0.1), r: R * 1.15 },
      at('chest', [0, 0.1, -0.02], 0.13), at('chest', [0, -0.02, -0.03], 0.13), at('spine', [0, 0, -0.02], 0.13),
      at('hips', [0, -0.05, -0.02], 0.16), at('hips', [0, -0.3, -0.02], 0.19),
      at('shoulderL', [0, 0, 0], 0.075), at('shoulderR', [0, 0, 0], 0.075)];
  }
}
