import * as THREE from 'three';
import { Humanoid, chain } from './humanoid.js';
import { lathe, ellipsoid, mesh, hairShell, StrandBatch } from '../core/geo.js';
import { rng } from '../core/timeline.js';

// Sakuya: fitted maid dress, puffed shoulders, scalloped headband, bob and two small side braids.
export class Sakuya extends Humanoid {
  constructor(options = {}) {
    super({ headR: 0.105, shoulderW: 0.145, handScale: 1.35, armR: [0.043, 0.037, 0.037, 0.028], ...options });
    const j = this.j, R = this.o.headR, rand = rng(143);
    const shell = hairShell(R * 1.14, { brow: 0.45, nape: 0.86, backWidth: 1.5 });
    shell.position.y = R * 1.12;
    j.head.add(shell);
    this.hairSpecs = [];
    for (let i = 0; i < 38; i++) {
      const a = -2.45 + 4.9 * i / 37;
      this.hairSpecs.push({ root: new THREE.Vector3(Math.sin(a) * R, R * 1.42, -Math.cos(a) * R),
        dir: new THREE.Vector3(Math.sin(a) * 0.15, -1, -Math.cos(a) * 0.2).normalize(),
        len: 0.12 + rand() * 0.085, seg: 7, r0: 0.022, r1: 0, flat: 0.5, stiff: 0.7, phase: rand() * 6.28 });
    }
    for (let i = 0; i < 10; i++) {
      const x = (i - 4.5) * 0.019;
      this.hairSpecs.push({ root: new THREE.Vector3(x, 0.19, 0.06), dir: new THREE.Vector3(x * 2, -0.6, 0.5).normalize(),
        len: 0.09 + rand() * 0.035, seg: 6, r0: 0.025, r1: 0, flat: 0.45, stiff: 0.8, phase: i });
    }
    this.hair = new StrandBatch(this.hairSpecs, { radial: 6 });
    j.head.add(this.hair.mesh);
    this.band = new THREE.Group();
    j.head.add(this.band);
    for (let i = 0; i < 9; i++) {
      const a = -1.35 + i * 2.7 / 8;
      const frill = mesh(ellipsoid(0.025, 0.022, 0.033));
      frill.position.set(Math.sin(a) * 0.116, 0.112 + Math.cos(a) * 0.137, 0.024);
      frill.rotation.z = -a;
      this.band.add(frill);
    }
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 2 / 10;
      const frill = mesh(ellipsoid(0.025, 0.026, 0.026));
      frill.position.set(Math.sin(a) * 0.085, 0.217, Math.cos(a) * 0.07);
      this.band.add(frill);
    }
    this.braids = [];
    for (const s of [-1, 1]) {
      const braid = new THREE.Group();
      braid.position.set(s * 0.1, 0.05, 0.053);
      for (let i = 0; i < 6; i++) {
        const knot = mesh(ellipsoid(0.014, 0.019, 0.013));
        knot.position.set(s * Math.sin(i * 2.6) * 0.005, -i * 0.022, 0);
        braid.add(knot);
      }
      j.head.add(braid); this.braids.push(braid);
    }
    j.chest.add(mesh(lathe([[0.06, 0.16], [0.125, 0.1], [0.12, 0], [0.095, -0.07]], { sz: 0.75 })));
    this.skirt = new THREE.Group(); j.hips.add(this.skirt);
    this.skirt.add(mesh(lathe([[0.1, 0.07], [0.125, -0.02], [0.26, -0.2], [0.35, -0.38], [0.33, -0.51], [0.31, -0.54]], {
      segments: 64, sz: 0.85, radial: (a, y) => 1 + 0.05 * Math.max(0, -y) * Math.cos(a * 14),
    })));
    // A broad tied apron bow reads behind the waist in profile.
    this.bow = new THREE.Group(); this.bow.position.set(0, 0, -0.09); j.hips.add(this.bow);
    this.bow.add(mesh(ellipsoid(0.08, 0.045, 0.055)));
    for (const s of [-1, 1]) {
      const shape = new THREE.Shape(); shape.moveTo(0, 0);
      shape.lineTo(0.14, 0.085); shape.quadraticCurveTo(0.15, 0.025, 0.08, -0.09); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      const loop = mesh(geo); loop.position.x = s * 0.06; loop.rotation.z = s * 0.2; this.bow.add(loop);
    }
    for (const side of ['L', 'R']) {
      const sleeve = mesh(ellipsoid(0.063, 0.085, 0.062)); sleeve.position.y = -0.05; j['shoulder' + side].add(sleeve);
      const cuff = mesh(lathe([[0.033, 0.012], [0.045, -0.008], [0.033, -0.023]], {
        segments: 32, radial: (a) => 1 + 0.12 * Math.cos(a * 9),
      }));
      j['wrist' + side].add(cuff);
    }
  }

  update(t) {
    this.root.updateMatrixWorld(true);
    const down = this.worldDirToLocal('head', new THREE.Vector3(0, -1, 0), new THREE.Vector3());
    for (const s of this.hairSpecs) {
      chain(s.points, s.root, s.dir, down, s.seg, s.len / s.seg, s.stiff,
        (i, u) => [Math.sin(t * 3 + s.phase + u) * 0.008 * u, 0]);
    }
    this.hair.commit();
    this.braids.forEach((b, i) => { b.rotation.z = Math.sin(t * 5 + i) * 0.07; });
  }
}
