import * as THREE from 'three';
import { Humanoid, chain } from './humanoid.js';
import { lathe, ellipsoid, mesh, hairShell, StrandBatch } from '../core/geo.js';
import { rng } from '../core/timeline.js';

/*
 * Remilia — the girl with bat wings (0:36.4 onward), whom Patchouli turns into.
 * Silhouette features, as the original shows them (front view at 37.5 s, measured row by row): a child's build,
 * the head (cap and hair) as wide as the shoulders; a puffy mob cap with a frilled brim and a big bow standing up on
 * her left side; a short, spiky bob down to the jaw, its tips flicking outward; short puffed sleeves; bat wings from
 * her shoulder blades, each a membrane whose leading edge rises to a clawed wrist and drops to the tip, the trailing
 * edge scalloped between five finger points. She holds a teacup (a prop, placed by the shot).
 */
export class Remilia extends Humanoid {
  constructor(options = {}) {
    super({ scale: 0.88, headR: 0.108, shoulderW: 0.13, upperArm: 0.24, foreArm: 0.23, armR: [0.042, 0.034, 0.034, 0.026], handScale: 1.15, fist: true, ...options });
    const j = this.j;
    const R = this.o.headR;
    const rand = rng(77);
    this.headMesh.geometry = Humanoid.headGeometry(R, { jaw: 0.3, chin: 0.04 });

    // ---------- hair: a short bob of spiky locks round the head, down to the jaw, the tips flicking outward ----------
    const cap = hairShell(R * 1.12, { brow: 0.42, nape: 0.72, backWidth: 1.4 });
    cap.position.set(0, R * 1.12, -R * 0.02);
    j.head.add(cap);
    this.hairSpecs = [];
    const add = (s) => { this.hairSpecs.push(s); return s; };
    for (let i = 0; i < 30; i++) {
      // azimuth: 0 = straight back; the sides and the back, none over the face
      const a = THREE.MathUtils.lerp(-2.25, 2.25, i / 29) + (rand() - 0.5) * 0.1;
      const root = new THREE.Vector3(Math.sin(a) * R * 1.08, R * (1.25 + rand() * 0.2), -Math.cos(a) * R * 1.02);
      const side = Math.abs(Math.sin(a));
      add({ kind: 'bob', a, root, dir: new THREE.Vector3(Math.sin(a) * 0.35, -1, -Math.cos(a) * 0.3).normalize(),
        len: 0.13 + side * 0.03 + rand() * 0.035, seg: 8, r0: 0.03, r1: 0, flat: 0.4, stiff: 0.55,
        flick: 0.5 + rand() * 0.6, phase: rand() * 6.28, amp: 0.02 });
    }
    // bangs: spiky, uneven, down to the brow
    for (let i = 0; i < 11; i++) {
      const a = THREE.MathUtils.lerp(-1.15, 1.15, i / 10);
      const root = new THREE.Vector3(Math.sin(a) * R * 0.85, R * 1.82, Math.cos(a) * R * 0.7);
      add({ kind: 'bang', root, dir: new THREE.Vector3(Math.sin(a) * 0.45, -0.3, Math.cos(a)).normalize(),
        len: 0.085 + (i % 3 === 1 ? 0.025 : 0) + rand() * 0.015, seg: 6, r0: 0.02, r1: 0, flat: 0.45, stiff: 0.2, phase: rand() * 6.28, amp: 0.012 });
    }
    this.hair = new StrandBatch(this.hairSpecs, { radial: 6 });
    j.head.add(this.hair.mesh);

    // ---------- the mob cap: a broad puffed dome over a frilled brim; a big bow standing up on her left ----------
    this.cap = new THREE.Group();
    this.cap.position.set(0, R * 1.55, -R * 0.2);
    this.cap.rotation.x = -0.08;
    j.head.add(this.cap);
    this.cap.add(mesh(lathe([[0.001, 0.095], [0.07, 0.093], [0.12, 0.08], [0.152, 0.052], [0.165, 0.022], [0.165, 0.0], [0.155, -0.022], [0.14, -0.03]], {
      segments: 48, sz: 0.98, radial: (a, y) => 1 + 0.03 * Math.cos(a * 6) * Math.max(0, 0.06 - y) * 10,
    })));
    // the frill: a ruffled band round the rim that overhangs the brow and the sides
    this.cap.add(mesh(lathe([[0.138, -0.024], [0.162, -0.036], [0.178, -0.05], [0.176, -0.058], [0.155, -0.05], [0.134, -0.04]], {
      segments: 72, smooth: 2, radial: (a) => 1 + 0.05 * Math.max(0, Math.cos(a * 18)),
    })));
    // (tied at the side of the rim; the loops stand up and lean outward, broad side to the front)
    this.bow = new THREE.Group();
    this.bow.position.set(0.15, 0.04, 0.0);
    this.bow.rotation.set(0, 0, -0.45);
    this.cap.add(this.bow);
    this.bow.add(mesh(ellipsoid(0.018, 0.02, 0.014)));
    for (const s of [1, -1]) {
      const loop = mesh(ellipsoid(0.024, 0.055, 0.012));
      loop.position.set(s * 0.022, 0.045, 0);
      loop.rotation.z = -s * 0.4;
      this.bow.add(loop);
    }

    // ---------- the dress: a bodice with a small collar, short puffed sleeves, a flared skirt ----------
    j.chest.add(mesh(lathe([[0.07, -0.08], [0.104, -0.06], [0.118, 0.02], [0.12, 0.09], [0.106, 0.13], [0.055, 0.16]], { segments: 28, sz: 0.78 })));
    j.spine.add(mesh(lathe([[0.1, -0.03], [0.094, 0.05], [0.102, 0.11]], { segments: 28, sz: 0.8 })));
    j.chest.add(mesh(lathe([[0.042, 0.13], [0.06, 0.16], [0.07, 0.172], [0.05, 0.18]], { segments: 24, sz: 0.9 })));
    for (const side of ['L', 'R']) {
      const puff = mesh(ellipsoid(0.05, 0.062, 0.05));
      puff.position.set(0, -0.04, 0);
      j['shoulder' + side].add(puff);
      const cuff = mesh(lathe([[0.04, 0.0], [0.05, -0.01], [0.042, -0.02]], { segments: 20, radial: (a) => 1 + 0.08 * Math.max(0, Math.cos(a * 9)) }));
      cuff.position.y = -0.1;
      j['shoulder' + side].add(cuff);
    }
    this.skirt = new THREE.Group();
    j.hips.add(this.skirt);
    this.skirt.add(mesh(lathe([[0.11, 0.07], [0.13, -0.02], [0.2, -0.2], [0.26, -0.38], [0.275, -0.43], [0.265, -0.44]], {
      segments: 64, sz: 0.9, radial: (a, y) => 1 + 0.04 * Math.max(0, -y) * Math.cos(a * 14),
    })));

    // ---------- wings ----------
    // Each wing is a flat membrane in its own joint (wingL/R, on the chest at the shoulder blade): local +X runs out
    // along the wing (mirrored for the right one), +Y up, the membrane in the XY plane. The shot spreads, raises and
    // flaps them (poseWings). The outline was taken from the front view at 37.5 s (0.0021 m per pixel).
    this.wing = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const w = new THREE.Group();
      w.name = 'wing' + side;
      w.position.set(0.045 * s, -0.045, -0.08);
      j.chest.add(w);
      this.j['wing' + side] = w;
      const m = mesh(Remilia.wingGeometry());
      m.scale.set(1.35 * s, 1.1, 1);
      w.add(m);
      // the wing's tip (for tools/motion.mjs: --joints wingTipL)
      const tip = new THREE.Object3D();
      tip.position.set(0.49, -0.108, 0);
      m.add(tip);
      this.j['wingTip' + side] = tip;
      this.wing[side] = { joint: w, mesh: m, s };
    }

