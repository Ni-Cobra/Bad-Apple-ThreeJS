import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ink } from '../core/materials.js';
import { mesh, ellipsoid } from '../core/geo.js';
import { rng } from '../core/timeline.js';

// Katana points along local +X; origin is the center of the gripping hand.
export function makeKatana({ sheath = false, length = 1.05, empty = false } = {}) {
  const group = new THREE.Group(), shape = new THREE.Shape();
  shape.moveTo(0.11, 0.012);
  shape.quadraticCurveTo(length * 0.7, 0.018, length, 0.026);
  shape.lineTo(length - 0.055, -0.01);
  shape.quadraticCurveTo(length * 0.6, -0.016, 0.11, -0.012); shape.closePath();
  const blade = mesh(new THREE.ExtrudeGeometry(shape, { depth: sheath ? 0.026 : 0.008, bevelEnabled: false, curveSegments: 24 }));
  blade.position.z = sheath ? -0.013 : -0.004; group.add(blade);
  const grip = mesh(new THREE.CylinderGeometry(0.018, 0.019, 0.23, 12)); grip.rotation.z = Math.PI / 2; group.add(grip);
  const guard = mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.016, 20));
  guard.rotation.z = Math.PI / 2; guard.position.x = 0.12; guard.scale.z = 0.65; group.add(guard);
  group.userData.blade = blade;
  if (empty) {
    group.remove(grip, guard);
    // An empty scabbard starts at its opening; it has no second sword handle.
    blade.position.x = -0.11;
  }
  return group;
}

// The foreground blossom that will become the boat: a cupped, notched petal with real depth.
export function makeHeroPetal() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(-0.09, -0.29, -0.29, 0.15, -0.16, 0.43);
  shape.quadraticCurveTo(-0.1, 0.53, 0, 0.36);
  shape.quadraticCurveTo(0.12, 0.53, 0.19, 0.39);
  shape.bezierCurveTo(0.3, 0.14, 0.11, -0.28, 0, -0.5);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false, curveSegments: 24 });
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.6 * p.getX(i) ** 2 + 0.09 * p.getY(i) ** 2);
  geometry.computeVertexNormals();
  return mesh(geometry);
}

export function makeFan() {
  const group = new THREE.Group(), rings = [], indices = [];
  // Folded paper has alternating depth along its radial pleats, and a gently scalloped rim.
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = -1.1 + i / n * 2.2, z = i % 2 ? 0.01 : -0.01;
    for (const r of [0.04, 0.51]) rings.push(Math.sin(a) * r, Math.cos(a) * r, z);
    if (i < n) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rings, 3));
  g.setIndex(indices); g.computeVertexNormals(); group.add(mesh(g));
  return group;
}

export function makeGhost() {
  const group = new THREE.Group();
  const body = mesh(ellipsoid(0.19, 0.16, 0.15)); group.add(body);
  const points = [];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28; points.push(new THREE.Vector3(-u * 0.9, 0.08 * Math.sin(u * 6) + 0.16 * u, 0.04 * Math.sin(u * 3)));
  }
  const path = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(path, 40, 0.12, 10, false), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = Math.floor(i / 11) / 40, center = path.getPointAt(u), k = (1 - u) ** 1.6;
    p.setXYZ(i, center.x + (p.getX(i) - center.x) * k, center.y + (p.getY(i) - center.y) * k, center.z + (p.getZ(i) - center.z) * k);
  }
  geo.computeVertexNormals(); group.add(mesh(geo)); return group;
}

