// Deterministic animation helpers. Everything in the film is a pure function of time `t` (seconds),
// which lets the offline renderer evaluate any instant (and sub-frame instants for motion blur).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => k * k * (3 - 2 * k);
export const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);

// Normalized progress of t inside [a, b], clamped.
export const prog = (t, a, b) => clamp((t - a) / (b - a));

export const Ease = {
  linear: (k) => k,
  in: (k) => k * k,
  out: (k) => 1 - (1 - k) * (1 - k),
  inOut: smooth,
  inOut5: smoother,
  in3: (k) => k * k * k,
  out3: (k) => 1 - Math.pow(1 - k, 3),
  inOut3: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outBack: (k) => { const c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  step: (k) => (k < 1 ? 0 : 1),
};

const easeFn = (e) => (typeof e === 'function' ? e : Ease[e || 'inOut']);

function mix(a, b, k) {
  if (typeof a === 'number') return lerp(a, b, k);
  if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], k));
  const o = {};
  for (const key of Object.keys(a)) o[key] = key in b ? mix(a[key], b[key], k) : a[key];
  for (const key of Object.keys(b)) if (!(key in a)) o[key] = b[key];
  return o;
}

/**
 * Keyframe track. keys: [[time, value, easeIntoThisKey?], ...] sorted by time.
 * Values may be numbers, arrays or (nested) plain objects of numbers.
 */
export function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        const k = t1 > t0 ? easeFn(e)((t - t0) / (t1 - t0)) : 1;
        return mix(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  };
}

/**
 * Catmull-Rom spline through keyed values (smooth velocity through keys, good for camera paths).
 * keys: [[time, value], ...]; value numbers or arrays.
 */
export function spline(keys) {
  const n = keys.length;
  const cr = (p0, p1, p2, p3, k) => {
    const k2 = k * k, k3 = k2 * k;
    return 0.5 * ((2 * p1) + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k2 + (-p0 + 3 * p1 - 3 * p2 + p3) * k3);
  };
  const at = (i) => keys[Math.max(0, Math.min(n - 1, i))][1];
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (i < n - 2 && t > keys[i + 1][0]) i++;
    const k = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
    const a = at(i - 1), b = at(i), c = at(i + 1), d = at(i + 2);
    if (typeof b === 'number') return cr(a, b, c, d, k);
    return b.map((_, j) => cr(a[j], b[j], c[j], d[j], k));
  };
}

// Numbers of a value (number, array or nested plain object) in a fixed order, and back.
function flatten(v, out = []) {
  if (typeof v === 'number') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => flatten(x, out));
  else if (v && typeof v === 'object') Object.keys(v).forEach((k) => flatten(v[k], out));
  return out;
}
function unflatten(like, arr, pos = { i: 0 }) {
  if (typeof like === 'number') return arr[pos.i++];
  if (Array.isArray(like)) return like.map((x) => unflatten(x, arr, pos));
  if (like && typeof like === 'object') {
    const o = {};
    for (const k of Object.keys(like)) o[k] = unflatten(like[k], arr, pos);
    return o;
  }
  return like;
}

/**
 * Motion curve through keyed poses, like an animator's auto-clamped curve: a cubic Hermite whose velocity at each
 * key comes from both neighbours (weighted by the key spacing), so the motion flows through the keys instead of
 * stopping at each one. Where a channel turns round or comes to rest the velocity there is zero, and it is capped
 * so no segment overshoots its keys (a fast move into a long hold settles instead of drifting past). Starts (unless
 * given a starting velocity v0, per second, of the values' shape) and ends at rest. keys: [[time, value], ...] with
 * values of one shape (numbers, arrays, nested objects).
 */
export function flow(keys, { v0 = null } = {}) {
  const n = keys.length, T = keys.map((k) => k[0]), P = keys.map((k) => flatten(k[1])), m = P[0].length;
  const M = P.map((_, i) => {
    const out = new Array(m).fill(0);
    if (i === 0 && v0) return flatten(v0);
    if (i === 0 || i === n - 1) return out;
    const d0 = T[i] - T[i - 1], d1 = T[i + 1] - T[i];
    for (let j = 0; j < m; j++) {
      const s0 = (P[i][j] - P[i - 1][j]) / d0, s1 = (P[i + 1][j] - P[i][j]) / d1;
      if (s0 * s1 <= 0) continue;
      const v = (d1 * s0 + d0 * s1) / (d0 + d1);
      out[j] = Math.sign(v) * Math.min(Math.abs(v), 3 * Math.min(Math.abs(s0), Math.abs(s1)));
    }
    return out;
  });
  return (t) => {
    if (t <= T[0]) return keys[0][1];
    if (t >= T[n - 1]) return keys[n - 1][1];
    let i = 0;
    while (t > T[i + 1]) i++;
    const D = T[i + 1] - T[i], u = (t - T[i]) / D, u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    const a = P[i], b = P[i + 1], ma = M[i], mb = M[i + 1];
    const out = new Array(m);
    for (let j = 0; j < m; j++) out[j] = h00 * a[j] + h10 * D * ma[j] + h01 * b[j] + h11 * D * mb[j];
    return unflatten(keys[u < 0.5 ? i : i + 1][1], out);
  };
}

// Cheap deterministic smooth noise (sum of incommensurate sines), range roughly [-1, 1].
export function wobble(t, seed = 0) {
  return (
    0.5 * Math.sin(t * 1.13 + seed * 12.9898) +
    0.3 * Math.sin(t * 2.31 + seed * 78.233) +
    0.2 * Math.sin(t * 4.07 + seed * 37.719)
  );
}

// Deterministic PRNG (mulberry32) for procedural modeling.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