    this.rest = {};
    for (const [k, g] of Object.entries(this.j)) this.rest[k] = { p: g.position.clone(), q: g.quaternion.clone() };
  }

  /** The membrane: leading edge to the clawed wrist, down to the tip, back along five scalloped finger points. */
  static wingGeometry() {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.035);
    sh.lineTo(0.06, 0.04);
    sh.quadraticCurveTo(0.14, 0.045, 0.18, 0.03);
    sh.quadraticCurveTo(0.26, 0.06, 0.312, 0.098);   // up the leading edge to the wrist
    sh.lineTo(0.318, 0.112);                           // the claw
    sh.lineTo(0.33, 0.078);
    sh.quadraticCurveTo(0.4, 0.0, 0.49, -0.108);       // down the outer edge to the tip
    // back along the trailing edge: a scallop (curving up) between each pair of finger points
    const fingers = [[0.49, -0.108], [0.38, -0.108], [0.3, -0.076], [0.228, -0.074], [0.14, -0.074], [0.06, -0.05]];
    for (let i = 1; i < fingers.length; i++) {
      const [x0, y0] = fingers[i - 1], [x1, y1] = fingers[i];
      sh.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 0.02, x1, y1);
    }
    sh.lineTo(0, -0.03);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -0.003);
    return g;
  }

  /** Spread and flap the wings: per side [sweep back (deg, about Y), raise (deg, about Z), pitch (deg, about X)]. */
  poseWings(L, R) {
    for (const [side, a] of [['L', L], ['R', R]]) {
      const { joint, s } = this.wing[side];
      joint.rotation.set(a[2] * Math.PI / 180, s * a[0] * Math.PI / 180, s * a[1] * Math.PI / 180, 'YZX');
    }
  }

  update(t, { wind = new THREE.Vector3(), sway = 1 } = {}) {
    this.root.updateMatrixWorld(true);
    const down = new THREE.Vector3(0, -1, 0).add(wind).normalize();
    const g = this.worldDirToLocal('head', down, new THREE.Vector3());
    const R = this.o.headR;
    const col = [{ c: new THREE.Vector3(0, R * 1.1, -R * 0.05), r: R * 1.14 }];
    for (const s of this.hairSpecs) {
      const segLen = s.len / s.seg;
      const amp = s.amp * sway;
      const wave = (i, u) => [Math.sin(t * 2.4 + s.phase + u * 3) * amp * u, Math.sin(t * 2 + s.phase * 1.3 + u * 2.5) * amp * u];
      let curl = null;
      if (s.kind === 'bang') curl = (u) => new THREE.Vector3(0, -0.8 * u, -0.3 * u);
      else {
        // the tips flick outward (away from the head's axis)
        const out = new THREE.Vector3(Math.sin(s.a), 0, -Math.cos(s.a));
        curl = (u) => out.clone().multiplyScalar(s.flick * u * u);
      }
      chain(s.points, s.root, s.dir, g, s.seg, segLen, s.stiff, wave, s.kind === 'bang' ? null : col, curl);
    }
    this.hair.commit();
  }
}