// A cherry tree seen from the front (+Z): its blossom crown hangs low on the left of the trunk; on the right, bare
// limbs fan out and up from the trunk into fine twigs (as at 63.25 s). Origin at the foot of the trunk.
export function makeCherryTree() {
  const group = new THREE.Group(), rand = rng(630), branches = [], leaves = [];
  function tube(start, end, r0, r1, bend = 0.12) {
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3((rand() - 0.5), (rand() - 0.5), (rand() - 0.5) * 0.5)
      .multiplyScalar(start.distanceTo(end) * bend));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const g = new THREE.TubeGeometry(curve, 4, 1, 5, false), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = Math.floor(i / 6) / 4, c = curve.getPointAt(u), r = r0 + (r1 - r0) * u;
      p.setXYZ(i, c.x + (p.getX(i) - c.x) * r, c.y + (p.getY(i) - c.y) * r, c.z + (p.getZ(i) - c.z) * r);
    }
    branches.push(g);
  }
  // a limb forks again and again, each fork shorter and thinner, spreading in the picture plane
  function limb(start, dir, len, r, depth) {
    const end = start.clone().addScaledVector(dir, len);
    tube(start, end, r, r * 0.72);
    if (depth === 0) return;
    const n = depth > 4 ? 2 : rand() < 0.5 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = (i / (n - 1) - 0.5) * (0.75 + rand() * 0.35) + (rand() - 0.5) * 0.25;
      const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), spread);
      d.z += (rand() - 0.5) * 0.35; d.y += 0.03; d.normalize();
      limb(end, d, len * (0.64 + rand() * 0.12), Math.max(r * 0.66, 0.003), depth - 1);
    }
  }
  // trunk: rises, leaning a little left, to the fork under the crown's right edge
  const fork = new THREE.Vector3(-0.08, 1.05, 0);
  tube(new THREE.Vector3(0.03, -1.0, 0), fork, 0.13, 0.085, 0.04);
  // hidden limbs carrying the crown
  for (const [x, y] of [[-0.55, 1.5], [-0.95, 1.2], [-0.35, 2.0]]) tube(fork, new THREE.Vector3(x, y, 0), 0.07, 0.03);
  // the bare limbs: out to the right and up
  for (const [a, len, r] of [[0.12, 0.6, 0.032], [0.38, 0.52, 0.03], [0.7, 0.42, 0.026]]) {
    const start = fork.clone().add(new THREE.Vector3(0, (rand() - 0.3) * 0.12, 0));
    limb(start, new THREE.Vector3(Math.cos(a), Math.sin(a), 0), len, r, 7);
  }
  // the blossom crown: lumpy clusters in a low, rounded mass on the left
  for (let i = 0; i < 150; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
    const x = -0.78 + Math.cos(a) * rr * 0.78, y = 1.55 + Math.sin(a) * rr * 0.92;
    const g = ellipsoid(0.13 + rand() * 0.12, 0.14 + rand() * 0.12, 0.13 + rand() * 0.15, 10, 8);
    g.translate(x + (y - 1.55) * 0.12, y, (rand() - 0.5) * 0.6); leaves.push(g);
  }
  const core = ellipsoid(0.5, 0.6, 0.25, 16, 12); core.translate(-0.78, 1.55, 0); leaves.push(core);   // (no gaps)
  group.add(mesh(mergeGeometries(branches)), mesh(mergeGeometries(leaves)));
  return group;
}

export function makePetals() {
  const rand = rng(594), g = ellipsoid(0.012, 0.027, 0.004, 6, 4);
  const petals = new THREE.InstancedMesh(g, ink, 170), dummy = new THREE.Object3D();
  const seeds = Array.from({ length: 170 }, () => [rand(), rand(), rand(), rand()]);
  petals.frustumCulled = false;
  petals.userData.update = (t) => {
    seeds.forEach(([x, y, z, phase], i) => {
      dummy.position.set(-6 + ((x * 15 + (t - 58) * (0.1 + phase * 0.12)) % 15),
        -0.5 + ((y * 5 - (t - 58) * 0.1 + 20) % 5), -7 + z * 10);
      dummy.rotation.set(t * 1.2 + phase * 6, t * 0.8 + x * 6, t + y * 6);
      dummy.scale.setScalar(0.45 + phase * 0.7); dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;
  };
  return petals;
}
