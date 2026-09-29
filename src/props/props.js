import * as THREE from 'three';
import { lathe, limb, ellipsoid, mesh, StrandBatch } from '../core/geo.js';
import { starMat } from '../core/materials.js';
import { rng } from '../core/timeline.js';

// Sakuya's throwing knife: grip at the origin, blade along local +Y.
export function makeKnife() {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.013, 0.025);
  shape.lineTo(-0.014, 0.18);
  shape.quadraticCurveTo(-0.012, 0.24, 0, 0.29);
  shape.quadraticCurveTo(0.012, 0.24, 0.014, 0.18);
  shape.lineTo(0.013, 0.025); shape.closePath();
  const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.007, bevelEnabled: false });
  blade.translate(0, 0, -0.0035);
  group.add(mesh(blade));
  const guard = mesh(new THREE.BoxGeometry(0.072, 0.014, 0.018)); guard.position.y = 0.024;
  const handle = mesh(lathe([[0.013, 0.02], [0.01, -0.02], [0.012, -0.055], [0.016, -0.063]], { segments: 8 }));
  group.add(guard, handle);
  return group;
}

/** Apple: lobed lathe body with dimples, curved stem. */
export function makeApple(R = 0.06) {
  const g = new THREE.Group();
  const prof = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;             // 0 bottom -> PI top
    const y = -Math.cos(a);
    let r = Math.sin(a) * (1 + 0.1 * Math.sin(a));
    const dimple = Math.exp(-Math.pow((a - Math.PI) / 0.35, 2)) * 0.28 + Math.exp(-Math.pow(a / 0.3, 2)) * 0.18;
    prof.push([r, y * (0.86 - dimple * (y > 0 ? 1 : -1) * 0.5) - (y > 0.95 ? 0.12 : 0)]);
  }
  const body = mesh(lathe(prof, { segments: 36, radial: (a, y) => 1 + 0.035 * Math.cos(a * 5) * (1 - Math.abs(y)) }));
  body.scale.setScalar(R);
  g.add(body);
  const stemCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, R * 0.6, 0), new THREE.Vector3(0.004, R * 1.05, 0), new THREE.Vector3(R * 0.22, R * 1.3, 0));
  g.add(mesh(new THREE.TubeGeometry(stemCurve, 8, R * 0.06, 6)));
  g.userData.R = R;
  g.userData.body = body;
  // Bites: each is a sphere {c, r} in the body's unit space. Vertices inside it slide toward the apple's centre
  // until they reach its surface, which carves a scoop, like a boolean subtraction. Recomputed from the rest
  // shape whenever the set changes.
  const pos = body.geometry.attributes.position;
  const rest = pos.array.slice();
  let applied = -1;
  const v = new THREE.Vector3();
  g.userData.setBites = (bites) => {
    if (bites.length === applied) return;
    applied = bites.length;
    pos.array.set(rest);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      for (const { c, r } of bites) {
        // teeth: the scoop's rim is scalloped
        const rr = r * (1 + 0.06 * Math.cos(Math.atan2(v.y - c.y, v.x - c.x) * 7));
        if (v.distanceTo(c) >= rr) continue;
        // smallest k with |k v - c| = rr: where the segment from the centre to v leaves the sphere
        const vv = v.lengthSq(), vc = v.dot(c), disc = vc * vc - vv * (c.lengthSq() - rr * rr);
        v.multiplyScalar(Math.max(0.05, (vc - Math.sqrt(Math.max(0, disc))) / vv));
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    body.geometry.computeVertexNormals();
  };
  return g;
}

/**
 * Apple core: what is left after the bites, an hourglass with a flat, lumpy top round the stem, a waist eaten
 * down to the core, and a flared bottom (the calyx end). The bitten flesh leaves ridges round the waist.
 * Origin at the stem's top (where the fingers pinch it), the core hanging along -Y.
 */
export function makeCore() {
  const g = new THREE.Group();
  const H = 0.1;
  const prof = [
    [0.001, -H], [0.02, -H + 0.001], [0.029, -H + 0.005], [0.03, -H + 0.013], [0.024, -H + 0.03],
    [0.017, -H + 0.048], [0.017, -H + 0.058], [0.022, -H + 0.074], [0.029, -H + 0.09], [0.03, -H + 0.097],
    [0.02, -H + 0.1], [0.001, -H + 0.098],
  ];
  const rand = rng(41);
  const bumps = Array.from({ length: 6 }, () => [rand() * Math.PI * 2, 0.5 + rand() * 0.8]);
  const body = mesh(lathe(prof, {
    segments: 40, smooth: 3,
    radial: (a, y) => {
      // bite ridges on the eaten waist; two lumps on the top rim
      const u = (y + H) / H;
      const waist = Math.exp(-Math.pow((u - 0.52) / 0.28, 2));
      let k = 1;
      for (const [p, s] of bumps) k += 0.05 * waist * Math.cos(a * 3 * s + p);
      k += 0.08 * Math.pow(Math.max(0, u - 0.85) / 0.15, 2) * Math.cos(a * 2);
      return k;
    },
  }));
  body.position.y = -0.014;
  g.add(body);
  const stem = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.016, 0), new THREE.Vector3(0.001, -0.004, 0), new THREE.Vector3(0.004, 0.006, 0));
  g.add(mesh(new THREE.TubeGeometry(stem, 6, 0.0032, 6)));
  g.userData.H = H + 0.02;
  return g;
}

