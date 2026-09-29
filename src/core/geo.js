import * as THREE from 'three';
import { ink } from './materials.js';

// ---------- static shapes ----------

/** Lathe around Y from a profile [[radius, y], ...]; optional x/z scaling for oval sections. */
export function lathe(profile, { segments = 24, sx = 1, sz = 1, radial = null, smooth = 4 } = {}) {
  let pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y));
  if (smooth > 1 && pts.length > 2) {
    // Resample the profile through a centripetal Catmull-Rom spline: silhouettes stay round in close-ups.
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)), false, 'centripetal');
    pts = c.getPoints((pts.length - 1) * smooth).map((p) => new THREE.Vector2(Math.max(p.x, 1e-4), p.y));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    if (radial) {
      const a = Math.atan2(x, z);
      const k = radial(a, pos.getY(i));
      x *= k; z *= k;
    }
    pos.setXYZ(i, x * sx, pos.getY(i), z * sz);
  }
  g.computeVertexNormals();
  return g;
}

/** Tapered capsule hanging from the origin along -Y (limb segment). */
export function limb(len, r0, r1, { segments = 16, sx = 1, sz = 1 } = {}) {
  const prof = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {           // top cap
    const a = (Math.PI / 2) * (1 - i / n);
    prof.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {           // bottom cap
    const a = (Math.PI / 2) * (i / n);
    prof.push([r1 * Math.cos(a), -len - r1 * Math.sin(a)]);
  }
  prof.reverse();
  return lathe(prof, { segments, sx, sz });
}

/** Hair shell: a sphere cap (top dome down to the brow) plus a back half-shell down to the nape. */
export function hairShell(R, { brow = 0.42, nape = 0.8, backWidth = 1.15 } = {}) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, 0, Math.PI * brow), ink);
  const back = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24, Math.PI * (1 - backWidth / 2), Math.PI * backWidth, 0, Math.PI * nape), ink);
  // phiStart measured from +X toward -Z in three.js; rotate so the half-shell faces the back (-Z)
  back.rotation.y = Math.PI / 2;
  dome.frustumCulled = back.frustumCulled = false;
  g.add(dome, back);
  return g;
}

/**
 * Closed loft through a list of rings (each an array of Vector3, all the same length), capped at both ends
 * with a fan to the ring's centroid. Used for shapes that are not surfaces of revolution (ribbon loops).
 */
export function loft(rings) {
  const n = rings[0].length, m = rings.length;
  const pos = [], idx = [];
  for (const ring of rings) for (const p of ring) pos.push(p.x, p.y, p.z);
  for (let i = 0; i < m - 1; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k, b = i * n + ((k + 1) % n), c = a + n, d = b + n;
      idx.push(a, c, b, b, c, d);
    }
  }
  for (const [ri, flip] of [[0, true], [m - 1, false]]) {
    const c = new THREE.Vector3();
    for (const p of rings[ri]) c.add(p);
    c.divideScalar(n);
    const ci = pos.length / 3;
    pos.push(c.x, c.y, c.z);
    for (let k = 0; k < n; k++) {
      const a = ri * n + k, b = ri * n + ((k + 1) % n);
      if (flip) idx.push(ci, a, b); else idx.push(ci, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function ellipsoid(rx, ry, rz, w = 24, h = 16) {
  const g = new THREE.SphereGeometry(1, w, h);
  g.scale(rx, ry, rz);
  return g;
}

export function mesh(geo, mat = ink) {
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

// ---------- dynamic strands (hair locks, bristles, ribbon tails) ----------

const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), _ref = new THREE.Vector3();

/**
 * A batch of tapered tubes that are re-shaped every frame from polylines.
 * Each strand has `seg + 1` points; radius tapers from r0 to r1 (0 = sharp tip, which gives the spiky
 * silhouette edges typical of the original's hair). `flat` squashes the cross-section (ribbons/locks).
 */
export class StrandBatch {
  constructor(specs, { radial = 5, material = ink } = {}) {
    this.specs = specs; // [{ seg, r0, r1, flat, profile?(u)->scale }]
    this.radial = radial;
    let vcount = 0, icount = 0;
    for (const s of specs) {
      s.vOffset = vcount;
      vcount += (s.seg + 1) * radial + 1;
      icount += s.seg * radial * 6 + radial * 3;
      s.points = Array.from({ length: s.seg + 1 }, () => new THREE.Vector3());
      s.up = new THREE.Vector3(0, 0, 1);
    }
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(vcount * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = new Uint32Array(icount);
    let k = 0;
    for (const s of specs) {
      const o = s.vOffset;
      for (let i = 0; i < s.seg; i++) {
        for (let j = 0; j < radial; j++) {
          const a = o + i * radial + j, b = o + i * radial + ((j + 1) % radial);
          const c = a + radial, d = b + radial;
          idx[k++] = a; idx[k++] = c; idx[k++] = b;
          idx[k++] = b; idx[k++] = c; idx[k++] = d;
        }
      }
      const tip = o + (s.seg + 1) * radial; // tip cap vertex
      const last = o + s.seg * radial;
      for (let j = 0; j < radial; j++) {
        idx[k++] = last + j; idx[k++] = tip; idx[k++] = last + ((j + 1) % radial);
      }
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
  }

  /** Call after filling each spec.points (in the mesh's local space). */
  commit() {
    const R = this.radial, P = this.pos;
    for (const s of this.specs) {
      const pts = s.points;
      let o = s.vOffset * 3;
      for (let i = 0; i <= s.seg; i++) {
        const u = i / s.seg;
        const p = pts[i];
        if (i < s.seg) _t.subVectors(pts[i + 1], p); else _t.subVectors(p, pts[i - 1]);
        _t.normalize();
        _ref.copy(s.up);
        if (Math.abs(_ref.dot(_t)) > 0.95) _ref.set(1, 0, 0);
        _n.crossVectors(_t, _ref).normalize();
        _b.crossVectors(_n, _t).normalize();
        let r = s.r0 + (s.r1 - s.r0) * u;
        if (s.profile) r *= s.profile(u);
        const f = s.flat ?? 1;
        for (let j = 0; j < R; j++) {
          const a = (j / R) * Math.PI * 2;
          const cx = Math.cos(a) * r, cy = Math.sin(a) * r * f;
          P[o++] = p.x + _n.x * cx + _b.x * cy;
          P[o++] = p.y + _n.y * cx + _b.y * cy;
          P[o++] = p.z + _n.z * cx + _b.z * cy;
        }
      }
      const tip = pts[s.seg];
      P[o++] = tip.x + _t.x * 0.002; P[o++] = tip.y + _t.y * 0.002; P[o++] = tip.z + _t.z * 0.002;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();   // only the behind-the-scenes shading uses them
  }
}

/**
 * Cloth strip (cape, scarf): a grid of W x H vertices, recomputed every frame by a user callback
 * fill(i, j, u, v, out) with u across [0,1], v along [0,1] (0 = attached edge).
 */
export class ClothStrip {
  constructor(W, H, fill, material = ink) {
    this.W = W; this.H = H; this.fill = fill;
    const g = new THREE.PlaneGeometry(1, 1, W - 1, H - 1);
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.v = new THREE.Vector3();
  }
  update(...args) {
    const pos = this.geometry.attributes.position;
    const { W, H } = this;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        this.fill(i, j, i / (W - 1), j / (H - 1), this.v, ...args);
        pos.setXYZ(j * W + i, this.v.x, this.v.y, this.v.z);
      }
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
