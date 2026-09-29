import * as THREE from 'three';
import { Remilia } from './remilia.js';
import { chain } from './humanoid.js';
import { ellipsoid, lathe, mesh, StrandBatch } from '../core/geo.js';
import { paper } from '../core/materials.js';
import { rng } from '../core/timeline.js';

// Flandre: rounded cap, side bow and ponytail, and branching wings hung with pointed crystals.
export class Flandre extends Remilia {
  constructor() {
    super({ upperArm: 0.27, foreArm: 0.30, handScale: 1.35 });
    const rand = rng(156);
    // The smile (from 55.35 s on the original): a thin crescent on the lower face, between nose and chin, laid onto
    // the face surface so it moves with it. Drawn over the fringe (no depth test), as the original shows her grin
    // under the bangs when she bows her head; she faces the camera whenever it shows.
    const smileShape = new THREE.Shape();
    smileShape.moveTo(-0.021, 0.004);
    smileShape.quadraticCurveTo(0, -0.004, 0.021, 0.004);
    smileShape.quadraticCurveTo(0.002, -0.014, -0.021, 0.004);
    this.smile = new THREE.Mesh(Flandre.onFace(new THREE.ShapeGeometry(smileShape, 24), this.headMesh, 0.034), paper.clone());
    this.smile.material.depthTest = false;
    this.smile.renderOrder = 1;
    this.smile.visible = false;
    this.j.head.add(this.smile);
    this.cap.scale.set(0.92, 1.35, 0.96);
    const nape = mesh(ellipsoid(0.104, 0.075, 0.09));
    nape.position.set(0, 0.04, -0.055); this.j.head.add(nape);
    for (const m of this.j.chest.children.filter((o) => o.isMesh)) m.scale.x *= 1.22;
    for (const m of this.j.spine.children.filter((o) => o.isMesh)) m.scale.x *= 1.15;
    for (const side of ['L', 'R']) this.j['hand' + side].children[0].scale.x = 1.6;
    this.bow.clear();
    this.bow.rotation.z = -0.2;
    this.bow.position.set(0.17, 0.005, 0);
    for (const s of [-1, 1]) {
      const loop = mesh(ellipsoid(0.047, 0.058, 0.023));
      loop.position.set(s * 0.014, 0.025, 0);
      loop.rotation.z = s * 0.45;
      this.bow.add(loop);
    }
    this.pony = new THREE.Group();
    this.pony.position.set(0.132, 0.11, -0.015);
    this.j.head.add(this.pony);
    this.ponySpecs = Array.from({ length: 18 }, (_, i) => ({
      root: new THREE.Vector3((rand() - 0.5) * 0.05, (rand() - 0.5) * 0.035, (rand() - 0.5) * 0.065),
      dir: new THREE.Vector3(0.3, -1, -0.1).normalize(), len: 0.21 + rand() * 0.045,
      seg: 9, r0: 0.024, r1: 0, flat: 0.65, stiff: 0.45, phase: i * 1.7,
    }));
    this.ponyHair = new StrandBatch(this.ponySpecs, { radial: 6 });
    this.pony.add(this.ponyHair.mesh);
    this.crystals = [];
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const joint = this.wing[side].joint;
      joint.clear(); joint.position.set(0.055 * s, 0.045, -0.08);
      const branch = mesh(Flandre.branchGeometry());
      branch.userData.positions = branch.geometry.attributes.position.array.slice();
      branch.scale.x = s;
      joint.add(branch);
      this.wing[side].mesh = branch;
      const tip = new THREE.Object3D(); tip.position.set(0.98, -0.07, 0);
      branch.add(tip); this.j['wingTip' + side] = tip;
      for (let i = 0; i < 8; i++) {
        const x = 0.1 + i * 0.113;
        const y = Flandre.branchHeight(x) - 0.014;
        const drop = new THREE.Group(); drop.position.set(x * s, y, 0);
        joint.add(drop);
        const length = [0.2, 0.245, 0.28, 0.265, 0.235, 0.21, 0.18, 0.145][i];
        drop.scale.set(0.82 * Math.min(1, length / 0.23), 0.75, 0.82);
        drop.add(mesh(lathe([[0.008, 0], [0.012, -0.026], [0.043, -0.063], [0.039, -0.09], [0.001, -length]], { segments: 4, smooth: 1 })));
        this.crystals.push({ joint: drop, i, s, height: y });
      }
    }
    for (const [k, g] of Object.entries(this.j)) this.rest[k] = { p: g.position.clone(), q: g.quaternion.clone() };
  }

  static branchHeight(x) {
    if (x < 0.18) return 0.015 * x / 0.18;
    if (x < 0.43) return 0.015 + (x - 0.18) / 0.25 * 0.16;
    const u = (0.74 - Math.sqrt(0.74 ** 2 - 0.76 * (x - 0.43))) / 0.38;
    return 0.175 - 0.49 * u + 0.245 * u * u;
  }

  static branchGeometry() {
    const shape = new THREE.Shape();
    for (const side of [1, -1]) for (let i = 0; i <= 48; i++) {
      const x = (side === 1 ? i : 48 - i) / 48 * 0.98;
      const halfWidth = 0.011 * (1 - (x / 0.98) ** 5);
      const y = Flandre.branchHeight(x) + side * halfWidth;
      if (side === 1 && i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.015, bevelEnabled: false, curveSegments: 16 });
    g.translate(0, 0, -0.0075);
    return g;
  }

  poseArch(arch) {
    for (const side of ['L', 'R']) {
      const branch = this.wing[side].mesh, a = branch.geometry.attributes.position, base = branch.userData.positions;
      for (let i = 0; i < a.count; i++) {
        const center = Flandre.branchHeight(base[i * 3]);
        a.setY(i, base[i * 3 + 1] + center * (arch - 1));
      }
      a.needsUpdate = true; branch.geometry.computeVertexNormals();
      this.j['wingTip' + side].position.y = -0.07 * arch;
    }
  }

  // Moves a flat shape (x, y around 0) onto the front of the head mesh at height y0 (head space), 1.5 mm proud of it.
  static onFace(geometry, headMesh, y0) {
    const head = headMesh.geometry.attributes.position, o = headMesh.position, p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) + y0;
      let zw = 0, w = 0;
      for (let k = 0; k < head.count; k++) {
        const hz = head.getZ(k) + o.z;
        if (hz <= 0) continue;
        const d2 = (head.getX(k) + o.x - x) ** 2 + (head.getY(k) + o.y - y) ** 2;
        if (d2 > 0.012 ** 2) continue;
        const wk = 1 / (d2 + 1e-6); zw += hz * wk; w += wk;
      }
      p.setXYZ(i, x, y, zw / w + 0.0015);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  update(t, options = {}) {
    super.update(t, options);
    this.smile.material.color.copy(paper.color);
    this.pony.rotation.z = 0.06 * Math.sin((t - 51) * 4);
    this.root.updateMatrixWorld(true);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this.pony.getWorldQuaternion(new THREE.Quaternion()).invert());
    for (const s of this.ponySpecs) {
      chain(s.points, s.root, s.dir, down, s.seg, s.len / s.seg, s.stiff,
        (i, u) => [0.014 * Math.sin(t * 4 + s.phase + u * 2) * u, 0]);
    }
    this.ponyHair.commit();
    for (const { joint, i, s } of this.crystals) joint.rotation.z = s * 0.025 * Math.sin(t * 3.5 - i * 0.3);
  }
}