/** Broom: slightly bent handle with knots, bound bristle bundle made of spiky strands. */
export function makeBroom() {
  const g = new THREE.Group();
  // Handle along -X (front of broom = -X, bristles toward +X).
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    pts.push(new THREE.Vector3(-1.05 + u * 1.39, Math.sin(u * Math.PI) * 0.015 - u * 0.01, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(curve, 40, 0.024, 10)));
  // knob at the front tip + a couple of knots
  const knob = mesh(ellipsoid(0.03, 0.026, 0.026)); knob.position.set(-1.06, 0, 0); g.add(knob);
  for (const x of [-0.7, -0.3]) { const k = mesh(ellipsoid(0.03, 0.022, 0.022)); k.position.set(x, 0.01, 0); g.add(k); }
  // binding
  const bind = mesh(lathe([[0.045, 0], [0.055, 0.02], [0.055, 0.07], [0.045, 0.09]], { segments: 16 }));
  bind.rotation.z = -Math.PI / 2; bind.position.set(0.28, -0.01, 0); g.add(bind);
  // twig stubs under the front of the handle
  for (const [x, a] of [[-0.86, 0.5], [-0.42, 0.65]]) {
    const twig = mesh(limb(0.07, 0.009, 0.004, { segments: 6 }));
    twig.position.set(x, -0.01, 0);
    twig.rotation.z = -a;
    g.add(twig);
  }
  // bristle core (solid, a big bushy bundle) + spiky straws that fray out past it
  const core = mesh(lathe([[0.045, 0], [0.1, 0.08], [0.17, 0.2], [0.2, 0.34], [0.18, 0.44], [0.09, 0.5]], { segments: 24, sz: 0.85 }));
  core.rotation.z = -Math.PI / 2; core.position.set(0.34, -0.02, 0); g.add(core);
  const rand = rng(21);
  const specs = [];
  for (let i = 0; i < 170; i++) {
    const a = rand() * Math.PI * 2, rr = Math.sqrt(rand());
    const len = 0.4 + rand() * 0.24;
    specs.push({ seg: 4, r0: 0.014, r1: 0, flat: 1, a, rr, len });
  }
  const bristles = new StrandBatch(specs, { radial: 4 });
  for (const s of specs) {
    const y = Math.cos(s.a) * s.rr, z = Math.sin(s.a) * s.rr;
    for (let k = 0; k <= s.seg; k++) {
      const u = k / s.seg;
      const spread = 0.05 + u * 0.22 + u * u * 0.05;
      s.points[k].set(0.36 + u * s.len, y * spread - 0.02 - u * u * 0.05, z * spread * 0.85);
    }
  }
  bristles.commit();
  g.add(bristles.mesh);
  return g;
}

/**
 * Castle (original design): a grand manor with a domed clock tower + lantern spire, a long gabled hall,
 * a slim bell tower and crenellated walls. Built at ~1 unit = 1 m but placed far away.
 */
export function makeCastle() {
  const g = new THREE.Group();
  const box = (w, h, d, x, y, z) => { const m = mesh(new THREE.BoxGeometry(w, h, d)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const cyl = (r0, r1, h, x, y, z, seg = 20) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, h, seg)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  // main hall
  box(64, 16, 22, 4, 0, 0);
  // central tower block + dome + lantern + spire
  box(18, 30, 18, -14, 0, 0);
  const dome = mesh(new THREE.SphereGeometry(9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)); dome.scale.y = 1.15; dome.position.set(-14, 30, 0); g.add(dome);
  cyl(2.2, 2.2, 5, -14, 39.5, 0, 12);
  const lanternCap = mesh(new THREE.SphereGeometry(2.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)); lanternCap.position.set(-14, 44.5, 0); g.add(lanternCap);
  cyl(0.5, 0.05, 6, -14, 46.5, 0, 8);
  // shoulder pavilions with small domes
  for (const x of [-27, -1]) {
    box(8, 22, 12, x, 0, 0);
    const d = mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)); d.position.set(x, 22, 0); g.add(d);
  }
  // hall crenellations
  for (let x = 4; x <= 34; x += 3) box(1.5, 1.6, 22.2, x, 16, 0);
  // gabled wing on the right
  box(10, 18, 20, 30, 0, 0);
  const roof = mesh(new THREE.CylinderGeometry(0.01, 7.5, 7, 4, 1)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.4); roof.position.set(30, 21.5, 0); g.add(roof);
  // slim bell tower at the far right
  box(4.5, 30, 4.5, 38.5, 0, 0);
  cyl(2.8, 0.05, 5, 38.5, 30, 0, 4).rotation.y = Math.PI / 4;
  // a few pinnacles
  for (const x of [-23, -5]) cyl(0.6, 0.05, 5, x, 22 + 3.5, 0, 6);
  // plinth / ground
  box(120, 3, 24, 0, -3, 0);
  return g;
}

/** Star field: sparse faint points on a large sphere shell (only the far half is ever seen). */
export function makeStars(count = 900, radius = 400, seed = 5) {
  const rand = rng(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = radius * (0.9 + rand() * 0.1);
    pos[i * 3] = s * Math.cos(a) * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = s * Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, starMat);
  p.frustumCulled = false;
  return p;
}

/**
 * Space dust: small flecks distributed in a box around the flight path. When the camera moves fast they
 * smear into the horizontal speed lines seen in the original (the accumulation motion blur does the rest).
 */
export function makeDust(count = 700, size = [80, 30, 40], seed = 9) {
  const rand = rng(seed);
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * size[0];
    pos[i * 3 + 1] = (rand() - 0.5) * size[1];
    pos[i * 3 + 2] = (rand() - 0.5) * size[2];
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, starMat);
  p.frustumCulled = false;
  return p;
}

/**
 * Teacup (Remilia's, 0:39 on): a flaring bowl on a small foot, a looped handle. Origin at the bottom of the foot,
 * the cup standing along +Y, the handle toward +X.
 */
export function makeCup() {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0.001, 0], [0.024, 0], [0.026, 0.003], [0.02, 0.008], [0.026, 0.012], [0.036, 0.022], [0.044, 0.036], [0.048, 0.05],
    [0.05, 0.058], [0.046, 0.059], [0.001, 0.056]], { segments: 40, smooth: 3 })));
  const handle = mesh(new THREE.TorusGeometry(0.016, 0.0042, 8, 24, Math.PI * 1.3));
  handle.position.set(0.049, 0.036, 0);
  handle.rotation.z = -Math.PI * 0.65;
  g.add(handle);
  g.scale.setScalar(1.25);
  return g;
}

// Thick curved ceramic pieces: sectors of the same bowl, with irregular fracture edges.
export function makeCupFragments() {
  const group = new THREE.Group();
  const profile = [[0.026, 0.008], [0.034, 0.022], [0.044, 0.036], [0.05, 0.058]];
  for (let i = 0; i < 6; i++) {
    const a0 = i * Math.PI / 3, points = [], indices = [], n = 10;
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row < profile.length; row++) {
        for (let k = 0; k <= n; k++) {
          const a = a0 + k / n * Math.PI / 3 + Math.sin(row * 2.5 + i) * 0.09;
          // Unequal fracture depths make rim crescents and pointed body shards instead of identical panels.
          const u = k / n;
          const cut = i === 0 ? 0.7 * (1 - u) ** 1.7 : i === 1 ? 0.58 + 0.12 * Math.sin(Math.PI * u)
            : i === 2 ? 0.72 : i === 3 ? 0.5 * u ** 2 : i === 4 ? 0.4 * (1 - u) : 0;
          const v = (cut + (1 - cut) * row / 3) * 3, lower = Math.min(2, Math.floor(v)), blend = v - lower;
          const r = THREE.MathUtils.lerp(profile[lower][0], profile[lower + 1][0], blend);
          const y = THREE.MathUtils.lerp(profile[lower][1], profile[lower + 1][1], blend);
          points.push((r - side * 0.003) * Math.sin(a), y, (r - side * 0.003) * Math.cos(a));
        }
      }
    }
    const layer = profile.length * (n + 1);
    for (let side = 0; side < 2; side++) for (let row = 0; row < 3; row++) for (let k = 0; k < n; k++) {
      const a = side * layer + row * (n + 1) + k, b = a + n + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    for (let row = 0; row < 3; row++) for (const k of [0, n]) {
      const a = row * (n + 1) + k, b = a + n + 1;
      indices.push(a, a + layer, b, b, a + layer, b + layer);
    }
    for (const row of [0, 3]) for (let k = 0; k < n; k++) {
      const a = row * (n + 1) + k;
      indices.push(a, a + 1, a + layer, a + 1, a + layer + 1, a + layer);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.setIndex(indices);
    geo.computeVertexNormals(); geo.computeBoundingBox();
    const center = geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-center.x, -center.y, -center.z);
    const part = mesh(geo); part.userData.center = center; group.add(part);
  }
  const base = mesh(lathe([[0.001, 0], [0.024, 0], [0.026, 0.004], [0.02, 0.009], [0.026, 0.013], [0.001, 0.012]]));
  base.userData.center = new THREE.Vector3(); group.add(base);
  const handle = mesh(new THREE.TorusGeometry(0.016, 0.0042, 8, 24, Math.PI * 1.3));
  handle.geometry.rotateZ(-Math.PI * 0.65);
  handle.userData.center = new THREE.Vector3(0.049, 0.036, 0); group.add(handle);
  return group;
}
