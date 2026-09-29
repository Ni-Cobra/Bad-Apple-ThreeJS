import * as THREE from 'three';
import { track, spline, flow, wobble, prog, clamp, lerp, smooth } from '../core/timeline.js';
import { setPalette } from '../core/materials.js';
import { ridePose } from './poses.js';

/*
 * Shot list for 0:00 – 1:10 (see docs/02-storyboard.md for the analysis of the original).
 * All positions are in one world: Reimu stands on a cliff at the origin facing +Z; the apple she throws
 * keeps rising above the cliff; Marisa flies along +Z above it and snatches it; the castle lies far ahead of her.
 * She eats the apple and drops the core, which falls to Patchouli's stage below her flight and turns into her.
 * Patchouli turns into Remilia on the same stage, who drops her teacup over the terrace's edge.
 */

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// behind the scenes: a character as a sphere to frame (around the chest, which sits above the body's middle)
const btsBody = (c, r) => ({ at: c.j.chest.getWorldPosition(new THREE.Vector3()).add(V(0, -0.3 * r, 0)), r });
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
const D2R = Math.PI / 180;

// Hidden cuts (motion-blur sub-samples never straddle them).
export const T_FLIP = 14.785;   // Marisa snatches the apple; the world inverts to white-on-black
export const T_SHATTER = 42.083333; // between frames 1262 and 1263 (first inverted drawing)
export const T_FLANDRE_FLIP = 56.183333; // first inverted original frame: 1686 (56.20 s)
export const T_GARDEN = 58.083333; // the white blade continues onto the black garden background
export const CUTS = [T_FLIP, T_SHATTER, T_FLANDRE_FLIP, T_GARDEN];

// ---------------------------------------------------------------- camera helpers
function camOrbit(cam, target, az, el, dist, fov = 30, roll = 0) {
  cam.position.set(
    target.x + Math.sin(az) * Math.cos(el) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(az) * Math.cos(el) * dist,
  );
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  if (roll) cam.rotateZ(roll);
  cam.fov = fov;
}
function camLook(cam, pos, target, fov = 30, roll = 0) {
  cam.position.copy(pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  if (roll) cam.rotateZ(roll);
  cam.fov = fov;
}

// ---------------------------------------------------------------- Reimu (apple girl) choreography
const W_BASE = {
  spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  shoulderL: [2, 0, 7], shoulderR: [2, 0, 7], elbowL: [-18, 0, 0], elbowR: [-12, 0, 0],
  wristL: [0, 0, 0], wristR: [0, 0, 0], gripL: 0.75, gripR: 0.35,
  hipL: [0, 0, 2], hipR: [0, 0, 2], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0],
};
const W = (o) => ({ ...W_BASE, ...o });

// Holding the apple in front of her chest, looking at it (profile shot): first low with the forearm level,
// then raised with the forearm upright, the sleeve hanging beneath it.
const W_HOLD_LOW = W({ shoulderL: [-14, 0, 12], elbowL: [-98, 0, 0], wristL: [0, 70, 10], gripL: 0.55, neck: [8, -4, 0], head: [12, -6, 0], chest: [-3, -4, 0] });
const W_HOLD = W({ shoulderL: [-30, 0, 12], elbowL: [-108, 0, 0], wristL: [0, 70, 10], gripL: 0.55, neck: [4, -4, 0], head: [4, -6, 0], chest: [-3, -4, 0] });
const W_HOLD_CLOSE = W({ shoulderL: [-34, 0, 14], elbowL: [-120, 0, 0], wristL: [0, 70, 10], gripL: 0.55, neck: [8, -4, 0], head: [12, -6, 0], chest: [2, -2, 0] });
const W_LOWER = W({ shoulderL: [10, 0, 10], elbowL: [-25, 0, 0], wristL: [0, 30, 0], gripL: 0.7, neck: [15, 5, 0], head: [28, 0, 0], chest: [8, 0, 0], spine: [4, 0, 0] });
const W_WIND = W({ shoulderL: [42, 0, 14], elbowL: [-15, 0, 0], wristL: [0, 30, 0], gripL: 0.7, neck: [0, -5, 0], head: [6, -8, 0], chest: [6, -18, 0], spine: [3, -8, 0] });
const W_THROW = W({ shoulderL: [-165, 0, 16], elbowL: [-8, 0, 0], wristL: [-20, 30, 0], gripL: 0.2, neck: [-12, 8, 0], head: [-18, 10, 0], chest: [-12, 16, 0], spine: [-6, 8, 0] });

// Up to the wind-up her arm runs on a motion curve (keys at the same times as the original's eased track, which
// the score prefers): no dead holds (she drifts on while holding the apple up) and the lowering carries on into
// the wind-up instead of stopping. The throw itself stays on eased keys: it must pass the release pose at
// T_RELEASE exactly, where the apple's path starts. (Keying the apple's measured height instead matched the
// height but not the silhouette: our apple is bigger, and mixing toward W_LOWER swings it away from her body
// where the original lowers it straight down.)
const wMix = (a, b, k) => track([[0, a], [1, b, 'linear']])(k);
const reimuArmFlow = flow([
  [0, W_BASE],
  [6.75, W_BASE],
  [7.3, W_HOLD_LOW],
  [7.9, wMix(W_HOLD_LOW, W_HOLD, 0.08)],
  [8.8, W_HOLD],
  [10.4, W_HOLD_CLOSE],
  [10.95, wMix(W_HOLD_CLOSE, W_LOWER, 0.03)],
  [11.35, W_LOWER],
  [11.72, W_WIND],
]);
const reimuThrow = track([
  [11.72, W_WIND],
  [12.02, W_THROW, 'linear'],
  [12.35, W_THROW, 'out'],
]);
const reimuPoseTrack = (t) => (t < 11.72 ? reimuArmFlow(t) : reimuThrow(t));

// The opening bop, measured on the original (the bow's height and the body's x, frame by frame): she dips
// once per beat (lowest at T_DIP + k * BEAT) and sways side to side over four beats, head lagging the hips.
const BEAT = 0.4209, T_DIP = 4.423, T_SWAY = 4.2;
const bopDip = (t) => 0.5 + 0.5 * Math.cos((2 * Math.PI * (t - T_DIP)) / BEAT);   // 1 at the bottom of a dip
const bopSway = (t) => Math.cos((2 * Math.PI * (t - T_SWAY)) / (4 * BEAT));      // +1 = hips to her left

// root yaw: idle turn while she bops, then settles for the profile shot
const reimuYaw = (t) => {
  if (t < 7) return wobble(t * 0.9, 1) * 12 + 3;
  return track([[7, wobble(7 * 0.9, 1) * 12 + 3], [7.4, 0, 'inOut']])(t);
};

// Apple release. As in the original, the thrown apple never falls: a fast launch that settles into a steady
// climb, drifting forward, until Marisa snatches it from above.
const T_RELEASE = 12.0;
const APPLE_V0 = V(0, 8.6, 3.3), APPLE_TAU = 0.35, APPLE_CLIMB = V(0, 1.3, 0.25);
let releasePos = null;   // captured lazily from the pose at T_RELEASE (deterministic)

function poseReimu(f, t) {
  const w = f.reimu;
  const p = reimuPoseTrack(t);
  const yaw = reimuYaw(t);
  const idle = clamp(1 - prog(t, 6.7, 7.2));
  // bop: knees give (the hips drop, feet stay planted), hips sway, the upper body follows 0.13 s late
  const drop = 0.022 * bopDip(t) * idle;
  const knee = Math.acos(1 - drop / 0.76) / D2R;
  const sx = 0.045 * idle, hipX = sx * bopSway(t);
  const lean = (-(sx * bopSway(t - 0.13) - hipX) / 0.5) / D2R;
  const chestSway = [wobble(t, 3) * 2 * idle, (p.chest[1] || 0) + wobble(t * 0.8, 4) * 7 * idle, wobble(t * 0.7, 5) * 2 * idle + lean];
  w.pose({
    ...p,
    root: { pos: [0, 0, 0], rot: [0, yaw, 0] },
    hipsPos: [hipX, -drop, 0],
    hipL: [p.hipL[0] - knee, p.hipL[1], p.hipL[2]], hipR: [p.hipR[0] - knee, p.hipR[1], p.hipR[2]],
    kneeL: [p.kneeL[0] + 2 * knee, 0, 0], kneeR: [p.kneeR[0] + 2 * knee, 0, 0],
    ankleL: [p.ankleL[0] - knee, 0, 0], ankleR: [p.ankleR[0] - knee, 0, 0],
    chest: [p.chest[0] + chestSway[0], chestSway[1], p.chest[2] + chestSway[2]],
    head: [p.head[0] + wobble(t * 1.1, 6) * 4 * idle + 3 * bopDip(t - 0.05) * idle, p.head[1] + wobble(t * 0.9, 7) * 8 * idle, p.head[2] + lean * 0.5],
    shoulderL: [p.shoulderL[0] + wobble(t, 8) * 5 * idle, p.shoulderL[1], p.shoulderL[2]],
    shoulderR: [p.shoulderR[0] + wobble(t, 9) * 5 * idle, p.shoulderR[1], p.shoulderR[2]],
  });
  w.j.head.position.y += 0.025;
  const throwing = prog(t, 11.7, 12.0);
  w.update(t, { wind: V(0, 0.4 * throwing, -0.3 * throwing), swayAmp: 1 + throwing * 2, skirtLag: [0, -yaw * D2R * 0.1, 0] });
}

function appleInReimuHand(f) {
  const hand = f.reimu.j.handL;
  hand.updateMatrixWorld(true);
  f.apple.position.copy(hand.localToWorld(_p.set(-0.045, -0.085, 0.0)));
  f.apple.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()));
  f.apple.rotateX(0.3);
}

function applePos(t, out = new THREE.Vector3()) {
  const s = Math.max(0, t - T_RELEASE);
  const k = APPLE_TAU * (1 - Math.exp(-s / APPLE_TAU));
  return out.copy(releasePos).addScaledVector(APPLE_V0, k).addScaledVector(APPLE_CLIMB, s);
}

function ensureRelease(f) {
  if (releasePos) return;
  const keep = [f.apple.position.clone(), f.apple.quaternion.clone()];
  poseReimu(f, T_RELEASE);
  appleInReimuHand(f);
  releasePos = f.apple.position.clone();
  f.apple.position.copy(keep[0]); f.apple.quaternion.copy(keep[1]);
}

// ---------------------------------------------------------------- Marisa (rider) choreography
const RIDE = ridePose();
const R_BASE = { ...RIDE, gripL: 0.9, gripR: 0.9, shoulderL: [-45, 0, 10], shoulderR: [-45, 0, 10], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0], wristL: [0, 0, 0], wristR: [0, 0, 0] };
const R = (o) => ({ ...R_BASE, ...o });
// The snatch: she leans far down to her left (the camera side), the apple right under her shoulder. Her hips
// turn back from side-saddle and her legs trail behind her in the wind, out of the close-up's frame.
const TUCK = { hips: [0, 20, 0], spine: [0, -12, 0], hipL: [55, 0, 6], hipR: [62, 0, -2], kneeL: [40, 0, 0], kneeR: [55, 0, 0], ankleL: [20, 0, 0], ankleR: [20, 0, 0] };
const R_REACH = R({ ...TUCK, shoulderL: [-10, 0, 25], elbowL: [-5, 0, 0], wristL: [0, 0, 0], gripL: 0.6, chest: [24, 10, -42], neck: [0, 0, 12], head: [25, 10, 0] });
const R_DANGLE = R({ ...TUCK, shoulderL: [-8, 0, 30], elbowL: [-4, 0, 0], wristL: [0, 0, 0], gripL: 0.55, chest: [22, 6, -45], neck: [0, 0, 14], head: [22, 8, 0] });
// From the snatch on, her left arm is driven by IK (poseAppleArm), so these poses leave it out.
const R_BRING = R({ gripL: 0.55, chest: [-6, 8, 0], head: [-20, 10, 0], neck: [-8, 0, 0] });
const R_SHOW = R({ gripL: 0.55, chest: [16, 6, 0], head: [-4, 12, 0] });
const R_CRUISE = R({ gripL: 0.55, chest: [34, 0, 0], neck: [-6, 0, 0], head: [-20, 0, 0] });
const R_BOOST = R({ gripL: 0.55, spine: [0, -62, 0], chest: [36, 0, 0], head: [-18, 0, 0] });
// Holding the core out to her left side by the stem (pinched), looking at it; the hand droops from the wrist.
const R_OUT = R({ gripL: 0.2, wristL: [95, -45, 0], chest: [24, 12, 6], neck: [0, 18, 0], head: [8, 40, 4] });
const R_LETGO = R({ ...R_OUT, gripL: 0.05, spreadL: 1 });

// Her poses from the snatch on: the catch and the let-go stay on eased keys (exact contacts at T_FLIP and T_LETGO);
// in between a motion curve, with the same key times, where a held pose drifts a little toward the next one
// instead of freezing (her left arm is placed by IK throughout, so this moves her torso and head).
const rMix = (a, b, k) => track([[0, a], [1, b, 'linear']])(k);
const riderCatch = track([
  [14.4, R_REACH],
  [14.8, R_DANGLE, 'out'],
  [15.3, R_DANGLE],
]);
const riderFlow = flow([
  [15.3, R_DANGLE],
  [16.0, R_BRING],
  [16.8, rMix(R_BRING, R_SHOW, 0.05)],
  [17.6, R_SHOW],
  [18.6, R_CRUISE],
  [21.1, rMix(R_CRUISE, R_BOOST, 0.03)],
  [21.6, R_BOOST],
  [22.4, R_CRUISE],
  [24.55, rMix(R_CRUISE, R_OUT, 0.04)],
  [25.15, R_OUT],
  [26.42, R_OUT],
]);
const riderLetGo = track([
  [26.42, R_OUT],
  [26.48, R_LETGO, 'out'],
]);
const riderPoseTrack = (t) => (t < 15.3 ? riderCatch(t) : t < T_LETGO ? riderFlow(t) : riderLetGo(t));

// Flight: along world +Z (right to left in the apple shot); speed boosts between 21.1 and 22.3 (the
// speed-line moment).
// After dropping the core she speeds off (and climbs, see poseRider), out of the falling camera's view.
const speed = (t) => 4 + 30 * Math.pow(Math.sin(Math.PI * prog(t, 21.1, 22.4)), 2) + 10 * smooth(prog(t, 26.55, 26.9));
let _distCache = null;
function flightDist(t) {
  // integrate speed from T_FLIP (fixed step, cached table → deterministic)
  if (!_distCache) {
    _distCache = [];
    let d = 0;
    for (let i = 0; i <= 2000; i++) {
      _distCache.push(d);
      const tt = T_FLIP + i * 0.01;
      d += speed(tt + 0.005) * 0.01;
    }
  }
  const x = (t - T_FLIP) / 0.01;
  if (x <= 0) return speed(T_FLIP) * (t - T_FLIP);
  const i = Math.min(1999, Math.floor(x));
  return lerp(_distCache[i], _distCache[i + 1], x - i);
}
let CATCH = null;   // world point where the apple is caught (the rising apple's position at T_FLIP)
// Rider root relative to the catch point at T_FLIP: the broom passes 0.24 m above the apple (lower brings the
// broom into the top of the close-up, as in the original, but also more of her body; this scores better), which
// hangs under
// her left shoulder (0.19 m to her left, 0.1 m ahead) as she leans down to snatch it. Seen from the camera,
// her body is behind the apple, not between them.
const RIDER_OFF = V(-0.19, 0.24 - 0.62, -0.1);

// Bites: at each time her hand brings the apple to her mouth; the bite shows on the apple afterwards.
const BITES = [16.95, 19.7, 21.0];
const biteAmt = (t) => Math.max(0, ...BITES.map((b) => smooth(prog(t, b - 0.28, b - 0.04)) * (1 - smooth(prog(t, b + 0.1, b + 0.38)))));
const MOUTH = V(0, 0.035, 0.105);        // head space
const HOLD_FAR = V(0, -0.03, 0.31);       // well in front of her face, at mouth level, before the first bite (head space)
const HOLD = V(0, -0.05, 0.23);          // apple held in front of and below the mouth, a gap from her face (head space)
const BITE_AT = V(0, 0.02, 0.135);       // apple pressed into the mouth, head space
let biteMarks = null;                    // per bite: sphere centre in the apple body's space (solved lazily)

// After the last bite she eats the apple down to the core off screen (seen from behind), holds the core out to
// her left side by the stem, and drops it.
const T_CORE = 23.0;                      // the apple becomes the core (hidden from the camera behind her)
const T_OUT0 = 24.55, T_OUT1 = 25.15;     // she holds it out to her left side
export const T_DROP = 26.42;              // and lets go
const T_LETGO = T_DROP;                   // her fingers open
let wristDrop = null;                     // her wrist at T_LETGO, rider space (solved once)
const PINCH_OUT = V(0.53, 0.99, 0.16);    // rider space: the pinch point with her arm held out
const PALM = V(0, -0.13, 0);              // hand space: the apple's centre in her palm

function poseRider(f, t, { arm = true } = {}) {
  const v = f.marisa;
  if (t > T_LETGO && !wristDrop) {
    // one-time solve: where her wrist is when she starts to let go (rider space); from then on the arm holds
    // the wrist there, lifting it, rather than chasing the pinch as her fingers open
    wristDrop = V(0, 0, 0);
    poseRider(f, T_LETGO);
    wristDrop = f.rider.worldToLocal(v.j.wristL.getWorldPosition(new THREE.Vector3()));
  }
  f.rider.visible = v.root.visible = f.broom.visible = true;
  const d = flightDist(t);
  const bob = (Math.sin(t * 2.2) * 0.05 + Math.sin(t * 1.3 + 1) * 0.03) * prog(t, T_FLIP, T_FLIP + 1.2);
  const climb = 1.2 * smooth(prog(t, 26.55, 26.85));   // she swoops up as she lets go
  f.rider.position.set(CATCH.x + RIDER_OFF.x, CATCH.y + RIDER_OFF.y + bob + climb, CATCH.z + RIDER_OFF.z + d);
  const bank = track([[21.0, 0], [21.6, -12, 'inOut'], [22.4, 6, 'inOut'], [23.2, 0, 'inOut']])(t);
  const pitch = track([[21.0, 0], [21.6, 8, 'inOut'], [22.4, -4, 'inOut'], [23, 0, 'inOut']])(t);
  f.rider.rotation.set(0, 0, 0);
  f.rider.rotateY(track([[21.3, 0], [22.4, 0.18, 'inOut']])(t));
  f.rider.rotateX(pitch * D2R);
  f.rider.rotateZ(bank * D2R);
  f.broom.position.set(0, 0.62, 0);
  const p = riderPoseTrack(t);
  const bite = biteAmt(t);
  v.pose({ ...p, root: { pos: [0, 0, 0], rot: [0, 0, 0] }, head: [p.head[0] + 10 * bite, p.head[1], p.head[2]] });
  if (arm) poseAppleArm(f, t, bite);
  const wind = _p.set(0, 0, -1).multiplyScalar(0.8 + speed(t) * 0.05);  // air flows toward -Z (she flies +Z)
  v.update(t, { wind: wind.clone(), flutter: 1 });
  const catchTrail = smooth(prog(t, 14.4, 14.7)) * (1 - smooth(prog(t, 15.25, 15.65)));
  v.skirt.rotateX(-0.25 * catchTrail);
  f.rider.updateMatrixWorld(true);
}

/**
 * Put what she holds in her left hand at world point P by IK, weight w; `held(f)` returns the held point's world
 * position for the current pose (the apple's centre, or the pinch point). Six passes converge to about 1 mm.
 */
function reachHeld(f, P, w, held, pole) {
  const v = f.marisa, sh = v.j.shoulderL, el = v.j.elbowL;
  const q0 = sh.quaternion.clone(), q1 = el.quaternion.clone();
  const target = P.clone();
  for (let i = 0; i < 6; i++) {
    sh.quaternion.copy(q0); el.quaternion.copy(q1);
    v.reach('L', target, pole, 1);
    const wrist = v.j.wristL.getWorldPosition(new THREE.Vector3());
    target.copy(P).sub(held(f)).add(wrist);
  }
  sh.quaternion.copy(q0); el.quaternion.copy(q1);
  v.reach('L', target, pole, w);
}

// The held point: the apple's centre in her palm, becoming the pinch between thumb and index as she takes the
// core by the stem (k = 0 → 1).
function heldPoint(f, k) {
  const hand = f.marisa.j.handL;
  hand.updateMatrixWorld(true);
  const palm = hand.localToWorld(PALM.clone());
  return k > 0 ? palm.lerp(f.marisa.pinchPoint('L', _q), k) : palm;
}

// The apple arm (her left, on the camera side of the side shots; the right hand keeps the broom), driven by IK
// from the snatch to the end: snatch the rising apple at T_FLIP, hold it dangling, bring it straight to her
// mouth (no lift: she goes for a bite), then hold it there and bring it in for each bite.
function poseAppleArm(f, t, bite) {
  const v = f.marisa;
  f.rider.updateMatrixWorld(true);
  const w = smooth(prog(t, 14.45, 14.65));
  if (w <= 0) return;
  let P;
  if (t < T_FLIP) {
    const u = smooth(clamp((T_FLIP - t) / 0.25));
    P = applePos(t, new THREE.Vector3()).add(V(0, 0.1 * u, 0.06 * u));    // hand closes in from above
  } else {
    const caught = riderPoint(f, CATCH_LOCAL.x, CATCH_LOCAL.y, CATCH_LOCAL.z, new THREE.Vector3());
    const off = HOLD_FAR.clone().lerp(HOLD, smooth(prog(t, 16.3, 16.75))).lerp(BITE_AT, bite);
    const mouth = v.j.head.localToWorld(off);
    // from where she caught it up to her mouth, on an arc that swings out to her left, clear of the broom
    const k = smooth(prog(t, 15.35, 16.1));
    const mid = caught.clone().lerp(mouth, 0.5).add(riderPoint(f, 0.16, 0, 0.08, new THREE.Vector3()).sub(f.rider.position));
    P = caught.multiplyScalar((1 - k) * (1 - k)).addScaledVector(mid, 2 * k * (1 - k)).addScaledVector(mouth, k * k);
  }
  // holding the core out to her left side, then letting go (the arm stays out as she flies on)
  const k = smooth(prog(t, T_OUT0, T_OUT1));
  if (k > 0) P.lerp(riderPoint(f, PINCH_OUT.x, PINCH_OUT.y, PINCH_OUT.z, new THREE.Vector3()), k);
  const pole = riderPoint(f, 0.9, 0.7, -0.4, new THREE.Vector3()).lerp(riderPoint(f, 0.4, 0.0, -0.1, new THREE.Vector3()), k);
  if (t > T_LETGO && wristDrop.lengthSq() > 0) {
    const lift = smooth(prog(t, T_DROP + 0.04, T_DROP + 0.3));
    const W = riderPoint(f, wristDrop.x, wristDrop.y + 0.25 * lift, wristDrop.z + 0.1 * lift, new THREE.Vector3());
    reachHeld(f, W, w, (ff) => ff.marisa.j.wristL.getWorldPosition(new THREE.Vector3()), pole);
    return;
  }
  reachHeld(f, P, w, (ff) => heldPoint(ff, k), pole);
}
let CATCH_LOCAL = null;    // the catch point in rider space

// The core in her hand: first where the apple was (in her palm), then hanging from the pinch by its stem,
// swinging a little like a pendulum and turning slowly.
function coreInRiderHand(f, t) {
  const k = smooth(prog(t, T_OUT0, T_OUT1));
  appleInRiderHand(f);
  const qPalm = f.apple.quaternion.clone();
  const pPalm = f.apple.position.clone().add(V(0, 0.05, 0).applyQuaternion(qPalm));   // the core's middle in the palm
  const pin = f.marisa.pinchPoint('L', new THREE.Vector3());
  const qHang = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12 * Math.sin(t * 5.1), 0.6 + t * 0.9, 0.1 * Math.sin(t * 4.3 + 1), 'YXZ'));
  f.core.position.copy(pPalm.lerp(pin, k));
  f.core.quaternion.copy(qPalm.slerp(qHang, k));
  f.core.scale.setScalar(1);
}

function appleInRiderHand(f) {
  const hand = f.marisa.j.handL;
  hand.updateMatrixWorld(true);
  f.apple.position.copy(hand.localToWorld(_p.copy(PALM)));
  f.apple.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()));
  f.apple.rotateZ(Math.PI);
  f.apple.rotateX(0.2);
}

function ensureCatch(f) {
  if (CATCH) return;
  CATCH = applePos(T_FLIP, new THREE.Vector3());
  CATCH_LOCAL = RIDER_OFF.clone().negate();     // rider at T_FLIP sits at CATCH + RIDER_OFF, unrotated
}

// Where each bite lands on the apple: pose the scene at the moment of the bite and take the mouth's position in
// the apple body's space. Solved once, like the release and the castle.
function ensureBites(f) {
  if (biteMarks) return;
  biteMarks = [];
  for (const tb of BITES) {
    poseRider(f, tb);
    appleInRiderHand(f);
    f.apple.updateMatrixWorld(true);
    const body = f.apple.userData.body;
    const m = body.worldToLocal(f.marisa.j.head.localToWorld(MOUTH.clone()));
    biteMarks.push({ t: tb, c: m.normalize().multiplyScalar(1.55), r: 0.95 });   // a bite is about as wide as the apple
  }
}

let craneY = null;
let nightPath = null;

// The apple's path on screen and its size, measured on the original every 0.1 s from 12.2 s (the blob's
// centroid as frame fractions, and its area as a fraction of the frame). The camera is solved from them.
const APPLE_SCREEN = spline([
  [12.2, [0.424, 0.024]], [12.3, [0.461, 0.089]], [12.4, [0.483, 0.2]], [12.5, [0.502, 0.317]], [12.6, [0.519, 0.429]],
  [12.7, [0.536, 0.523]], [12.8, [0.544, 0.598]], [12.9, [0.55, 0.662]], [13.0, [0.552, 0.705]], [13.1, [0.551, 0.703]],
  [13.2, [0.548, 0.668]], [13.3, [0.544, 0.609]], [13.4, [0.538, 0.538]], [13.5, [0.531, 0.47]], [13.6, [0.524, 0.42]],
  [13.7, [0.521, 0.407]], [13.8, [0.526, 0.416]], [13.9, [0.537, 0.435]], [14.0, [0.551, 0.459]], [14.1, [0.564, 0.485]],
  [14.2, [0.573, 0.512]], [14.3, [0.579, 0.536]], [14.4, [0.579, 0.547]], [14.5, [0.567, 0.55]], [14.6, [0.561, 0.555]],
  [14.8, [0.56, 0.556]],
]);
const APPLE_AREA = spline([[12.6, 0.0573], [13.0, 0.0676], [13.5, 0.0765], [14.0, 0.0877], [14.3, 0.0952], [14.6, 0.091], [14.8, 0.091]]);
const APPLE_SIL = 0.0105;          // the apple's silhouette area, m² (about pi x 1.1R x 0.86R)
const FRAME_K = 2 * Math.tan(15 * D2R) * 2 * Math.tan(15 * D2R) * (4 / 3);   // frame area / d² at fov 30, 4:3

// The camera of the apple shot, also the start of the night shot (the palette flips on the catch, framing
// unchanged). It looks along -X. First it cranes after the thrown apple and lags (the apple leaves the top of
// the frame); from 12.2 s it is solved so the apple sits exactly where the original has it, at the distance its
// measured size implies.
function appleCam(f, t) {
  const ay = applePos(t, new THREE.Vector3());
  craneY = craneY || flow([[12.0, 1.3], [12.12, applePos(12.12, _q).y - 0.5], [12.2, applePos(12.2, _q).y - 0.36],
    [12.35, applePos(12.35, _q).y - 0.12], [12.5, applePos(12.5, _q).y - 0.02], [12.65, applePos(12.65, _q).y]]);
  const lock = smooth(prog(t, 12.0, 12.25));
  const tz = lerp(0.46, ay.z, lock);
  const bx = lerp(0, releasePos.x, lock);   // continuous with the previous shot's orbit centre (x = 0)
  const dist0 = lerp(1.1, 0.82, lock);
  // it starts where the profile shot's orbit ends (azimuth PI / 2 + 0.06, elevation 0.02: a little off its axis)
  const az0 = Math.PI / 2 + 0.06, el0 = 0.02, off = dist0 * (1 - lock);
  const crane = { pos: V(bx + dist0, craneY(t) + Math.sin(el0) * off, tz + Math.cos(az0) * off), tgt: V(bx, craneY(t), tz) };
  const m = smooth(prog(t, 12.2, 12.32));
  if (m <= 0) return crane;
  const d = Math.sqrt(APPLE_SIL / (FRAME_K * APPLE_AREA(Math.max(t, 12.6))));
  const [cx, cy] = APPLE_SCREEN(t);
  const hh = d * Math.tan(15 * D2R), hw = hh * (4 / 3);
  // the apple projects at (cx, cy): the target sits off it by the matching amount in the view plane
  // (looking along -X, screen right is -Z and screen up is +Y)
  const tgt = V(ay.x, ay.y - (1 - 2 * cy) * hh, ay.z + (2 * cx - 1) * hw);
  const solved = { pos: tgt.clone().add(V(d, 0, 0)), tgt };
  return { pos: crane.pos.lerp(solved.pos, m), tgt: crane.tgt.lerp(solved.tgt, m) };
}

// rider-local → world helpers for camera paths
function riderPoint(f, x, y, z, out = new THREE.Vector3()) {
  return f.rider.localToWorld(out.set(x, y, z));
}

// The castle is static in the world. Its position is solved once so that, seen from the camera at
// t = 23.3, it sits in the lower-left of the frame like in the original (the rider then flies toward it).
let castleSolved = false;
function placeCastle(f) {
  if (castleSolved) return;
  castleSolved = true;
  const shot = SHOTS.find((s) => s.name === 'night-flight');
  const keep = f.castle.visible;
  f.castle.visible = false;
  shot.apply(f, 23.3);                   // poses camera for t = 23.3 (recursion guarded by castleSolved)
  f.camera.updateProjectionMatrix(); f.camera.updateMatrixWorld();
  const D = 260;
  const ndc = V(-0.62, -1.02, 0.5).unproject(f.camera).sub(f.camera.position).normalize();
  f.castle.position.copy(f.camera.position).addScaledVector(ndc, D);
  // face the camera roughly (so the long facade is seen), slightly turned
  const toCam = f.camera.position.clone().sub(f.castle.position);
  f.castle.rotation.set(0, Math.atan2(toCam.x, toCam.z) + 0.25, 0);
  f.castle.visible = keep;
}


// ---------------------------------------------------------------- the falling core (T_DROP – T_MORPH)
// After she lets go, the camera drops with the core. Its track on screen was measured on the original frame by
// frame (tools/py/blob.py): centroid, area and principal-axis angle. The camera keeps the orientation it had in
// the close-up and is solved so the core's centre lands on the measured point, at the distance its measured size
// implies. The core tumbles counter-clockwise on screen (450-550°/s) all the way down; from 27.95 s it swells to
// the size of a person, and at T_MORPH it turns into Patchouli, who keeps the roll until she stands.
export const T_WIPE0 = 27.245, T_WIPE1 = 27.395;
export const T_MORPH = 28.43;
// The wipe: a straight edge at 30° (u = 1.294 v - k, frame fractions, v down) sweeping from the lower-left corner
// to the upper-right one, accelerating; measured on the drawings at 27.267, 27.333 and 27.367 s.
const WIPE_K = spline([[T_WIPE0, 1.36], [27.283, 0.6], [27.333, 0.115], [27.367, -0.85], [T_WIPE1, -1.12]]);
// centroid (frame fractions, y down); 27.6-28.1 s the core is partly above the frame: estimated from its visible
// part. The first key is where it hangs in the close-up at T_DROP (solved).
const CORE_SCREEN_KEYS = [
  [26.48, [0.47, 0.88]], [26.533, [0.456, 0.841]], [26.567, [0.424, 0.788]], [26.633, [0.408, 0.762]], [26.667, [0.402, 0.686]], [26.733, [0.401, 0.647]],
  [26.767, [0.401, 0.582]], [26.833, [0.401, 0.552]], [26.867, [0.389, 0.499]], [26.933, [0.382, 0.479]],
  [26.967, [0.392, 0.441]], [27.033, [0.399, 0.421]], [27.067, [0.413, 0.385]], [27.133, [0.42, 0.368]],
  [27.167, [0.436, 0.332]], [27.233, [0.444, 0.312]], [27.434, [0.517, 0.186]], [27.467, [0.531, 0.174]],
  [27.534, [0.563, 0.135]], [27.6, [0.578, 0.1]], [27.7, [0.6, 0.09]], [27.8, [0.68, 0.03]], [27.867, [0.671, 0.03]],
  [27.95, [0.63, 0.08]], [28.034, [0.71, 0.14]], [28.067, [0.699, 0.2]], [28.134, [0.695, 0.603]],
  [28.2, [0.69, 0.7]], [28.234, [0.674, 0.64]], [28.267, [0.649, 0.548]], [28.334, [0.572, 0.444]],
  [28.367, [0.546, 0.442]], [28.434, [0.518, 0.438]], [28.467, [0.498, 0.434]],
];
// silhouette area (fraction of the frame): sets the camera distance
const CORE_AREA_KEYS = [[26.667, 0.02], [27.2, 0.0185], [27.434, 0.022], [27.534, 0.024], [27.95, 0.024],
  [28.034, 0.05], [28.134, 0.08], [28.3, 0.08], [28.467, 0.08]];
// the stem end's direction on screen (degrees, counter-clockwise from screen right, unwrapped), smoothed
export const ROLL = spline([[26.42, 90], [26.55, 102], [26.667, 127], [26.833, 183], [26.967, 269], [27.133, 317],
  [27.233, 371], [27.434, 472], [27.567, 553], [27.734, 625], [27.967, 761], [28.134, 914], [28.267, 1004],
  [28.434, 1075], [28.567, 1113], [28.734, 1139], [28.867, 1157], [29.034, 1168.5], [29.3, 1170]]);
export const CORE_BIG = 14.7;              // the core's size when it turns into her (her height lying down)
const coreScale = track([[27.93, 1], [T_MORPH - 0.02, CORE_BIG, 'inOut']]);
const CORE_MID = 0.064;                    // core space: its middle is this far below the stem's top
const CORE_K = 0.114;                      // distance x sqrt(area) for the core at scale 1 (0.83 m at 1.9% of the frame)
let fall = null;                           // solved once from the close-up at T_DROP

function ensureFall(f) {
  if (fall) return;
  const night = SHOTS.find((s) => s.name === 'night-flight');
  const t0 = T_DROP - 1e-4;
  night.apply(f, t0 - 0.02);
  const ra = f.rider.position.clone();
  night.apply(f, t0);
  // she flicks it down and a little outward, to her left, as she lets go
  const v0 = f.rider.position.clone().sub(ra).divideScalar(0.02).add(V(1.5, -0.7, 0).applyQuaternion(f.rider.quaternion));
  f.camera.updateMatrixWorld(); f.camera.updateProjectionMatrix();
  const q = f.camera.quaternion.clone();
  const R = V(1, 0, 0).applyQuaternion(q), U = V(0, 1, 0).applyQuaternion(q), F = V(0, 0, -1).applyQuaternion(q);
  const stem = V(0, 1, 0).applyQuaternion(f.core.quaternion);
  const C = f.core.position.clone().addScaledVector(stem, -CORE_MID);
  const rel = C.clone().sub(f.camera.position);
  const d0 = rel.dot(F);
  const hh = d0 * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  const x0 = [(rel.dot(R) / hw + 1) / 2, (1 - rel.dot(U) / hh) / 2];
  fall = {
    q, R, U, F, C0: C, v0,
    screen: spline([[T_DROP, x0], ...CORE_SCREEN_KEYS]),
    area: spline([[T_DROP, (CORE_K / d0) ** 2], ...CORE_AREA_KEYS]),
  };
}

// The core's middle: it keeps the flight's speed plus her flick (slowing in the air) and falls, gravity against
// drag (terminal speed 7 m/s).
function coreCentre(t, out = new THREE.Vector3()) {
  const s = Math.max(0, t - T_DROP), tau = 0.7, vt = 7, th = 0.6;
  out.copy(fall.C0).addScaledVector(fall.v0, th * (1 - Math.exp(-s / th)));
  out.y -= vt * (s - tau * (1 - Math.exp(-s / tau)));
  return out;
}

// The core rolling about the camera axis: its stem points along ROLL(t) on screen.
function poseFallingCore(f, t) {
  const S = coreScale(t);
  const th = ROLL(t) * D2R;
  const stem = fall.R.clone().multiplyScalar(Math.cos(th)).addScaledVector(fall.U, Math.sin(th));
  const z = fall.F.clone().negate(), x = new THREE.Vector3().crossVectors(stem, z);
  f.core.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, stem, z));
  f.core.rotateY(t * 2.3);             // a slow spin about its own axis
  f.core.scale.setScalar(S);
  const C = coreCentre(t);
  f.core.position.copy(C).addScaledVector(stem, CORE_MID * S);
  return C;
}

// The tracking camera: fixed orientation; the point C lands on screen at `xy`, from distance d.
function trackCam(f, C, xy, d) {
  const hh = d * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  const T = C.clone().addScaledVector(fall.R, -(2 * xy[0] - 1) * hw).addScaledVector(fall.U, -(1 - 2 * xy[1]) * hh);
  f.camera.position.copy(T).addScaledVector(fall.F, -d);
  f.camera.quaternion.copy(fall.q);
  f.camera.fov = 30;
}


// ---------------------------------------------------------------- Patchouli (T_MORPH – 35)
// The core turns into her: it shrinks inside her while she grows out of it, so the silhouette morphs, as in the
// original. She keeps the core's roll (ROLL, measured) and lands on her feet at T_LAND, then stands facing the
// screen's right with a book against her chest, turns toward the screen's left sweeping her right arm out,
// reaches forward and raises a finger (the close-up from 34 s).
const T_LAND = 28.95;
const PAT_SCALE = 0.94;
// her hips (her silhouette's centre) on screen while she rights herself, measured like the core (tools/py/blob.py)
const PAT_SCREEN = spline([[T_MORPH, [0.518, 0.438]], [28.467, [0.498, 0.434]], [28.534, [0.447, 0.448]], [28.567, [0.421, 0.463]],
  [28.634, [0.378, 0.488]], [28.667, [0.36, 0.498]], [28.734, [0.326, 0.528]], [28.767, [0.311, 0.546]], [28.834, [0.286, 0.581]],
  [28.867, [0.275, 0.597]], [28.934, [0.256, 0.624]], [28.967, [0.245, 0.625]], [29.034, [0.227, 0.62]], [29.067, [0.221, 0.62]]]);
let stage = null;                          // her ground point and the stage's frame, solved once from the fall

function ensureStage(f) {
  if (stage) return;
  const flat = (v) => v.clone().setY(0).normalize();
  const Fh = flat(fall.F), Rh = flat(fall.R);
  const hipH = f.patchouli.o.legLen * PAT_SCALE;
  const G = coreCentre(T_LAND);
  G.y -= hipH;
  f.stage.position.copy(G);
  // stage space: +Z is the screen's right (she faces it at first), +X is away from the camera
  f.stage.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Fh, V(0, 1, 0), Rh));
  f.stage.updateMatrixWorld(true);
  const C0 = coreCentre(T_MORPH), C1 = coreCentre(T_MORPH + 0.01);
  stage = { G, hipH, C0, v0: C1.sub(C0).divideScalar(0.01), d0: CORE_K * CORE_BIG / Math.sqrt(0.08) };
}

// Her feet (root) during the fall: a smooth curve from where the core's middle puts her hips at T_MORPH, with
// the core's velocity, to rest on her ground point at T_LAND.
function patchouliRoot(t, qRoll, scale, out) {
  const hips0 = V(0, stage.hipH * scale, 0).applyQuaternion(qRoll);
  const P0 = stage.C0.clone().sub(hips0), P1 = stage.G;
  const T = T_LAND - T_MORPH, u = clamp((t - T_MORPH) / T);
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2;
  return out.copy(P0).multiplyScalar(h00).addScaledVector(stage.v0, h10 * T).addScaledVector(P1, h01);
}

// ---- her choreography (stage space: she faces +Z = screen right; the camera is on the -X side)
const P_BASE = {
  root: { pos: [0, 0, 0], rot: [0, 0, 0] }, spine: [0, 0, 0], chest: [0, 0, 0], neck: [10, 0, 0], head: [-12, 0, 0],
  shoulderL: [-8, 0, 4], elbowL: [-128, 0, 0], wristL: [0, -30, 0], gripL: 0.6,
  shoulderR: [6, 0, 8], elbowR: [-14, 0, 0], wristR: [0, 0, 0], gripR: 0.4, pointR: 0,
  hipL: [0, 0, 2], hipR: [0, 0, 2], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0],
};
// Her movement is a set of motion curves (flow: the velocity runs through the keys, nothing stops dead at a key),
// timed frame by frame on the original. Each part has its own curve so they overlap as in a drawn performance:
// the head turns before the body, the body carries the arm round, the elbow and hand trail the shoulder.
// Body yaw (stage space, 0 = facing the screen's right, -90 = facing us, -180 = facing the screen's left): she
// turns to us at 30.95 – 31.15, drifts on while the arm opens, and swings to her left profile at 31.9 – 32.4.
const patYaw = flow([[T_LAND, -30], [30.75, -33], [30.98, -52], [31.15, -80], [31.5, -88], [31.75, -94], [31.95, -113],
  [32.15, -150], [32.35, -174], [32.6, -180], [35.5, -181]]);
// Where her face points (yaw, the same angles, in the world) and how the head carries the turn (a nod and a tilt,
// degrees): at the screen's right until 31.3, then she looks round to the left in one even half second (on the
// original: turning from 31.37, toward us at 31.58, left profile by 31.85), dipping and tilting into the turn, a
// little past it, and settles. Neck and head share the turn.
const patLook = flow([[T_LAND, [0, 0, 0]], [30.9, [0, 0, 0]], [31.2, [-6, 0, 0]], [31.35, [-18, 1, -1]], [31.47, [-48, 3, -3]],
  [31.58, [-90, 5, -6]], [31.7, [-135, 5, -6]], [31.82, [-168, 3, -3]], [31.95, [-182, 0, 0]], [32.25, [-181, 0, 0]],
  [35.5, [-180, 0, 0]]]);
// Torso twist and the head's pitch; the book (hips space: position, rotation) against her chest, its top tipped out
// to her left, until she turns away; then lowered at her side, flat against her hip. Her left hand holds it by IK,
// the elbow toward poleL (hips space).
const BOOK_UP = { book: [[0.04, 0.27, 0.16], [0.8, 0.3, 0.3]], poleL: [0.3, 0.05, -0.05] };
const BOOK_LOW = { book: [[0.17, -0.2, 0.02], [0, Math.PI / 2, 0]], poleL: [0.35, 0.2, -0.25] };
const patTorso = flow([
  [T_LAND, { chest: 0, pitch: -8, neck: 0, ...BOOK_UP }],
  [31.0, { chest: 0, pitch: -8, neck: 0, ...BOOK_UP }],
  [31.3, { chest: -6, pitch: -8, neck: 0, ...BOOK_UP }],
  [31.75, { chest: -8, pitch: -8, neck: 0, ...BOOK_UP }],
  [32.0, { chest: -11, pitch: -10, neck: 0, ...BOOK_UP }],
  [32.35, { chest: -2, pitch: -12, neck: 0, ...BOOK_LOW }],
  [32.7, { chest: 0, pitch: -9, neck: 0, ...BOOK_LOW }],
  [33.4, { chest: 0, pitch: -12, neck: 0, ...BOOK_LOW }],
  [33.8, { chest: 0, pitch: -18, neck: 0, ...BOOK_LOW }],
  [34.1, { chest: 0, pitch: -9, neck: -4, ...BOOK_LOW }],
  [35.5, { chest: 0, pitch: -9, neck: -4, ...BOOK_LOW }],
]);
// Her right arm, keyed as FK angles or as IK targets for the wrist (hips space, with the elbow's pole) or 'point'
// (the raised finger, stage space, see POINT_WRIST); each key is solved once into joint rotations (ensureArm) and
// the curve runs through those, so the whole gesture is one motion. Timed on the hand's track on the original (the
// silhouette's leftmost point, frame by frame): the hand rises to her chest (30.45 – 30.9), the arm opens out to
// the screen's left (quickly to 31.5, then drifting), flicks to full stretch (31.77 – 31.93) and sweeps straight
// back down as she swings round; it hangs, then rises in one long lift to the horizontal (32.6 – 33.48), the elbow
// folds the forearm up (33.48 – 33.88) and the finger points. At 32.1 the elbow's pole goes behind her while the
// arm is straight (the palm rolls over), so the hanging keys after it don't spin the upper arm about itself.
const ARM_KEYS = [
  [T_LAND, { shoulderR: [16, 0, 12], elbowR: [-22, 0, 0] }],
  [30.4, { shoulderR: [13, 0, 12], elbowR: [-26, 0, 0] }],
  [30.64, { ik: [[-0.06, 0.1, 0.25], [-0.3, 0.0, 0.05]] }],
  [30.88, { ik: [[0.0, 0.3, 0.26], [-0.25, 0.05, 0.15]] }],
  [31.15, { ik: [[-0.22, 0.31, 0.26], [-0.3, 0.0, 0.35]] }],
  [31.35, { ik: [[-0.46, 0.31, 0.24], [-0.3, 0.0, 0.35]] }],
  [31.55, { ik: [[-0.53, 0.28, 0.18], [-0.3, 0.0, 0.35]] }],
  [31.75, { ik: [[-0.58, 0.29, 0.12], [-0.3, 0.05, 0.35]] }],
  [31.9, { ik: [[-0.66, 0.32, 0.1], [-0.3, 0.1, 0.35]] }],
  [32.1, { ik: [[-0.66, 0.25, 0.08], [-0.3, -0.15, -0.35]] }],
  [32.28, { shoulderR: [-10, 0, 26], elbowR: [-22, 0, 0] }],
  [32.45, { shoulderR: [0, 0, 8], elbowR: [-20, 0, 0] }],
  [32.62, { shoulderR: [-6, 0, 8], elbowR: [-16, 0, 0] }],
  [32.76, { shoulderR: [-22, 0, 8], elbowR: [-11, 0, 0] }],
  [32.9, { shoulderR: [-36, 0, 8], elbowR: [-8, 0, 0] }],
  [33.05, { shoulderR: [-50, 0, 7], elbowR: [-6, 0, 0] }],
  [33.2, { shoulderR: [-63, 0, 7], elbowR: [-5, 0, 0] }],
  [33.35, { shoulderR: [-78, 0, 6], elbowR: [-6, 0, 0], wristR: [-6, 0, 0] }],
  [33.48, { shoulderR: [-89, 0, 7], elbowR: [-12, 0, 0], wristR: [-18, 0, 0] }],
  [33.62, { shoulderR: [-95, 0, 9], elbowR: [-38, 0, 0], wristR: [-24, 0, 0] }],
  [33.78, { shoulderR: [-88, 0, 11], elbowR: [-58, 0, 0], wristR: [-20, 0, 0] }],
  [33.88, { shoulderR: [-78, 0, 13], elbowR: [-76, 0, 0], wristR: [-10, 0, 0] }],
  [34.02, 'point'],
  [35.95, 'point'],
  // the forearm swings flatter as she turns the hand (the elbow goes out toward the screen's right)
  [36.3, { point: [[0.08, 0.97, -0.38], [0.2, 0.3, 0.2]], palm: true }],
  [36.37, { point: [[0.078, 0.971, -0.381], [0.2, 0.3, 0.2]], palm: true }],
  // the hand turns its palm to the camera and opens, the fingers curled, as it becomes Remilia's (36.47 on the original)
  // (the elbow drops: the forearm runs steeply down from the hand, as the original's does)
  [36.47, { point: [[0.04, 0.92, -0.37], [0.1, -0.2, -0.15]], palm: true }],
  [36.7, { point: [[0.04, 0.92, -0.37], [0.1, -0.2, -0.15]], palm: true }],
];
// her hand: open, then the fist with the finger out as the forearm comes up
// (in the morph, 36.35 – 36.47, it opens, the fingers curled and a little apart: Remilia's hand)
const patHand = flow([[T_LAND, [0.4, 0, 0]], [30.4, [0.4, 0, 0]], [30.9, [0.5, 0, 0]], [31.55, [0.45, 0, 0]], [31.75, [0.35, 0, 0]], [31.9, [0.12, 0, 0]],
  [32.2, [0.3, 0, 0]], [32.8, [0.2, 0, 0]], [33.5, [0.3, 0, 0]], [33.8, [0.55, 0, 0]], [34.0, [1, 1, 0]], [36.35, [1, 1, 0]], [36.41, [0.7, 0, 1.2]], [36.7, [0.7, 0, 1.2]]]);
// The finger wag in the close-up, read drawing by drawing on the original: the finger leans right (+1, about 35°),
// stands up (0) or leans left (-1); [onset, value] of each drawing. The wag is the smooth swing through the
// drawings (each taken at the middle of the time it is held).
const WAG = 35, WAG_HAND = 0.6;   // degrees per unit of wag; the share of it the hand takes (the finger takes the rest)
const WAG_KEYS = [[34.1, 1], [34.167, 0], [34.267, -1], [34.367, 0], [34.467, 1], [34.567, 0], [34.667, -1], [34.767, -0.6],
  [34.833, 0], [34.867, 1], [34.967, 0.6], [35.033, 0], [35.067, -1],
  // the push-in onto the hand: she wags on, once per beat, then turns the hand so the finger points up to the left
  [35.233, 0.3], [35.333, 0.7], [35.433, 0.3], [35.467, 0], [35.533, -0.5], [35.567, -1.3], [35.667, 0], [35.733, 0.3],
  [35.767, 1], [35.867, 0], [35.933, -0.5], [35.967, -1.1], [36.067, -1.35], [36.2, -1.45]];
const wag = flow([[33.98, 0], ...WAG_KEYS.map(([t0, w], i) => [(t0 + (WAG_KEYS[i + 1]?.[0] ?? t0 + 0.1)) / 2, w]), [36.3, -1.5], [36.42, -1.3], [36.52, -0.9], [36.7, -0.9]]);
// her thumb comes up as she turns the hand (36.1 – 36.25: a finger gun)
const patThumb = flow([[36.05, 0], [36.25, 1], [36.4, 1], [36.54, 0.85], [36.7, 0.2]]);

// She bops on the beat like the others (measured on the top of her cap, 30.4 – 33.9 s: dips every 0.42 s, the
// song's beat, about 0.15 beat ahead of Reimu's, 2.5 cm deep): the knees give, the head nods a little.
const T_DIP_P = T_DIP - 0.15 * BEAT;
const patDip = (t) => (0.5 + 0.5 * Math.cos((2 * Math.PI * (t - T_DIP_P)) / BEAT)) * smooth(prog(t, T_LAND, T_LAND + 0.4));

// Her body at t (everything but the right arm): yaw, bop, torso, the look split between neck and head, the book.
function posePatchouli(f, t, dip = true) {
  const v = f.patchouli;
  const yaw = patYaw(t), s = patTorso(t), [grip, point, spread] = patHand(t - 0.05);
  const [lookYaw, nod, tilt] = patLook(t);
  const look = lookYaw - yaw - s.chest;              // how far her head turns on her shoulders
  const d = dip ? patDip(t) : 0, drop = 0.025 * d;
  const knee = Math.acos(1 - drop / 0.7) / D2R;
  v.pose({
    ...P_BASE, root: { pos: [0, 0, 0], rot: [0, yaw, 0] }, hipsPos: [0, -drop, 0], chest: [0, s.chest, 0],
    hipL: [-knee, 0, 2], hipR: [-knee, 0, 2], kneeL: [2 * knee, 0, 0], kneeR: [2 * knee, 0, 0], ankleL: [-knee, 0, 0], ankleR: [-knee, 0, 0],
    neck: [10 + s.neck + 0.4 * nod, 0.35 * look, 0.4 * tilt], head: [s.pitch + 0.6 * nod + (dip ? 3 * patDip(t - 0.04) : 0), 0.65 * look, 0.6 * tilt],
    gripR: clamp(grip), pointR: clamp(point), spreadR: spread, thumbR: clamp(patThumb(t)),
  });
  for (const m of v.j.elbowR.children.filter((o) => o.isMesh)) {
    const width = lerp(1, 1.65, smooth(prog(t, 35.9, 36.4)));
    m.scale.set(width, 1, width);
  }
  v.holdBook(s.book[0], s.book[1]);
  return yaw;
}

// The raised finger (34 – 35 s): her right wrist where the original has it, the forearm rising diagonally from a
// low elbow, and the hand turned so the finger stands straight up.
const POINT_WRIST = V(0.1, 0.99, -0.27), POINT_POLE = V(0.3, 0.55, 0.35);
const Q_POINT = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, -1), V(0, -1, 0), V(-1, 0, 0)));
// the hand of the morph (36.47 on the original): the palm (+X) toward the camera (stage -X), the fingers (-Y) up and
// curled toward the camera (a quarter turn of the wrist from the pointing hand; palm up would take a half turn)
const Q_PALM = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, -1, 0), V(0, 0, 1)));
let armKeys = null;

// Solves every arm key once into local rotations of her shoulder, elbow and wrist (12 numbers, each quaternion on
// the same side as the previous key's so the curve takes the short way).
function ensureArm(f) {
  if (armKeys) return;
  const v = f.patchouli, st = f.stage, J = ['shoulderR', 'elbowR', 'wristR'];
  let prev = null;
  armKeys = ARM_KEYS.map(([t, key]) => {
    const yaw = posePatchouli(f, t, false);
    v.root.position.set(0, 0, 0);
    v.root.quaternion.setFromEuler(new THREE.Euler(0, yaw * D2R, 0));
    v.root.scale.setScalar(PAT_SCALE);
    v.root.updateMatrixWorld(true);
    const hips = v.j.hips;
    if (key === 'point' || key.point) {
      const [W, P] = key.point ? key.point.map((a) => V(...a)) : [POINT_WRIST, POINT_POLE];
      v.reach('R', st.localToWorld(W.clone()), st.localToWorld(P.clone()), 1);
      // hand space: -Y (the fingers) up, +X (her right palm) toward the screen's left (-Z), +Z toward the camera
      const wr = v.j.wristR;
      wr.quaternion.copy(wr.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(st.quaternion.clone().multiply(key.palm ? Q_PALM : Q_POINT)));
    } else if (key.ik) {
      v.reach('R', hips.localToWorld(V(...key.ik[0])), hips.localToWorld(V(...key.ik[1])), 1);
    } else {
      v.pose({ ...P_BASE, root: { pos: [0, 0, 0], rot: [0, yaw, 0] }, shoulderR: key.shoulderR, elbowR: key.elbowR, wristR: key.wristR || [0, 0, 0] });
    }
    const q = J.map((n) => v.j[n].quaternion.clone());
    if (prev) q.forEach((qq, i) => { if (qq.dot(prev[i]) < 0) qq.set(-qq.x, -qq.y, -qq.z, -qq.w); });
    prev = q;
    return [t, q.flatMap((qq) => qq.toArray())];
  });
  armKeys = flow(armKeys);
}

// Her right arm on its curve, the elbow and the hand a frame or two behind the shoulder; in the close-up the finger
// wags in the image plane (about the camera's axis, stage X).
function poseArm(f, t) {
  // (the trail fades out as the hand comes to the exact pointing pose)
  const v = f.patchouli, J = ['shoulderR', 'elbowR', 'wristR'], trail = 1 - smooth(prog(t, 33.75, 33.95));
  J.forEach((n, i) => v.j[n].quaternion.fromArray(armKeys(t - 0.035 * i * trail), 4 * i).normalize());
  v.root.updateMatrixWorld(true);
  f.patchouli.sleeveTuck = smooth(prog(t, 33.8, 34.1));   // her sleeve falls back along the raised forearm
  f.patchouli.sleeveBack = smooth(prog(t, 35.9, 36.25));
  // (the hand turns a little, the finger most: it pivots at the knuckle, so the fist stays where it is)
  const w = wag(t);
  if (w !== 0) {
    const axis = V(1, 0, 0).applyQuaternion(f.stage.quaternion);
    for (const [joint, k] of [[v.j.wristR, WAG_HAND], [v.fingers.R.f[0].base, 1 - WAG_HAND]]) {
      const qp = joint.parent.getWorldQuaternion(new THREE.Quaternion());
      const qw = new THREE.Quaternion().setFromAxisAngle(axis, WAG * D2R * w * k);
      joint.quaternion.premultiply(qp).premultiply(qw).premultiply(qp.invert());
      joint.updateMatrixWorld(true);
    }
  }
}

// Her left hand holds the book wherever the torso curve puts it.
function armIK(f, t) {
  const v = f.patchouli, hips = v.j.hips, s = patTorso(t);
  hips.updateMatrixWorld(true);
  v.reach('L', v.bookGrip(), hips.localToWorld(V(...s.poleL)), 1);
}

// The camera in stage space after she has landed: [pos xyz, target xyz]; the first key continues the tracking
// camera of the fall (solved once). A slow push-in on her, then closer as she turns and gestures, and a close-up
// of her face and raised finger.
const T_PATH = 29.067;
const PAT_KEYS = [
  [29.5, [-2.9625, 0.8375, 0.57, -0.9625, 0.8375, 0.57]],
  [30.0, [-2.825, 0.775, 0.3325, -0.825, 0.775, 0.3325]],
  [30.5, [-2.7875, 0.77, 0.0375, -0.7875, 0.77, 0.0375]],
  [31.0, [-2.7625, 0.7825, -0.1375, -0.7625, 0.7825, -0.1375]],
  [31.5, [-2.555, 0.83, -0.1875, -0.555, 0.805, -0.1875]],
  [31.9, [-2.1075, 0.9175, -0.1225, -0.1075, 0.92, -0.1225]],
  [32.25, [-1.915, 0.925, -0.125, 0.085, 0.95, -0.125]],
  [32.6, [-1.7125, 1.03, -0.15, 0.2875, 1.0, -0.15]],
  [33.0, [-1.8, 1.0175, -0.15, 0.2, 1.005, -0.15]],
  [33.3, [-1.9, 0.975, -0.1625, 0.1, 0.975, -0.1625]],
  [33.7, [-1.7375, 0.975, -0.2, 0.2625, 0.9125, -0.2]],
  [33.85, [-1.76, 0.95, -0.24, 0.24, 0.94, -0.24]],
  [34.0, [-1.31, 1.05, -0.2325, 0.69, 1.0725, -0.2325]],
  [34.2, [-0.975, 1.12, -0.1925, 1.025, 1.0275, -0.1925]],
  [35.0, [-0.9775, 1.12, -0.1725, 1.0225, 1.085, -0.1725]],
  // onto her hand: the camera pushes in and pans left, her face leaves the frame at the right
  [35.45, [-0.33, 1.12, -0.24, 0.67, 1.04, -0.3]],
  [35.7, [-0.28, 1.12, -0.28, 0.67, 1.11, -0.31]],
  [35.9, [-0.31, 1.11, -0.28, 0.84, 1.03, -0.23]],
  [36.1, [-0.28, 1.14, -0.33, 0.7110, 1.0509, -0.4302]],
  [36.2, [-0.32, 1.1, -0.38, 0.6738, 1.0268, -0.4637]],
  [36.3, [-0.45, 1.07, -0.43, 0.5491, 1.0481, -0.4665]],
];
// Remilia: the camera pulls back from the hand as it turns into her wing, pans onto her (front view, waist up), holds
// while she bops, and pushes in as she turns and holds out her cup (keys solved against the original).
const REM_KEYS = [
  [36.4, [-0.59, 1.08, -0.42, 0.4098, 1.0633, -0.4117]],
  [36.53, [-0.78, 1.08, -0.075, 0.1857, 1.0800, -0.3348]],
  [36.85, [-1.4, 1.0, 0.0, -0.4045, 1.0, -0.0948]],
  [37.1, [-1.505, 1.015, 0.075, -0.5067, 1.0037, 0.0185]],
  [37.5, [-1.505, 0.9775, -0.1, -0.5095, 0.9983, -0.0074]],
  [38.0, [-1.5925, 1.015, -0.05, -0.5933, 1.0038, -0.0126]],
  [38.6, [-1.555, 1.0025, 0.1, -0.5592, 1.0002, 0.0084]],
  [38.9, [-1.455, 0.99, 0.05, -0.4562, 0.9997, 0.0013]],
  [39.15, [-1.175, 0.99, 0.155, -0.1890, 1.0029, -0.0115]],
  [39.45, [-1.15, 1.0475, 0.075, -0.1745, 1.0229, -0.1438]],
  [39.8, [-0.88, 1.03, -0.1775, 0.1133, 1.0489, -0.2914]],
  [40.0, [-0.8275, 1.02, -0.3175, 0.1714, 1.0541, -0.2856]],
  [40.2, [-0.845, 1.035, -0.315, 0.1547, 1.0472, -0.2953]],
  [40.4, [-0.845, 1.05, -0.36, 0.1520, 1.0203, -0.2888]],
  // (at the release the cup sits where the original's is at 40.57, so the camera that then drops with it starts from
  // rest there: computed from the cup's position, not solved)
  [40.56, [-0.852, 1.125, -0.371, 0.145, 1.095, -0.299]],   // T_CUP
];
const remCameraPolish = flow([[36.3, [0, 0, 0]], [36.47, [0.025, -0.04, 0.16]],
  [36.62, [0.025, -0.03, 0.16]], [36.85, [0, 0, 0]], [37.1, [0, 0, 0]]]);
let patPath = null;

// The stage-space camera from T_PATH on (Patchouli, then Remilia).
function stageCam(f, t) {
  if (!patPath) {
    // the first key continues the tracking camera at T_PATH (she is standing by then)
    // and leaves with its velocity (the tracking camera keeps moving at 29 s)
    const d = 3.75, at = (tt) => {
      trackCam(f, V(0, stage.hipH, 0).applyMatrix4(f.stage.matrixWorld), PAT_SCREEN(tt), lerp(stage.d0, d, smooth(prog(tt, T_MORPH, T_PATH))));
      const cp = f.stage.worldToLocal(f.camera.position.clone());
      const ct = f.stage.worldToLocal(f.camera.position.clone().addScaledVector(fall.F, d));
      return [cp.x, cp.y, cp.z, ct.x, ct.y, ct.z];
    };
    const k0 = at(T_PATH), k1 = at(T_PATH - 0.01);
    patPath = flow([[T_PATH, k0], ...PAT_KEYS, ...REM_KEYS], { v0: k0.map((x, i) => (x - k1[i]) / 0.01) });
  }
  const k = patPath(t);
  camLook(f.camera, f.stage.localToWorld(V(k[0], k[1], k[2])), f.stage.localToWorld(V(k[3], k[4], k[5])), 30);
  const adjust = remCameraPolish(t);
  f.camera.translateX(adjust[0]); f.camera.translateY(adjust[1]); f.camera.translateZ(adjust[2]);
}

// ---------------------------------------------------------------- Remilia and the cup release (36.3 – 41)
// Patchouli turns into her (the reviewer's choice: a 3D morph, like the core's): Remilia stands where Patchouli
// stands, facing the camera (stage -X). As the camera pulls back from the pointing hand, Patchouli's hand opens,
// palm to the camera; Remilia's right hand rides on it, the same hand in the same place, and takes over from it
// (T_SWAP) while Patchouli shrinks away about her chest (inside Remilia's head as the camera sees it) and Remilia's
// right wing sweeps out behind the hand. Remilia's hand comes down to the teacup she holds in her left hand in front
// of her waist, and from then on she holds it with both hands: she bops, lifts it out as she turns to her right (the
// screen's left), holds it up at chin height, and lets it fall gently.
const T_REM = 36.3;                       // she is there (below the frame, behind the hand)
const T_SWAP0 = 36.5167, T_SWAP1 = 36.6;     // Patchouli shrinks away
const T_SWAP = 36.5167;   // Remilia's right hand appears where Patchouli's is, the same hand (between two frames: no
                          // frame's motion blur mixes the two arms)
const T_CUP = 40.56;                      // the cup leaves her hands
// her bop, measured on the top of her cap (36.9 – 39 s): dips every beat, 0.1 s after Reimu's, about 2 cm deep
const REM_DIP = 37.35;
const remDip = (t) => 0.5 + 0.5 * Math.cos((2 * Math.PI * (t - REM_DIP)) / BEAT);
// body yaw (stage space; -90 = facing the camera, -180 = facing the screen's left)
const remYaw = flow([[T_REM, -90], [38.95, -91], [39.2, -100], [39.45, -130], [39.7, -160], [40.0, -172], [41.2, -176]]);
// where her face points (the same angles) and its pitch: at the camera, then at the cup, a little ahead of the body
const remLook = flow([[T_REM, [-90, 0]], [38.95, [-90, 0]], [39.1, [-100, 6]], [39.28, [-160, 16]], [39.42, [-178, 24]],
  [40.4, [-180, 26]], [40.6, [-178, 30]], [41.2, [-178, 32]]]);
// The cup: one motion curve for its foot, in her hips space (so it bops with her); both hands follow it. In front of
// her waist (inside her silhouette), lifted a little as the left arm bends in (38.1 – 38.8, on the original), out to
// her right side and up as she turns, then held up at chin height in front of her.
const CUP_PATH = flow([
  [T_REM, [0.0, 0.09, 0.22]],
  [38.0, [0.0, 0.095, 0.22]],
  [38.85, [-0.01, 0.13, 0.23]],
  [39.12, [-0.16, 0.24, 0.26]],
  [39.4, [-0.1, 0.3, 0.37]],
  [39.7, [-0.07, 0.32, 0.42]],
  [40.4, [-0.07, 0.33, 0.43]],
  [T_CUP, [-0.065, 0.36, 0.46]],
  [41.2, [-0.065, 0.36, 0.46]],
]);
// Where each hand holds it (hips space, from the cup's foot) and how: her left hand under it, palm up, the fingers
// forward and across; her right hand on its right side, palm against it, fingers forward. The palm's normal and the
// fingers' direction are in her body's (root) space.
const GRIP_L = { at: [0.0, -0.006, 0.0], palm: [0, 1, 0], fingers: [-0.6, 0, 0.8] };
const GRIP_R = { at: [-0.085, 0.04, 0.0], palm: [1, 0, 0], fingers: [0, -0.25, 1] };
// Letting it go, as the original draws it: both hands come over the rim, palm down (40.4 – T_CUP, lifting the cup a
// little), the cup falls from rest, and both arms go on to reach out straight, forward and up, side by side (the far,
// right one hidden behind the near one in profile), while the camera drops with the cup.
const OVER_L = { at: [0.0, 0.11, 0.0], palm: [0, -1, 0], fingers: [-0.3, -0.1, 1] };
const OVER_R = { at: [-0.07, 0.1, 0.02], palm: [0, -1, 0], fingers: [0, -0.1, 1] };
const REACH_L = [-0.02, 0.52, 0.52], REACH_R = [-0.1, 0.5, 0.5];   // hips space, where the palms go
const remOver = (t) => smooth(prog(t, 40.28, T_CUP)), remReach = (t) => smooth(prog(t, T_CUP - 0.03, 40.72));
const REM_PALM = { L: V(-0.012, -0.042, 0), R: V(0.012, -0.042, 0) };   // hand space: the middle of the palm
const HAND_SWAP = (1.5 * 0.94) / (1.15 * 0.88);   // Patchouli's hand over Remilia's (world scale)
// the right hand after the swap: down in front of her chest to the cup (blend weight of the path, then of the grip)
const remDown = (t) => smooth(prog(t, T_SWAP, 37.05)), remJoin = (t) => smooth(prog(t, 36.82, 37.12));
const remGripL = flow([[T_REM, 0.5], [40.4, 0.5], [T_CUP, 0.3], [40.75, 0.1], [41.2, 0.08]]);
const remGripR = flow([[T_SWAP, 0.45], [36.8, 0.55], [40.4, 0.55], [T_CUP, 0.3], [40.75, 0.1], [41.2, 0.08]]);
// she leans toward the cup (spine and chest pitch, degrees)
const remLean = flow([[T_REM, 0], [38.95, 0], [39.4, 3], [40.4, 3], [41.2, 2]]);
// wings [sweep back, raise, pitch] per side (L: hers, the screen's right in the front view). The right one sweeps
// forward from behind her under the hand in the morph (growing out to the left, as the original's does); as she turns
// it folds up, then both sweep back behind her.
const remWings = flow([
  [T_REM, { L: [20, 5, 0], R: [88, 20, 0] }],
  [36.42, { L: [18, 5, 0], R: [80, 24, 0] }],
  [36.52, { L: [16, 5, 0], R: [32, 25, 0] }],
  [36.64, { L: [15, 5, 0], R: [18, 25, 0] }],
  [37.0, { L: [12, 3, 0], R: [12, 14, 0] }],
  [38.78, { L: [12, 3, 0], R: [12, 15, 0] }],
  [39.2, { L: [24, 4, 0], R: [38, 52, 0] }],
  [39.52, { L: [52, 16, 0], R: [68, 48, 0] }],
  [39.9, { L: [75, 30, 0], R: [80, 36, 0] }],
  [41.2, { L: [78, 32, 0], R: [80, 36, 0] }],
]);
const CUP_SPIN = Math.PI;                 // stage space, about its axis: the handle toward +X, away from the camera
let cupDrop = null;                       // the cup's position at T_CUP (solved once)
let swapHand = null;                      // Patchouli's hand at T_SWAP, stage space (solved once)
let patHandNow = null;                    // Patchouli's hand at the current time (set by the shot before T_SWAP)

// A hand's orientation in the world from the palm's normal and the fingers' direction in her body's space.
function handQuat(r, side, palm, fingers) {
  const n = V(...palm).normalize(), fd = V(...fingers);
  fd.addScaledVector(n, -fd.dot(n)).normalize();
  const X = side === 'R' ? n : n.clone().negate(), Y = fd.negate(), Z = new THREE.Vector3().crossVectors(X, Y);
  return r.root.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)));
}

// Put a hand's palm at world point P with world orientation q (IK for the arm, the elbow toward the pole), its size k.
function placeHand(r, side, P, q, pole, k = 1) {
  const hand = r.j['hand' + side], wr = r.j['wrist' + side];
  hand.scale.setScalar(r.o.handScale * k);
  const off = REM_PALM[side].clone().multiplyScalar(r.o.handScale * k * r.o.scale).applyQuaternion(q);
  r.reach(side, P.clone().sub(off), pole, 1);
  wr.quaternion.copy(wr.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  r.root.updateMatrixWorld(true);
}

function poseRemilia(f, t) {
  const r = f.remilia;
  r.root.visible = true;
  const yaw = remYaw(t), [lookYaw, pitch] = remLook(t), look = lookYaw - yaw;
  const d = remDip(t), drop = 0.02 * d;
  const knee = Math.acos(1 - drop / 0.6) / D2R;
  const sway = 0.03 * Math.sin((2 * Math.PI * (t - 37.2)) / (4 * BEAT));
  r.pose({
    root: { pos: [0, 0, 0], rot: [0, yaw, 0] }, hipsPos: [sway, -drop, 0],
    hipL: [-knee, 0, 3], hipR: [-knee, 0, 3], kneeL: [2 * knee, 0, 0], kneeR: [2 * knee, 0, 0], ankleL: [-knee, 0, 0], ankleR: [-knee, 0, 0],
    spine: [0.4 * remLean(t), 0, 0], chest: [2 + 0.6 * remLean(t), 0, -sway / 0.4 / D2R * 0.5], neck: [0, 0.4 * look, 0], head: [pitch + 4 * remDip(t - 0.05), 0.6 * look, 0],
    gripL: remGripL(t), gripR: remGripR(t),
  });
  const w = remWings(t), flap = 4 * remDip(t - 0.08);
  r.poseWings([w.L[0], w.L[1] + flap, w.L[2]], [w.R[0], w.R[1] + flap, w.R[2]]);
  for (const m of r.j.elbowR.children.filter((o) => o.isMesh)) {
    const width = lerp(1.5, 1, smooth(prog(t, T_SWAP, 37.05)));
    m.scale.set(width, 1, width);
  }
  r.root.updateMatrixWorld(true);
  poseRemArms(f, t);
  r.update(t, {});
}

// Both arms by IK: the left hand holds the cup all along; the right hand rides on Patchouli's until T_SWAP, comes down
// to the cup, and holds it too; at the end both let go.
function poseRemArms(f, t) {
  const r = f.remilia, hips = r.j.hips;
  hips.updateMatrixWorld(true);
  const cup = CUP_PATH(Math.min(t, T_CUP)), H = (a) => hips.localToWorld(V(...a));
  const at = (g) => H([cup[0] + g.at[0], cup[1] + g.at[1], cup[2] + g.at[2]]);
  const ko = remOver(t), ke = remReach(t), qRoot = r.root.getWorldQuaternion(new THREE.Quaternion());
  // left hand: under the cup; at the end out from under it (an arc out to her left) and over the rim, palm down;
  // then reaching out
  const PL = at(GRIP_L).lerp(at(OVER_L), ko).add(V(0.06 * Math.sin(Math.PI * ko), 0, 0).applyQuaternion(qRoot)).lerp(H(REACH_L), ke);
  const qL = handQuat(r, 'L', GRIP_L.palm, GRIP_L.fingers).slerp(handQuat(r, 'L', OVER_L.palm, OVER_L.fingers), ko);
  placeHand(r, 'L', PL, qL, H([0.42, -0.2, -0.15]));
  // right hand: on the cup's side; at the end over the rim too, then reaching out beside the left one
  let PR = at(GRIP_R).lerp(at(OVER_R), ko).lerp(H(REACH_R), ke);
  let qR = handQuat(r, 'R', GRIP_R.palm, GRIP_R.fingers).slerp(handQuat(r, 'R', OVER_R.palm, OVER_R.fingers), ko);
  let k = 1, pole = H([-0.42, -0.2, -0.15]);
  r.fingers.R.f[0].base.scale.setScalar(1);
  // (her right arm is hidden until it takes over from Patchouli's: two hands never show at once)
  r.j.shoulderR.scale.setScalar(t < T_SWAP ? 1e-4 : 1);
  if (t < 37.15) {
    // before it reaches the cup: on Patchouli's hand, then down in front of her chest
    const src = t <= T_SWAP && patHandNow ? patHandNow : swapHand;
    const q0 = f.stage.quaternion.clone().multiply(src.q);
    // (src.p is Patchouli's wrist: her palm's middle is where Remilia's palm goes)
    const P0 = f.stage.localToWorld(src.p.clone()).add(REM_PALM.R.clone().multiplyScalar(r.o.handScale * HAND_SWAP * r.o.scale).applyQuaternion(q0));
    // (until the swap her elbow goes where Patchouli's is, so her forearm lies along Patchouli's)
    const S = r.j.shoulderR.getWorldPosition(new THREE.Vector3()), E = f.stage.localToWorld(src.e.clone());
    const poleSwap = E.clone().multiplyScalar(2).sub(S.clone().add(P0).multiplyScalar(0.5));
    const mid = H([-0.2, 0.2, 0.12]);
    const u = remDown(t), path = P0.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(PR, u * u);
    const j = remJoin(t);
    PR = path.lerp(PR, j * j);
    qR = q0.slerp(qR, smooth(prog(t, 36.55, 37.02)));
    k = lerp(HAND_SWAP, 1, smooth(prog(t, T_SWAP, 37.05)));
    pole = poleSwap.lerp(H([-0.35, -0.35, 0.0]), smooth(prog(t, T_SWAP, 36.95)));
    // the fingers and the longer index start as Patchouli's, then become hers
    const g = smooth(prog(t, 36.55, 37.02)), sw = src;
    r.setGrip('R', lerp(sw.grip, remGripR(t), g), lerp(sw.spread, 0, g), lerp(sw.point, 0, g), lerp(sw.thumb, 0, g));
    r.fingers.R.f[0].base.scale.set(lerp(1.3, 1, g), lerp(1.25, 1, g), lerp(1.3, 1, g));
    // Preserve the actual knuckle rotations, including the index's share of the wag.
    r.fingers.R.f.forEach((finger, i) => {
      finger.base.quaternion.copy(sw.digits[i][0].clone().slerp(finger.base.quaternion, g));
      finger.mid.quaternion.copy(sw.digits[i][1].clone().slerp(finger.mid.quaternion, g));
    });
    r.fingers.R.thumb.quaternion.copy(sw.thumbQ.clone().slerp(r.fingers.R.thumb.quaternion, g));
    r.fingers.R.tmid.quaternion.copy(sw.thumbTipQ.clone().slerp(r.fingers.R.tmid.quaternion, g));
  }
  placeHand(r, 'R', PR, qR, pole, k);
}

// Patchouli's right hand in stage space (its wrist, orientation and grip), to hand over to Remilia's.
function readPatHand(f, t) {
  const v = f.patchouli, h = v.j.handR;
  h.updateMatrixWorld(true);
  const [grip, point, spread] = patHand(t - 0.05);
  return {
    p: f.stage.worldToLocal(h.getWorldPosition(new THREE.Vector3())),
    e: f.stage.worldToLocal(v.j.elbowR.getWorldPosition(new THREE.Vector3())),
    q: f.stage.quaternion.clone().invert().multiply(h.getWorldQuaternion(new THREE.Quaternion())),
    grip: clamp(grip), point: clamp(point), spread, thumb: clamp(patThumb(t)),
    digits: v.fingers.R.f.map((finger) => [finger.base.quaternion.clone(), finger.mid.quaternion.clone()]),
    thumbQ: v.fingers.R.thumb.quaternion.clone(), thumbTipQ: v.fingers.R.tmid.quaternion.clone(),
  };
}

function ensureSwap(f) {
  if (swapHand) return;
  SHOTS.find((s) => s.name === 'patchouli').apply(f, T_SWAP);
  swapHand = readPatHand(f, T_SWAP);
}

// The cup: upright in the world, its handle turned away from the camera, its foot on the curve; falling from T_CUP.
function cupHeld(f, t) {
  const r = f.remilia;
  r.j.hips.updateMatrixWorld(true);
  f.cup.position.copy(r.j.hips.localToWorld(V(...CUP_PATH(t))));
  f.cup.quaternion.copy(f.stage.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), CUP_SPIN));
}

function ensureCupDrop(f) {
  if (cupDrop) return;
  cupDrop = {};
  poseRemilia(f, T_CUP); cupHeld(f, T_CUP);
  // she lets it go gently: it keeps only a little of her hands' forward reach, which also carries the camera that
  // drops with it away from her legs
  const fwd = V(0, 0, 0.35).applyQuaternion(f.remilia.root.getWorldQuaternion(new THREE.Quaternion()));
  Object.assign(cupDrop, { p0: f.cup.position.clone(), q0: f.cup.quaternion.clone(), v0: fwd });
}

// Free fall past the terrace's edge (she stands at the edge of it), turning slowly about its axis: the handle comes
// round from behind toward the screen's right (it shows at 41.2 s in the original).
function poseCup(f, t) {
  f.cup.visible = true;
  if (t < T_CUP) { cupHeld(f, t); return; }
  ensureCupDrop(f);
  const s = t - T_CUP, g = 9.8;
  f.cup.position.copy(cupDrop.p0).addScaledVector(cupDrop.v0, s);
  f.cup.position.y -= 0.5 * g * s * s;
  f.cup.quaternion.copy(cupDrop.q0).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), 2.2 * Math.min(s, 0.84) ** 2));
  const tilt = smooth(prog(t, 41.2, 42.0)) * 0.33;
  f.cup.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(cupCamSolve ? cupCamSolve.F : V(0, 0, -1), tilt));
}

// The camera drops with the cup. Its track on screen was measured on the original (the cup's blob, frame by frame,
// from 40.633 s, when it has come clear of her hand; where the frame's bottom edge cuts it, its centre is estimated
// from its top and its width): the centre (frame fractions, y down) and the width (a fraction of the frame's). Like
// the core's fall, the camera keeps its orientation at T_CUP and is placed so the cup's middle lands on the measured
// point, at the distance its measured width implies. The first key is where the cup is at T_CUP in the stage camera
// (solved). (The drawing at 40.567 was left out: her hand still covers the rim, so its width reads too small.)
// (one key per drawing, at the middle of the time it is held: the drawings are on twos here)
// (one key per drawing, at the middle of the time it is held: the drawings are on twos here; after 41.1 s the camera
// overtakes the cup, which rises in the frame. The width at 40.633 was left out, her hand still overlapping the cup,
// and from 41.15 s the handle shows, so the rim's width is held at 0.3.)
const CUP_SCREEN_KEYS = [[40.65, [0.333, 0.667]], [40.7, [0.379, 0.767]], [40.75, [0.393, 0.837]], [40.8, [0.401, 0.943]],
  [40.867, [0.4, 0.99]], [40.95, [0.404, 1.0]], [41.0, [0.417, 0.96]], [41.05, [0.427, 0.916]], [41.083, [0.449, 0.751]],
  [41.133, [0.46, 0.682]], [41.183, [0.479, 0.551]], [41.267, [0.493, 0.391]], [41.333, [0.495, 0.349]], [41.4, [0.498, 0.278]],
  [41.5, [0.499, 0.199]], [41.6, [0.499, 0.158]], [41.7, [0.500, 0.159]],
  [41.8, [0.503, 0.220]], [41.9, [0.503, 0.367]], [42.0, [0.502, 0.571]], [42.12, [0.502, 0.85]]];
const CUP_WIDTH_KEYS = [[40.7, 0.219], [40.75, 0.231], [40.8, 0.254], [40.867, 0.273], [40.95, 0.294], [41.0, 0.308],
  [41.083, 0.315], [41.4, 0.3], [42.12, 0.33]];
const CUP_W = 0.125, CUP_MID = 0.037;     // the cup's rim width and its middle's height above the foot (m)
const CUP_H = 0.074;                      // its height
let cupCamSolve = null;

function cupMid(f) {
  return f.cup.localToWorld(V(0, CUP_MID / 1.25, 0));
}

function ensureCupCam(f) {
  if (cupCamSolve) return;
  poseRemilia(f, T_CUP); poseCup(f, T_CUP);
  stageCam(f, T_CUP);
  f.camera.updateMatrixWorld(); f.camera.updateProjectionMatrix();
  const q = f.camera.quaternion.clone();
  const R = V(1, 0, 0).applyQuaternion(q), U = V(0, 1, 0).applyQuaternion(q), F = V(0, 0, -1).applyQuaternion(q);
  const rel = cupMid(f).sub(f.camera.position);
  const d0 = rel.dot(F), hh = d0 * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  const x0 = [(rel.dot(R) / hw + 1) / 2, (1 - rel.dot(U) / hh) / 2];
  cupCamSolve = {
    q, R, U, F,
    // (motion curves, not splines: the drawings are held on twos, and a spline wiggles through the steps)
    screen: flow([[T_CUP, x0], ...CUP_SCREEN_KEYS]),
    width: flow([[T_CUP, CUP_W / (2 * hw)], ...CUP_WIDTH_KEYS]),
  };
}

function cupCam(f, t) {
  const c = cupCamSolve, C = cupMid(f), xy = c.screen(t);
  const d = CUP_W / (c.width(t) * 2 * Math.tan(15 * D2R) * f.camera.aspect);
  const hh = d * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  const T = C.addScaledVector(c.R, -(2 * xy[0] - 1) * hw).addScaledVector(c.U, -(1 - 2 * xy[1]) * hh);
  f.camera.position.copy(T).addScaledVector(c.F, -d);
  f.camera.quaternion.copy(c.q);
  f.camera.fov = 30;
}


// ---------------------------------------------------------------- cup fracture and Sakuya (41 – 47)
let fracture = null;
function ensureFracture(f) {
  if (fracture) return;
  ensureSwap(f); ensureCupDrop(f); ensureCupCam(f);
  poseCup(f, 42.12); cupCam(f, 42.12);
  f.camera.updateMatrixWorld();
  const q = f.camera.quaternion.clone(), inverse = q.clone().invert();
  const cupQ = inverse.clone().multiply(f.cup.quaternion);
  fracture = { q, origin: f.cup.position.clone(), camera: f.camera.position.clone(),
    parts: f.cupFragments.children.map((part) => ({
      p: part.userData.center.clone().multiplyScalar(1.25).applyQuaternion(cupQ), q: cupQ.clone(),
    })) };
  // Lazy setup poses previous actors; reset their visibility before the current shot is evaluated.
  f.director.resetVisibility();
}
// The rim fragment turns into Sakuya over 44.0 – 44.26 (as on the original, frame by frame): her body grows out of
// it from a fraction of its size while the fragment shrinks into her crown, so both show for a few frames.
const T_FRAG_END = 44.26;
// Measured centres at the widest separation, before the camera picks out the spinning rim fragment.
const fragmentScreen = [[0.205, 0.19], [0.34, 0.77], [0.60, 0.65], [0.57, 0.83], [0.77, 0.80], [0.46, 0.90], [0.47, 0.94], [0.79, 0.91]];
function poseFragments(f, t) {
  const group = f.cupFragments;
  group.visible = true; group.position.copy(fracture.origin); group.quaternion.copy(fracture.q);
  const origin = fracture.origin.clone().sub(fracture.camera).applyQuaternion(fracture.q.clone().invert());
  const hh = -origin.z * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  group.children.forEach((part, i) => {
    const u = smooth(prog(t, 42.12, i === 0 ? 42.8 : 42.65)), xy = fragmentScreen[i];
    const target = V((2 * xy[0] - 1) * hw - origin.x, (1 - 2 * xy[1]) * hh - origin.y, 0);
    part.visible = i !== 0 || t < T_FRAG_END;
    part.position.copy(fracture.parts[i].p).lerp(target, u);
    if (i !== 0) part.position.y -= Math.max(0, t - 43.0) ** 2 * 0.55;
    part.quaternion.copy(fracture.parts[i].q);
    const spin = Math.max(0, t - 42.12);
    if (i < 6) {
      const facing = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -(i + 0.5) * Math.PI / 3, 0));
      const angle = i === 0 ? spin * 9.2 + 0.8 : [0, -1.1, 1.2, 0.8, 2.3, -0.2][i] + (t - 42.8) * 0.6;
      facing.premultiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), angle));
      part.quaternion.slerp(facing, smooth(prog(t, 42.12, 42.65)));
    }
    const scale = i === 0 ? 0.87 : i === 2 ? 0.75 : 1.25;
    // the camera backs away from 44 s; the fragment keeps its size on screen while it shrinks into her crown
    const shrink = t < 44 ? 1 : (1 - smooth(prog(t, 44.0, T_FRAG_END))) * sakuyaFrame(t)[2] * sakuyaGrowth(t) / sakuyaFrame(44)[2];
    part.scale.setScalar(1.25 * lerp(1, scale, u) * (i === 0 ? shrink : 1));
  });
  group.updateMatrixWorld(true);
}
function framePoint(f, point, xy, distance, q = fracture.q) {
  const hh = distance * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  f.camera.position.copy(point).add(V(-(2 * xy[0] - 1) * hw, -(1 - 2 * xy[1]) * hh, distance).applyQuaternion(q));
  f.camera.quaternion.copy(q); f.camera.fov = 30;
}
const shardFrame = flow([[43.15, [0.22, 0.20, 0.51]], [43.4, [0.40, 0.40, 0.46]],
  [43.6, [0.50, 0.49, 0.40]], [43.8, [0.52, 0.50, 0.36]], [44.15, [0.49, 0.5, 0.32]]]);
const sakuyaFrame = flow([[44.0, shardFrame(44)], [44.2, [0.50, 0.5, 0.54]], [44.3, [0.50, 0.5, 0.53]],
  [44.8, [0.5, 0.5, 0.44]], [45.2, [0.5, 0.5, 0.43]], [45.4, [0.5, 0.5, 0.30]],
  [45.6, [0.49, 0.43, 0.23]], [45.9, [0.48, 0.47, 0.29]], [46.4, [0.48, 0.48, 0.29]], [46.7, [0.48, 0.47, 0.28]], [47, [0.48, 0.40, 0.265]],
  [47.3, [0.50, 0.40, 0.268]], [47.65, [0.52, 0.40, 0.268]], [47.85, [0.52, 0.48, 0.215]],
  [48.05, [0.52, 0.57, 0.18]], [48.35, [0.52, 0.57, 0.18]], [49.0, [0.52, 0.57, 0.18]], [49.14, [0.56, 0.58, 0.19]]]);
const sakuyaGrowth = flow([[44, 1], [44.3, 2], [45, 5], [45.6, 10], [47, 10]]);
const sakuyaTilt = flow([[44, 90], [45.2, 90], [45.4, 65], [45.6, 12], [45.85, 0], [47, 0]]);
const sakuyaYaw = flow([[45.5, 405], [45.8, 452], [46.1, 458], [46.35, 518], [46.55, 565], [46.85, 612], [47, 628],
  [47.6, 630], [47.85, 685], [48.0, 720], [48.3, 800], [48.8, 804], [49.0, 806], [49.14, 989], [49.4, 985]]);
const sakuyaLook = flow([[47, 0], [47.65, 0], [47.9, 12], [48.3, 0], [49.0, 0], [49.14, 4], [49.4, 0]]);
const sakuyaCameraOffset = flow([[47.9, [0, 0, 0]], [48.3, [-0.15, 0, -0.15]], [49.0, [-0.15, 0, -0.15]], [49.14, [-0.15, 0, -0.15]]]);
const sakuyaArms = flow([
  [44, { shoulderL: [0, 0, 90], shoulderR: [0, 0, 90], elbowL: [-5, 0, 0], elbowR: [-5, 0, 0], wristL: [0, 0, 0], wristR: [0, 0, 0] }],
  [45.45, { shoulderL: [0, 0, 90], shoulderR: [0, 0, 90], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], wristL: [0, 0, 0], wristR: [0, 0, 0] }],
  [45.8, { shoulderL: [-12, 0, 18], shoulderR: [-15, 0, 20], elbowL: [-45, 0, 0], elbowR: [-70, 0, 0], wristL: [0, 0, 0], wristR: [0, 0, 0] }],
  [46.1, { shoulderL: [-25, 0, 12], shoulderR: [-22, 0, 20], elbowL: [-65, 0, 0], elbowR: [-86, 0, 0], wristL: [0, 0, 10], wristR: [0, 0, 5] }],
  [46.45, { shoulderL: [-50, 0, 20], shoulderR: [-35, 0, 30], elbowL: [-110, 0, 0], elbowR: [-95, 0, 0], wristL: [0, 0, 15], wristR: [0, 0, 5] }],
  [46.7, { shoulderL: [-68, 0, 16], shoulderR: [-38, 0, 22], elbowL: [-65, 0, 0], elbowR: [-115, 0, 0], wristL: [0, 0, 25], wristR: [0, 0, 10] }],
  [47, { shoulderL: [-90, 0, 10], shoulderR: [-50, 0, 14], elbowL: [-15, 0, 0], elbowR: [-115, 0, 0], wristL: [0, 0, 30], wristR: [0, 0, 15] }],
]);
let sakuyaArmCurve = null;
const SAKUYA_JOINTS = ['shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR'];
function ensureSakuyaArms(f) {
  if (sakuyaArmCurve) return;
  const v = f.sakuya;
  const keys = [[44, null], [45.45, null],
    [45.85, [[0.14, 0.77, 0.12], [-0.14, 0.81, 0.14]]],
    [46.1, [[0.12, 0.79, 0.15], [-0.12, 0.84, 0.17]]],
    [46.4, [[0.03, 1.11, 0.2], [0.09, 0.89, 0.23]]],
    [46.65, [[0.02, 0.96, 0.35], [0.09, 1.10, 0.14]]],
    [47, [[0.14, 1.13, 0.39], [0.08, 1.14, 0.19]]],
    [47.3, [[0.16, 1.34, 0.37], [0.07, 1.01, 0.17]]],
    [47.6, [[0.15, 1.35, 0.34], [0.07, 1.03, 0.18]]],
    [47.85, [[0.1, 1.11, 0.17], [0.04, 1.05, 0.2]]],
    [48.05, [[0.1, 1.0, 0.16], [0.03, 0.95, 0.21]]],
    [48.3, [[0.15, 1.24, 0.28], [0.04, 0.87, 0.10]]],
    [48.85, [[0.15, 1.25, 0.29], [0.04, 0.88, 0.11]]],
    [49.0, [[0.15, 1.26, 0.30], [0.03, 0.9, 0.12]]],
    [49.14, [[0.13, 1.15, 0.50], [0.03, 0.94, 0.18]]],
    [49.4, [[0.12, 1.09, 0.50], [0.04, 0.92, 0.2]]]];
  let previous = null;
  sakuyaArmCurve = flow(keys.map(([t, targets]) => {
    v.root.scale.setScalar(1); v.j.chest.scale.setScalar(1);
    v.pose({ ...sakuyaArms(t), root: { pos: [0, 0, 0], rot: [0, 0, 0] } });
    if (targets) for (const [i, side] of ['L', 'R'].entries()) {
      const sign = side === 'L' ? 1 : -1;
      const pole = side === 'L' && t === 46.4 ? V(0.6, 1.2, 0.1) : V(sign * 0.4, 0.7, 0.15);
      v.reach(side, V(...targets[i]), pole);
      const wrist = v.j['wrist' + side];
      const palm = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, sign * 0.1));
      if (side === 'L' && ((t >= 47.3 && t <= 47.6) || (t >= 48.3 && t <= 49.0))) palm.setFromEuler(new THREE.Euler(0, 0, Math.PI - 0.15));
      wrist.quaternion.copy(wrist.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(palm));
    }
    const q = SAKUYA_JOINTS.map((n) => v.j[n].quaternion.clone());
    if (previous) q.forEach((p, i) => { if (p.dot(previous[i]) < 0) p.set(-p.x, -p.y, -p.z, -p.w); });
    previous = q;
    return [t, q.flatMap((p) => p.toArray())];
  }));
}
function poseSakuya(f, t, center) {
  ensureSakuyaArms(f);
  const v = f.sakuya, upright = smooth(prog(t, 45.25, 45.8));
  const grow = smooth(prog(t, 44, 44.24));
  v.root.visible = true;
  v.pose({ ...sakuyaArms(t), root: { pos: [0, 0, 0], rot: [0, 0, 0] },
    gripL: lerp(0.05 + upright * 0.22 + 0.25 * smooth(prog(t, 47, 47.25)), 0.92, smooth(prog(t, 48.05, 48.28))) * (1 - 0.9 * smooth(prog(t, 49.1, 49.25))),
    gripR: 0.08 + upright * 0.2 + 0.3 * smooth(prog(t, 47, 47.3)) + 0.4 * smooth(prog(t, 48, 48.3)),
    spreadL: (1.5 - upright - 0.3 * smooth(prog(t, 47, 47.25))) * (1 - smooth(prog(t, 48.05, 48.28))), spreadR: 1.5 - upright,
    hips: [0, 0, 3 * upright], neck: [0, 0.4 * sakuyaLook(t), -3 * upright], head: [0, 0.6 * sakuyaLook(t), 0],
    hipsPos: [0, -0.014 * upright * (1 + Math.cos((t - 45.95) * 2 * Math.PI / 0.421)), 0] });
  SAKUYA_JOINTS.forEach((n, i) => v.j[n].quaternion.fromArray(sakuyaArmCurve(t), i * 4).normalize());
  const modelScale = lerp(0.05, 0.1, grow) * sakuyaGrowth(t);
  v.root.scale.setScalar(modelScale);
  v.j.head.scale.set(1.32, 1.12, 1.25);
  v.j.chest.scale.set(1.10, 1, 1.12);
  // Overhead pirouette: the camera sees the crown and outstretched hands; the torso appears as she rights herself.
  const spin = (t - 44.8) * 9.2;
  const yaw = lerp(spin, sakuyaYaw(t) * D2R, upright);
  const localQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(sakuyaTilt(t) * D2R, yaw, 0, 'XYZ'));
  v.root.quaternion.copy(fracture.q).multiply(localQ);
  v.root.position.copy(center).sub(V(0, 1.12, 0).multiplyScalar(modelScale).applyQuaternion(v.root.quaternion));
  v.j.shoulderL.scale.setScalar(Math.max(0.02, grow)); v.j.shoulderR.scale.setScalar(Math.max(0.02, grow));
  const settle = smooth(prog(t, 46.8, 47.4));
  v.skirt.scale.set(lerp(1.22, 0.85, upright) * lerp(1, 0.78, settle), lerp(1, 1.2, upright) * lerp(1, 1.25, settle), lerp(1.15, 0.85, upright) * lerp(1, 0.78, settle));
  v.skirt.rotation.z = Math.sin(t * 7) * 0.05 * (1 - upright);
  v.update(t);
}

// ---------------------------------------------------------------- knife flight and Flandre (47 – 56.5)
const T_KNIFE = 49.133333, T_WING = 50.15;
let knifeThrow = null, flandreStage = null;
function sakuyaCenter(f, t) {
  poseFragments(f, t);
  return f.cupFragments.children[0].getWorldPosition(new THREE.Vector3());
}
function knifeHeld(f, t) {
  const hand = f.sakuya.j.handL;
  hand.updateMatrixWorld(true);
  f.knife.visible = t >= 48.18;
  f.knife.position.copy(hand.localToWorld(V(0.008, -0.053, 0)));
  const turn = smooth(prog(t, 49.0, T_KNIFE));
  f.knife.quaternion.copy(fracture.q).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), lerp(0.10, Math.PI / 2, turn)));
  f.knife.scale.set(1, Math.max(0.001, smooth(prog(t, 48.15, 48.28))), 1);
}
function ensureKnife(f) {
  if (knifeThrow) return;
  ensureFracture(f);
  const center = sakuyaCenter(f, T_KNIFE);
  poseSakuya(f, T_KNIFE, center); knifeHeld(f, T_KNIFE);
  const k = sakuyaFrame(T_KNIFE);
  framePoint(f, center, k, k[2] * sakuyaGrowth(T_KNIFE));
  const adjust = sakuyaCameraOffset(T_KNIFE);
  f.camera.translateX(adjust[0]); f.camera.translateY(adjust[1]); f.camera.translateZ(adjust[2]);
  knifeThrow = { p: f.knife.position.clone(), q: f.knife.quaternion.clone(), camera: f.camera.position.clone(),
    velocity: V(-3.4, 0, 0).applyQuaternion(fracture.q) };
  f.director.resetVisibility();
}
function knifeFlight(f, t) {
  f.knife.visible = true; f.knife.scale.setScalar(1);
  f.knife.position.copy(knifeThrow.p).addScaledVector(knifeThrow.velocity, t - T_KNIFE);
  f.knife.quaternion.copy(knifeThrow.q);
}
// The camera first lets the knife cross the frame, then overtakes it and travels along its edge.
const knifeFrame = flow([[49.3, [0.0, 0.56, 1.72]], [49.4, [0.253, 0.56, 1.72]],
  [49.5, [0.432, 0.56, 1.72]], [49.6, [0.535, 0.562, 1.59]], [49.7, [0.613, 0.563, 1.42]],
  [49.8, [0.707, 0.54, 1.16]], [49.9, [0.828, 0.518, 0.89]],
  [50, [1.097, 0.505, 0.65]], [50.1, [1.346, 0.493, 0.51]], [T_WING, [1.45, 0.49, 0.45]]]);
function knifeCamera(f, t) {
  const k = knifeFrame(t);
  framePoint(f, f.knife.position, k, k[2]);
  if (t < 49.3) f.camera.position.lerp(knifeThrow.camera, 1 - smooth(prog(t, T_KNIFE, 49.3)));
}
const flandreYaw = flow([[T_WING, 180], [51.6, 180], [52.3, 182], [52.55, 198], [52.8, 277], [53.1, 358], [56.5, 360]]);
const flandreLook = flow([[T_WING, 180], [51.55, 180], [51.85, 235], [52.2, 248], [52.5, 250], [52.8, 310], [53.1, 360], [56.5, 360]]);
const flandreWings = flow([[T_WING, [0, 0, 0]], [52.4, [0, 1, 0]], [52.8, [8, 3, 25]],
  [53.08, [0, 5, 75]], [53.35, [0, 4, 35]], [53.75, [0, 0, 0]], [56, [0, 1, 0]], [56.25, [0, 4, 0]], [56.5, [0, 3, 0]]]);
const flandreFrame = flow([[50.4, [1.8, 0.62, 0.78]], [50.6, [1.05, 0.58, 1.35]],
  [50.8, [0.74, 0.55, 1.75]], [51.1, [0.60, 0.55, 1.95]], [51.5, [0.57, 0.55, 1.97]],
  [52, [0.53, 0.55, 2.0]], [52.5, [0.52, 0.55, 2.0]], [53, [0.50, 0.52, 2.45]],
  [53.5, [0.50, 0.51, 2.55]], [54, [0.50, 0.51, 2.6]], [55, [0.50, 0.51, 2.57]],
  [56, [0.50, 0.53, 2.40]], [56.22, [0.50, 0.57, 2.08]], [56.5, [0.50, 0.58, 2.08]]]);
const flandreDolly = flow([[50.4, [0, 0]], [50.8, [0.035, -0.4]], [51.1, [0.05, -0.55]],
  [52.5, [0.05, -0.55]], [53.4, [0.05, -0.8]], [55, [0.05, -0.8]], [56.22, [0.08, -0.6]], [56.5, [0.08, -0.6]]]);
const flandreFraming = flow([[T_WING, [0, 0, 0]], [50.5, [0, 0, 0]], [50.7, [-0.025, 0.075, -0.05]],
  [51.1, [-0.05, 0.025, 0.025]], [51.7, [-0.075, 0.01, 0]], [52.2, [-0.1, 0, -0.025]], [52.5, [-0.075, 0, 0]],
  [53.3, [0, -0.025, 0]], [54.8, [0, 0.03, 0]], [55.8, [0, -0.04, 0.05]], [56.22, [0, -0.075, 0.15]], [56.5, [0, -0.075, 0.15]]]);
const wingArch = flow([[T_WING, 0.08], [50.2, 0.18], [50.4, 0.33], [50.6, 0.8], [50.8, 1]]);
const wingTipFrame = flow([[T_WING, [0.548, 0.49, 0.45]], [50.2, [0.31, 0.50, 0.24]],
  [50.3, [-0.08, 0.54, 0.33]], [50.4, [-0.35, 0.59, 0.48]], [50.5, [-0.55, 0.62, 0.65]], [50.8, [-0.6, 0.65, 1.15]]]);
let flandreArmCurve = null;
function ensureFlandreArms(f) {
  if (flandreArmCurve) return;
  const v = f.flandre, qkeys = [];
  const keys = [[50, [[0.14, 0.5, 0.04], [-0.14, 0.5, 0.04]]],
    [53.1, [[0.15, 0.5, 0.05], [-0.15, 0.5, 0.05]]],
    [53.4, [[0.15, 0.51, 0.05], [-0.33, 0.7, 0.18]]],
    [53.85, [[0.16, 0.52, 0.05], [-0.42, 0.69, 0.12]]],
    [54.15, [[0.18, 0.56, 0.1], [-0.42, 0.69, 0.12]]],
    [54.65, [[0.42, 0.69, 0.12], [-0.42, 0.70, 0.12]]],
    [55.8, [[0.43, 0.71, 0.12], [-0.43, 0.71, 0.12]]],
    [56.2, [[0.43, 0.73, 0.19], [-0.43, 0.73, 0.19]]],
    [56.5, [[0.44, 0.73, 0.2], [-0.44, 0.73, 0.2]]]];
  let previous;
  for (const [t, targets] of keys) {
    v.root.scale.setScalar(v.o.scale); v.pose({ root: { pos: [0, 0, 0], rot: [0, 0, 0] } });
    for (const [i, side] of ['L', 'R'].entries()) {
      const sign = side === 'L' ? 1 : -1;
      v.reach(side, V(...targets[i]).multiplyScalar(v.o.scale), V(sign * 0.3, 0.58, 0.03).multiplyScalar(v.o.scale));
      const q = handQuat(v, side, [0, 1, 0], [sign, 0, 0.1]);
      const wr = v.j['wrist' + side];
      wr.quaternion.copy(wr.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
    }
    const q = SAKUYA_JOINTS.map((n) => v.j[n].quaternion.clone());
    if (previous) q.forEach((p, i) => { if (p.dot(previous[i]) < 0) p.set(-p.x, -p.y, -p.z, -p.w); });
    qkeys.push([t, q.flatMap((p) => p.toArray())]); previous = q;
  }
  flandreArmCurve = flow(qkeys);
}
function poseFlandre(f, t, anchor) {
  ensureFlandreArms(f);
  const v = f.flandre, yaw = flandreYaw(t), look = flandreLook(t) - yaw;
  // the smile shows from 55.35 on the original, a thin line that widens into a grin as she bows at 56.15
  v.smile.visible = t >= 55.35;
  const grin = smooth(prog(t, 56.0, 56.2));
  v.smile.scale.set(1 + 0.7 * grin, 0.45 + 1.0 * grin, 1);
  const dip = 0.5 + 0.5 * Math.cos((t - 51.18) * 2 * Math.PI / BEAT), close = smooth(prog(t, 55.95, 56.23));
  v.root.visible = true;
  v.pose({ hipsPos: [0.008 * Math.sin(t * 2), -0.014 * dip, 0], chest: [3 * close, 0, 0],
    neck: [8 * close, 0.4 * look, 0], head: [12 * close + dip * 2, 0.6 * look, -8 * close],   // a slight bow: the original still shows her grin
    gripL: 0.04 + close * 0.62, gripR: 0.04 + close * 0.62, thumbL: close * 0.65, thumbR: close * 0.65,
    spreadL: 0.5, spreadR: 0.5 });
  v.j.neck.position.y += 0.045 * smooth(prog(t, 52.6, 53.3));
  const q = flandreArmCurve(t);
  SAKUYA_JOINTS.forEach((n, i) => v.j[n].quaternion.fromArray(q, i * 4).normalize());
  v.root.scale.setScalar(v.o.scale);
  v.j.head.scale.set(1.16, 1.16, 1.12);
  v.root.position.copy(anchor);
  v.root.quaternion.copy(fracture.q).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw * D2R));
  const w = flandreWings(t);
  v.poseWings(w, w);
  // The straight knife edge arches into the wing; crystals unfurl below it during the pull-back.
  const arch = wingArch(t);
  v.poseArch(arch);
  for (const crystal of v.crystals) {
    crystal.joint.position.y = (crystal.height + 0.014) * arch - 0.014;
    crystal.joint.scale.y = 0.75 * smooth(prog(t, T_WING, 50.18));
  }
  v.update(t);
}
function ensureFlandre(f) {
  if (flandreStage) return;
  ensureKnife(f); knifeFlight(f, T_WING); knifeCamera(f, T_WING);
  const tip = f.knife.localToWorld(V(0, 0.29, 0)), camera = f.camera.position.clone();
  poseFlandre(f, T_WING, V(0, 0, 0));
  const wingTip = f.flandre.j.wingTipL.getWorldPosition(new THREE.Vector3());
  flandreStage = { anchor: tip.sub(wingTip), camera };
  f.director.resetVisibility();
}
function flandreCamera(f, t) {
  const k = flandreFrame(t), target = f.flandre.root.localToWorld(V(0, 1.02, 0));
  framePoint(f, target, k, k[2]);
  const dolly = flandreDolly(t); f.camera.translateY(dolly[0]); f.camera.translateZ(dolly[1]);
  if (t < 50.8) {
    const bodyCamera = f.camera.position.clone(), tip = f.flandre.j.wingTipL.getWorldPosition(new THREE.Vector3()), w = wingTipFrame(t);
    framePoint(f, tip, w, w[2]);
    f.camera.position.lerp(bodyCamera, smooth(prog(t, 50.55, 50.8)));
    if (t < 50.2) f.camera.position.lerp(flandreStage.camera, 1 - smooth(prog(t, T_WING, 50.2)));
  }
  const adjust = flandreFraming(t);
  f.camera.translateX(adjust[0]); f.camera.translateY(adjust[1]); f.camera.translateZ(adjust[2]);
}

// ---------------------------------------------------------------- sword, garden and fan (56.5 – 70)
const T_TREE = 62.65, T_YUYUKO = 63.85;
let gardenStage = null;
// The tree shot's layout, in garden space (docs/05-transitions.md, section 18). The tree stands right of Youmu's
// close-up, so the camera's pull-back to the right sweeps its crown in from the right; the wide shot holds Yuyuko at
// the left and Youmu at the right, behind the tree. Yuyuko's close-up is turned 55° to the right of the wide shot
// (her mark, her facing and the camera's orientation), so the push-in ends in a pan right: the crown slides out to
// the left as she comes in from the right. As in the original, the crown first grows as the camera pushes in, then
// whips out over 63.65 – 63.77, drawn sharp (a short shutter). Each character changes mark only while both marks are
// outside the frame. Marks: pos (her root), yaw (degrees, about Y).
const TREE_AT = [4.3, 0.4, -3.6], YOUMU_WIDE = [6.6, 0, -5];
const YUYUKO_BG = { pos: [-2.3, 0.12, -5], yaw: 0 }, YUYUKO_WIDE = { pos: [1.2, 0.12, -5.6], yaw: 90 };
const YUYUKO_AT = { pos: [5.1, 0.12, 1.1], yaw: -55 };
const T_MARKS = 62.75, T_PUSH = 63.45, T_PAN = 63.65, T_CLOSE = 63.68, T_REVEAL = 63.77;
function yuyukoMark(t) { return t < T_MARKS ? YUYUKO_BG : t < T_CLOSE ? YUYUKO_WIDE : YUYUKO_AT; }
function nearYuyuko(p) { return gardenPointAt(YUYUKO_AT, p); }
function yuyukoQuat() {
  return gardenStage.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), YUYUKO_AT.yaw * D2R));
}
const flandrePush = flow([[56.5, [0, 0, 0]], [56.9, [0, -0.015, -0.17]],
  [57.4, [0, -0.065, -0.73]], [57.8, [0.025, -0.11, -1.13]], [T_GARDEN, [0.04, -0.13, -1.46]]]);
function bladeApproach(f, t) {
  poseFlandre(f, t, flandreStage.anchor); flandreCamera(f, t);
  const offset = flandrePush(t);
  f.camera.translateX(offset[0]); f.camera.translateY(offset[1]); f.camera.translateZ(offset[2]);
  // Enlarge the outgoing silhouette about the lens while keeping its projection, leaving room for the incoming blade.
  const depth = 1 + 12 * smooth(prog(t, 56.5, 57.05));
  f.flandre.root.position.sub(f.camera.position).multiplyScalar(depth).add(f.camera.position);
  f.flandre.root.scale.multiplyScalar(depth);
  f.flandre.root.updateMatrixWorld(true);
}
// Grip position (garden) and blade angle (degrees about the view axis, counter-clockwise from screen right,
// unwrapped). Timed on the full-rate sheet: up-left behind her head, a fast cut down to the right (60.57), held;
// then it whips up counter-clockwise (61.03 – 61.2) as the arm rises, and settles pointing down-left across her body
// from the raised hand (61.37), the arm lowering to shoulder height (61.7).
const swordGesture = flow([
  [T_GARDEN, [-0.38, 1.39, 0.12, 180]], [59.65, [-0.37, 1.38, 0.12, 178]],
  [60.02, [-0.28, 1.36, 0.1, 146]], [60.4, [-0.14, 1.31, 0.08, 136]],
  [60.6, [0.05, 1.0, 0.16, 290]], [60.78, [0.32, 0.91, 0.15, 314]],
  [60.97, [0.36, 0.94, 0.15, 312]], [61.07, [0.4, 1.02, 0.15, 445]],
  [61.2, [0.46, 1.22, 0.16, 545]], [61.37, [0.5, 1.32, 0.14, 585]],
  [61.55, [0.5, 1.3, 0.13, 588]], [61.85, [0.46, 1.2, 0.13, 572]],
  [62.23, [0.39, 1.04, 0.14, 565]], [62.6, [0.35, 0.99, 0.14, 563]], [63.5, [0.34, 0.98, 0.14, 563]],
]);
const youmuYaw = flow([[T_GARDEN, -90], [59.65, -86], [60.25, -28], [60.75, 4], [61.1, 18], [61.7, 36], [62.6, 44]]);
const youmuLook = flow([[T_GARDEN, -90], [59.65, -85], [60.15, -12], [60.5, 5], [61.15, 25], [62.6, 52]]);
const youmuFrame = flow([[58.7, [0.8, 0.49, 2.35]], [59.05, [0.68, 0.40, 2.95]],
  [59.5, [0.60, 0.39, 3.55]], [59.8, [0.56, 0.36, 3.6]], [60.3, [0.45, 0.23, 3.9]],
  [60.6, [0.44, 0.22, 3.85]], [61, [0.44, 0.23, 3.8]], [61.45, [0.45, 0.23, 3.5]],
  [61.8, [0.47, 0.21, 2.65]], [62.2, [0.48, 0.21, 2.35]], [62.65, [0.48, 0.22, 2.2]]]);
function gardenPoint(f, p) { return f.garden.localToWorld(V(...p)); }
// a point near Yuyuko, given as if she stood on her first mark ([-2.3, 0.12, -5], facing +Z), moved onto `mark`
function gardenPointAt(mark, p) {
  const d = V(p[0] + 2.3, p[1] - 0.12, p[2] + 5).applyAxisAngle(V(0, 1, 0), mark.yaw * D2R);
  return [d.x + mark.pos[0], d.y + mark.pos[1], d.z + mark.pos[2]];
}
function ensureGarden(f) {
  if (gardenStage) return;
  ensureFlandre(f); bladeApproach(f, T_GARDEN);
  const camera = f.camera.position.clone(), q = f.camera.quaternion.clone();
  const distance = 1.6, hh = distance * Math.tan(15 * D2R), hw = hh * f.camera.aspect;
  const localCamera = V(-0.38 - 1.3 * hw, 1.39 + 0.034 * hh, 0.12 + distance);
  f.garden.quaternion.copy(q); f.garden.position.copy(camera).sub(localCamera.applyQuaternion(q));
  f.garden.updateMatrixWorld(true);
  gardenStage = { camera, q };
  f.director.resetVisibility();
}
function poseYoumu(f, t) {
  const v = f.youmu, yaw = youmuYaw(t), look = youmuLook(t) - yaw;
  f.sword.traverse((o) => { if (o.isMesh) { o.material.depthTest = true; o.renderOrder = 0; } });
  const dip = 0.006 * Math.sin((t - 59.4) * Math.PI * 2 / BEAT);
  v.root.visible = true;
  v.pose({ root: { pos: [0, 0, 0], rot: [0, yaw, 0] }, hipsPos: [0, dip, 0],
    head: [3, look * 0.65, 0], neck: [0, look * 0.35, 0],
    hipL: [0, 0, 6], hipR: [0, 0, 6], gripL: 0.85, gripR: 0.94 });
  const k = swordGesture(t);
  f.sword.position.set(k[0], k[1], k[2]); f.sword.rotation.set(0, 0, k[3] * D2R); f.sword.scale.setScalar(1);
  const normal = V(0, 0, 1), fingers = V(0, -1, 0).applyAxisAngle(V(0, 0, 1), (k[3] - 180) * D2R);
  const X = normal.clone().negate(), Y = fingers.negate(), Z = new THREE.Vector3().crossVectors(X, Y);
  const q = f.garden.quaternion.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)));
  placeHand(v, 'L', gardenPoint(f, k.slice(0, 3)), q, gardenPoint(f, [0.23, 0.98, 0.35]));
  const left = flow([[58, [0.01, 0.73, 0.14]], [60.3, [-0.2, 0.73, 0.08]], [61.2, [-0.28, 0.68, 0.06]], [62.6, [-0.25, 0.76, 0.1]]])(t);
  const sheathing = smooth(prog(t, 61.2, 61.55));
  const sheathAngle = THREE.MathUtils.lerp(203, k[3] - 360, sheathing) * D2R;
  // The opening and the blade share an axis during insertion. The grip approaches the
  // opening by 46 cm as the arm lowers; the other hand holds the scabbard at its mouth.
  const sheathMouth = V(-0.23, THREE.MathUtils.lerp(0.76, k[1] + (-0.23 - k[0]) * Math.tan(k[3] * D2R), sheathing),
    THREE.MathUtils.lerp(0.1, k[2], sheathing));
  const sheathHand = V(...left).lerp(sheathMouth, sheathing);
  // (akimbo until the whirl, then the arm hangs by the sheath hilts: the elbow swings behind her)
  const pole = flow([[61.2, [-0.32, 0.95, 0.04]], [61.7, [-0.24, 0.9, -0.35]]])(t);
  placeHand(v, 'R', gardenPoint(f, sheathHand.toArray()), handQuat(v, 'R', [0, 0, 1], [0, -1, 0]), gardenPoint(f, pole));
  v.j.head.scale.setScalar(1.12);
  f.sword.scale.set(1.15 - 0.43 * smooth(prog(t, 58.6, 59.3)) + 0.65 * smooth(prog(t, 60.35, 60.7)), 1, 1);
  f.sword.userData.blade.scale.y = 1 + 1.7 * (1 - smooth(prog(t, T_GARDEN, 58.8)));
  v.skirt.rotation.z = 0.035 * Math.sin((t - 60) * 4) * smooth(prog(t, 59.6, 60.5));
  v.update(t);
  // Both scabbards are worn across the back of her waist, crossing in a shallow X that sticks out on either side of
  // her (as on the original); they turn with her hips. The empty one leaves her waist for the sheathing, its
  // opening on the blade's axis.
  f.sheaths.forEach((s, i) => {
    const [p, q] = wornSheath(f, v, ...SHEATH_WORN[i]);
    s.visible = true; s.position.copy(p); s.quaternion.copy(q); s.scale.setScalar(1);
  });
  const drawn = f.sheaths[0];
  drawn.position.lerp(sheathMouth, sheathing);
  drawn.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), sheathAngle), sheathing);
}
// Worn scabbards in her hips' space (+X her left, +Y up, +Z forward): the origin (the empty one's opening, the short
// sword's grip) and the axis toward the tip. Each runs from one hip, in front, across to behind the other, rising a
// little, so they read as an X from the front and still stick out front and back in profile.
const SHEATH_WORN = [[[-0.4, -0.08, 0.3], [1, 0.3, -0.75]], [[0.34, -0.05, 0.26], [-1, 0.3, -0.75]]];
function wornSheath(f, v, origin, axis) {
  const hips = v.j.hips;
  hips.updateMatrixWorld(true);
  const toGarden = f.garden.quaternion.clone().invert().multiply(hips.getWorldQuaternion(new THREE.Quaternion()));
  const x = V(...axis).normalize(), y = V(0, 1, 0).addScaledVector(x, -x.y).normalize(), z = new THREE.Vector3().crossVectors(x, y);
  const q = toGarden.multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)));
  return [f.garden.worldToLocal(hips.localToWorld(V(...origin))), q];
}
const fanLift = flow([[63, [0, 0]], [65.35, [0, 0]], [65.62, [0.12, 0.35]], [66, [1, 1]], [70, [1, 1]]]);
// [body yaw, head look] in degrees. The head turns into profile over 67.0 – 67.5 s (timed on the full-rate
// sheet) and the body follows; the look passes 90° late in the shot because the camera travels right, so her
// profile stays square to the viewing ray.
const yuyukoYaw = flow([[58, [0, 0]], [63.8, [0, 0]], [65.5, [0, -3]], [66.8, [0, -2]], [67.0, [2, 4]],
  [67.15, [9, 33]], [67.3, [22, 66]], [67.5, [42, 90]], [67.8, [62, 97]], [68.3, [76, 100]],
  [68.9, [83, 101]], [69.4, [86, 104]], [70, [88, 108]]]);
// On her first mark she glides in from the left and settles (garden X, metres): on the original she enters the
// frame's left edge at 59.0 and eases to rest by 59.5, moving right while Youmu drifts left in the pull-back.
const yuyukoGlide = flow([[T_GARDEN, -5.4], [58.95, -1.33], [59.03, -0.9], [59.1, -0.58], [59.17, -0.41],
  [59.23, -0.28], [59.3, -0.17], [59.4, -0.06], [59.53, 0], [60, 0]]);
function poseYuyuko(f, t) {
  const v = f.yuyuko, [open, lift] = fanLift(t), mark = yuyukoMark(t);
  const [yaw, look] = yuyukoYaw(t).map((a) => a + mark.yaw);   // (in the wide shot she faces the tree)
  const sway = Math.sin((t - 64) * Math.PI * 2 / 1.69), dip = Math.cos((t - 64.05) * Math.PI * 2 / BEAT);
  v.root.visible = true;
  const pos = mark === YUYUKO_BG ? [mark.pos[0] + yuyukoGlide(t), mark.pos[1], mark.pos[2]] : mark.pos;
  v.pose({ root: { pos, rot: [0, yaw, 0] }, hipsPos: [0.009 * sway, -0.006 * dip, 0],
    neck: [0, (look - yaw) * 0.4, -1.2 * sway], head: [2 + 1.3 * dip, (look - yaw) * 0.6, -1.8 * sway],
    shoulderL: [-12, 0, 8], elbowL: [-25, 0, 0],
    shoulderR: [0, 0, 6], elbowR: [-15, 0, 0], gripR: 0.8 });
  v.root.scale.setScalar(v.o.scale * (mark === YUYUKO_BG ? 0.92 : 1));
  const target = gardenPoint(f, gardenPointAt(mark, [-2.3 + 0.18, 1.05, -4.95]));
  if (lift > 0) {
    const q = handQuat(v, 'L', [0, 0, 1], [0, -1, 0]);
    const start = v.j.handL.localToWorld(V(-0.012, -0.042, 0));
    placeHand(v, 'L', start.lerp(target, lift), q, gardenPoint(f, gardenPointAt(mark, [-1.95, 1.1, -4.9])));
  }
  v.update(t, { sway: 0.3 });
  const hand = v.j.handL;
  f.fan.visible = t >= 65.35;
  f.fan.position.copy(f.garden.worldToLocal(hand.localToWorld(V(-0.012, -0.042, 0))));
  f.fan.rotation.set(0, mark.yaw * D2R, -1.02 + lift * 0.14);   // (the fan faces her camera, turned with her mark)
  f.fan.scale.set(0.017 + open * 0.663, 0.68, 0.68);
}
function gardenAtmosphere(f, t) {
  f.garden.visible = true; f.yuyuko.root.visible = true; f.sword.visible = t < 63.8; f.youmu.root.visible = t < 63.8;
  f.ghost.visible = t < 63.8; f.petals.visible = true; f.petals.userData.update(t);
  f.heroPetal.visible = false;
  const ghost = flow([[58, [0.7, 1.88, -0.2, -20]], [59.2, [0.8, 1.91, -0.3, 170]],
    [60.3, [0.7, 1.91, -0.3, 5]], [61.1, [0.7, 1.92, -0.4, -12]], [62.6, [1.0, 2.25, -0.5, -30]], [63.8, [1, 2.25, -0.5, -30]]])(t);
  f.ghost.position.fromArray(ghost); f.ghost.rotation.set(0, 0, ghost[3] * D2R);
  f.cherryTree.visible = t >= T_TREE;
  f.cherryTree.position.fromArray(TREE_AT); f.cherryTree.rotation.y = -0.25; f.cherryTree.scale.set(1.35, 1.15, 1);
  f.sheaths.forEach((s) => { s.visible = t < 63.8; });
}
function youmuCamera(f, t) {
  const k = youmuFrame(t);
  framePoint(f, gardenPoint(f, [0, 1.43, 0]), k, k[2], gardenStage.q);
  if (t < 58.7) {
    const body = f.camera.position.clone();
    framePoint(f, gardenPoint(f, [-0.38, 1.39, 0.12]), [1.15, 0.517], 1.6, gardenStage.q);
    f.camera.position.lerp(body, smooth(prog(t, T_GARDEN, 58.7)));
  }
}
// Garden-space camera positions (the orientation stays gardenStage.q); the first and last keys are the outgoing
// and incoming cameras, solved once.
let treePath = null;
function ensureTreePath(f) {
  if (treePath) return;
  const local = () => f.garden.worldToLocal(f.camera.position.clone()).toArray();
  youmuCamera(f, T_TREE); const from = local();
  yuyukoCamera(f, T_REVEAL); const to = local();
  treePath = flow([[T_TREE, from], [62.8, [3.2, 1.8, 1.2]], [62.87, [3.5, 1.9, 1.5]],
    [63.25, [3.85, 2.3, 3.6]], [T_PUSH, [3.85, 2.3, 3.7]], [T_PAN, [3.72, 1.8, 2.45]], [T_REVEAL, to]]);
}
const yuyukoFrame = flow([[63.85, [0.36, 0.63, 1.13]], [64.2, [0.40, 0.63, 1.19]], [64.5, [0.53, 0.62, 1.16]],
  [64.95, [0.37, 0.61, 1.13]], [65.5, [0.42, 0.62, 1.13]], [65.95, [0.29, 0.61, 1.15]],
  [66.5, [0.45, 0.64, 1.14]], [67, [0.43, 0.61, 1.14]], [67.5, [0.38, 0.64, 1.12]],
  [68, [0.41, 0.62, 1.11]], [68.5, [0.41, 0.67, 1.16]], [69, [0.35, 0.70, 1.11]],
  [69.4, [0.25, 0.71, 1.06]], [69.7, [0.10, 0.74, 1.03]], [70, [-0.08, 0.83, 1.00]],
  [70.5, [-0.65, 0.92, 1.00]]]);
// Head-centre measurements every six reference frames correct the sway between the close-up keys.
const yuyukoSwayCorrection = flow([
  [63.85, 0], [64.0, 0.0116], [64.2, 0.1104], [64.4, 0.2005], [64.6, 0.154],
  [64.8, 0.0073], [65.0, -0.0668], [65.2, -0.1104], [65.4, -0.032], [65.6, -0.016],
  [65.8, -0.0218], [66.0, 0.0102], [66.2, 0.0334], [66.4, 0.0538], [66.6, -0.0044],
  [66.8, -0.0625], [67.0, -0.0988], [67.2, -0.0465], [67.4, -0.032], [67.6, 0.0044],
  [67.8, 0.0567], [68.0, -0.0145], [68.2, -0.0421], [68.4, -0.0654], [68.6, -0.0756],
  [68.8, -0.0349], [69.0, -0.0044], [69.2, 0.032], [69.4, 0.077], [69.6, 0.0552],
  [69.8, 0.0131], [70, 0],
]);
function yuyukoCamera(f, t) {
  // The distance factor was measured (head extents, every 0.2 s) after her head was enlarged for the profile.
  const k = yuyukoFrame(t);
  framePoint(f, gardenPoint(f, nearYuyuko([-2.3, 1.38, -5])), k, k[2] * 1.08, yuyukoQuat());
  const adjust = flow([[63.85, [0.105, -0.015, 0.18]], [64, [0.105, -0.015, 0.18]],
    [66, [0.12, 0, 0.105]], [68, [0.135, 0.06, 0]], [69, [0.04, 0.06, -0.04]], [70, [-0.12, 0.045, -0.18]]])(t);
  f.camera.translateX(adjust[0] + yuyukoSwayCorrection(t)); f.camera.translateY(adjust[1]); f.camera.translateZ(adjust[2]);
}

// Framing and tumble of the single foreground petal, keyed from the reference.
const heroPetalTrack = flow([[68.1, [0.78, 0.27, 0.026, -50, 40]],
  [68.5, [0.64, 0.33, 0.04, 35, 30]], [69, [0.595, 0.415, 0.046, -80, 65]],
  [69.5, [0.56, 0.33, 0.09, 12, 0]], [70, [0.49, 0.38, 0.105, 45, 72]],
  [70.5, [0.47, 0.50, 0.32, 40, 77]]]);
function poseHeroPetal(f, t) {
  f.heroPetal.visible = t >= 68.1;
  const [x, y, height, roll, yaw] = heroPetalTrack(t), distance = 0.65;
  const hh = distance * Math.tan(f.camera.fov * D2R / 2);
  const p = V((2 * x - 1) * hh * f.camera.aspect, (1 - 2 * y) * hh, -distance)
    .applyQuaternion(f.camera.quaternion).add(f.camera.position);
  f.heroPetal.position.copy(f.garden.worldToLocal(p));
  f.heroPetal.quaternion.copy(f.garden.quaternion).invert().multiply(f.camera.quaternion)
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw * D2R, roll * D2R, 'ZYX')));
  f.heroPetal.scale.setScalar(height * hh * 2);
}

// Patchouli shrinks away about her chest (inside Remilia's head as the camera sees it).
function shrinkPatchouli(f, t) {
  const k = 1 - smooth(prog(t, T_SWAP0, T_SWAP1));
  const v = f.patchouli;
  v.j.shoulderR.visible = t < T_SWAP;
  // her head goes first, into Remilia's (the original shows Remilia's head at the top right from 36.43)
  v.j.neck.scale.setScalar(Math.max(1e-4, 1 - smooth(prog(t, 36.37, 36.47))));
  if (k <= 0) { v.root.visible = false; return; }
  const piv = f.stage.worldToLocal(v.j.chest.getWorldPosition(new THREE.Vector3()));
  v.root.position.sub(piv).multiplyScalar(k).add(piv);
  v.root.scale.multiplyScalar(k);
  v.root.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- the shots
export const SHOTS = [
  // 0 – 7.3: Reimu. The camera starts right on her chest (all black) and pulls straight back while she
  // bops, then pushes in and swings round to her left profile as she raises the apple.
  {
    name: 'reimu-opening', t0: 0, t1: 7.3, shutter: 1 / 40, fast: [[6.8, 7.3]],
    apply(f, t) {
      setPalette(0);
      f.apple.userData.setBites([]);
      f.reimu.root.visible = true; f.apple.visible = true; f.cliff.visible = true;
      poseReimu(f, t);
      appleInReimuHand(f);
      // The camera waits on her chest (all black, even as she sways), then the pull-back drifts toward her
      // left shoulder's edge (so white enters from the right at 1.5 s), runs fast (0.8 m/s) and slows to about 0.5 m/s. Distances and heights were measured on the
      // original: head and shoulders fill the frame at 2.5 s, the head reaches the top at 3.3 s, the bow's
      // top at 4.1 s.
      const PULL = [
        [0, { az: 0.06, el: 0.02, dist: 0.09, x: 0.0, y: 1.12, z: 0, fov: 30 }],
        [1.38, { az: 0.06, el: 0.02, dist: 0.11, x: 0.07, y: 1.15, z: 0, fov: 30 }],
        [1.55, { az: 0.05, el: 0.02, dist: 0.22, x: 0.1, y: 1.15, z: 0, fov: 30 }],
        [1.9, { az: 0.05, el: 0.02, dist: 0.5, x: 0.08, y: 1.13, z: 0, fov: 30 }],
        [2.5, { az: 0.04, el: 0.02, dist: 0.95, x: -0.05, y: 1.08, z: 0, fov: 30 }],
        [3.3, { az: 0.03, el: 0.02, dist: 1.32, x: 0.015, y: 1.13, z: 0, fov: 30 }],
        [4.6, { az: 0.02, el: 0.02, dist: 2.06, x: 0, y: 1.12, z: 0, fov: 30 }],
        [5.2, { az: 0.0, el: 0.02, dist: 2.22, x: 0, y: 1.09, z: 0, fov: 30 }],
        [6.55, { az: -0.05, el: 0.0, dist: 2.3, x: 0, y: 1.1, z: 0, fov: 30 }],
      ];
      // the pull-back on a motion curve through the measured distances (no speed jumps at the keys); the swoop
      // round to her profile is a push-in accelerating into the orbit, a blur in the original, kept as eases
      const c = t < 6.55 ? flow(PULL)(t) : track([
        PULL[PULL.length - 1],
        [7.02, { az: 0.55, el: 0.02, dist: 1.05, x: 0, y: 1.24, z: 0.05, fov: 30 }, 'in'],
        [7.3, { az: Math.PI / 2 + 0.05, el: 0.02, dist: 1.3, x: 0, y: 1.2, z: 0.14, fov: 30 }, 'out'],
      ])(t);
      camOrbit(f.camera, V(c.x, c.y, c.z), c.az, c.el, c.dist, c.fov);
    },
    btsFrame: (f) => [btsBody(f.reimu, 0.95), { at: f.apple.position.clone(), r: 0.1 }], btsDist: 3,
  },

  // 7.3 – 12.0: profile, apple held up; slow push-in; she lowers it, winds up and throws.
  {
    name: 'reimu-apple', t0: 7.3, t1: T_RELEASE, shutter: 1 / 36, fast: [[11.0, 12.0]],
    apply(f, t) {
      setPalette(0);
      f.apple.userData.setBites([]);
      f.reimu.root.visible = true; f.apple.visible = true; f.cliff.visible = true;
      poseReimu(f, t);
      appleInReimuHand(f);
      const c = spline([
        [7.3, [Math.PI / 2 + 0.05, 1.3, 1.2, 0.14]],
        [8.5, [Math.PI / 2 + 0.02, 1.2, 1.21, 0.17]],
        [10.5, [Math.PI / 2 - 0.04, 1.08, 1.21, 0.22]],
        [11.05, [Math.PI / 2 - 0.05, 1.04, 1.22, 0.18]],
        [11.5, [Math.PI / 2 - 0.02, 1.0, 1.26, 0.3]],
        [11.8, [Math.PI / 2 + 0.03, 1.1, 1.24, 0.44]],
        [12.0, [Math.PI / 2 + 0.06, 1.1, 1.3, 0.46]],
      ])(t);
      camOrbit(f.camera, V(0, c[2], c[3]), c[0], 0.02, c[1], 30);
      const framing = smooth(prog(t, 7.3, 7.8)) * (1 - smooth(prog(t, 10.9, 11.7)));
      f.camera.translateZ(0.1625 * framing);
    },
    btsFrame: (f) => [btsBody(f.reimu, 0.95), { at: f.apple.position.clone(), r: 0.1 }], btsDist: 3,
  },

  // 12.0 – T_FLIP: the apple flies up; the camera cranes after it (it re-enters from the top), then
  // tracks it as it keeps climbing. Marisa flies in over it from the right and snatches it.
  {
    name: 'apple-rise', t0: T_RELEASE, t1: T_FLIP, shutter: 1 / 36, fast: [[12.0, 12.5], [14.5, 14.8]],
    apply(f, t) {
      setPalette(0);
      ensureRelease(f);
      ensureCatch(f);
      f.apple.userData.setBites([]);
      f.reimu.root.visible = t < 12.6; f.cliff.visible = true; f.apple.visible = true;
      poseReimu(f, t);
      applePos(t, f.apple.position);
      const s = t - T_RELEASE;
      f.apple.rotation.set(0.4 + s * 1.9, s * 1.2, 0.3 + s * 0.8);
      const c = appleCam(f, t);
      camLook(f.camera, c.pos, c.tgt, 30);
      // Marisa comes in from the right (screen right = -Z), the broom passing just above the apple.
      if (t > 14.4) {
        poseRider(f, t);
        applePos(t, f.apple.position);                 // the IK solve used the apple; put it back in flight
        f.apple.rotation.set(0.4 + s * 1.9, s * 1.2, 0.3 + s * 0.8);
      }
    },
    // witness camera: Reimu and the apple leaving her, then the apple climbing and Marisa coming in for the catch
    btsFrame: (f, t) => [
      { at: applePos(t, new THREE.Vector3()), r: 0.3 },
      { ...btsBody(f.reimu, 0.95), w: 1 - smooth(prog(t, 12.6, 13.6)) },
      ...(t > 14.4 ? [{ at: f.rider.position.clone().add(V(0, 0.8, 0)), r: 1.1, w: smooth(prog(t, 14.4, 14.7)) }] : []),
    ],
    btsDist: 2.5,
    btsExtras: (f, t) => { f.reimu.root.visible = true; f.cliff.visible = true; },
  },

  // T_FLIP – 24.4: the night. The palette inverts on the catch, framing unchanged; then the camera flies
  // with Marisa.
  {
    name: 'night-flight', t0: T_FLIP, t1: T_DROP, shutter: 1 / 30, fast: [[15.2, 16.1], [16.7, 17.6], [21.1, 22.3]],
    apply(f, t) {
      setPalette(1);
      ensureRelease(f);
      ensureCatch(f);
      ensureBites(f);   // one-time solves (they pose the scene at other times, so do them before posing)
      placeCastle(f);
      // (the castle leaves the bottom of the frame in the push-in onto her arm; it stays out of the close-up)
      f.stars.visible = true; f.dust.visible = true; f.castle.visible = t < 25.4;
      poseRider(f, t);
      appleInRiderHand(f);
      f.apple.visible = t < T_CORE;
      if (t >= T_CORE) { f.core.visible = true; coreInRiderHand(f, t); }
      f.apple.userData.setBites(biteMarks.filter((b) => t >= b.t + 0.1));
      // camera path in rider-local coordinates: [pos xyz, target xyz, fov, roll]
      if (!nightPath) {
        // The first beat continues the apple shot's camera exactly (rider unrotated at T_FLIP).
        // A motion curve through the keys (the old uniform spline drifted toward the whip during the hold after the
        // catch, and jumped speed at unevenly spaced keys); keys at 16.0 – 17.45, 21.35 – 21.95 and 26.1 are samples
        // of that old path where its shape matched the original better.
        const c = appleCam(f, T_FLIP);
        const o = CATCH.clone().add(RIDER_OFF);
        const cp = c.pos.sub(o), ct = c.tgt.sub(o);
        nightPath = flow([
          [T_FLIP, [cp.x, cp.y, cp.z, ct.x, ct.y, ct.z, 30, 0]],
          [15.26, [cp.x, cp.y + 0.02, cp.z, ct.x, ct.y + 0.03, ct.z, 30, 0]],
          // whip to her left side, below the broom: the broom and her body cross the top of the frame, then
          // the camera drifts along the broom (bristles on the right)
          [15.42, [1.3, 0.3, 0.35, 0.0, 0.6, -0.2, 32, 0]],
          [15.55, [1.45, 0.53, -0.15, 0.0, 0.7, -0.45, 32, 0]],
          [15.72, [1.4, 0.63, -0.45, 0.0, 0.74, -0.62, 32, 0]],
          // rise to her head: on her left, a little below, her face in profile, the apple coming to her mouth
          [15.9, [0.95, 0.95, 0.1, 0.06, 1.2, 0.0, 32, 0]],
          [16.0, [0.842, 1.068, 0.204, 0.065, 1.264, 0.102, 32, 0]],
          [16.15, [0.75, 1.2, 0.27, 0.06, 1.28, 0.15, 32, 0]],
          [16.4, [0.729, 1.206, 0.274, 0.059, 1.275, 0.159, 32, 0]],
          [16.8, [0.75, 1.18, 0.27, 0.05, 1.26, 0.14, 32, 0]],
          // pull back and round to her left side, revealing hat, apple and broom
          [17.2, [0.9, 1.3, 0.45, 0.0, 1.35, 0.1, 32, 0]],
          [17.3, [1.064, 1.294, 0.381, -0.004, 1.311, 0.111, 31.594, 0]],
          [17.45, [1.407, 1.258, 0.196, -0.002, 1.209, 0.142, 30.691, 0]],
          [17.6, [2.0, 1.2, 0.05, 0.0, 1.1, 0.15, 30, 0]],
          [18.2, [5.0, 0.95, 0.05, 0.0, 0.85, 0.0, 30, 0]],
          [18.8, [6.2, 0.8, 0.0, 0.0, 0.7, 0.23, 30, 0]],
          [21.1, [6.5, 0.8, 0.0, 0.0, 0.7, 0.23, 30, 0]],
          [21.35, [6.188, 0.813, -0.912, -0.256, 0.884, 0.071, 30, 0]],
          [21.6, [5.5, 0.9, -2.2, -0.6, 0.95, 0.4, 30, 0]],
          // behind her, from above her left shoulder: the bristles fan out to the lower right, the legs
          // hanging on her left are foreshortened below her
          [21.8, [4.53, 1.107, -3.35, -0.877, 0.653, 1.716, 30, 0]],
          [21.95, [3.655, 1.305, -4.282, -1.093, 0.326, 3.027, 30, 0]],
          [22.15, [2.8, 1.5, -5.2, -1.3, 0.0, 4.3, 30, 0]],
          [24.5, [2.8, 1.5, -5.4, -1.3, 0.0, 4.1, 30, 0]],
          [24.95, [2.8, 1.5, -5.45, -1.3, 0.0, 4.05, 30, 0]],
          // she holds the core out to her left side; the camera rushes in from behind and below her, onto her
          // arm (the castle drops out of the bottom left). Keys solved against the original (tools/tune.mjs).
          [25.1, [2.3, 0.925, -3.75, -0.5, 0.5, 2.775, 30, 0]],
          [25.2, [1.95, 0.55, -3.1, 0.1, 0.85, 1.4, 30, 0]],
          [25.3, [1.475, 0.75, -2.775, 0.2, 0.85, 1.525, 30, 0]],
          [25.45, [1.05, 0.745, -1.66, 0.5, 0.97, 0.556, 30, 0]],
          [25.7, [0.316, 1.0, -0.71, 0.508, 0.996, 0.2, 30, 0]],
          [26.1, [0.272, 1.014, -0.669, 0.507, 0.997, 0.18, 30, 0]],
          [26.42, [0.31, 1.0, -0.73, 0.505, 0.996, 0.2, 30, 0]],
        ]);
      }
      const k = nightPath(t);
      const pos = riderPoint(f, k[0], k[1], k[2], new THREE.Vector3());
      const tgt = riderPoint(f, k[3], k[4], k[5], new THREE.Vector3());
      // In the wide shot the rider bobs slowly on screen (measured on the original: highest at 19.5 s, lowest at
      // 20.45 s, about ±3% of the frame). The camera flies with her, so the bob is applied to the camera.
      const wb = smooth(prog(t, 18.3, 18.8)) * (1 - smooth(prog(t, 21.1, 21.5)));
      const dy = wb * (0.1 + 0.09 * Math.cos((2 * Math.PI * (t - 19.5)) / 1.9));
      pos.y -= dy; tgt.y -= dy;
      // keep the camera level (don't inherit the rider's bank)
      camLook(f.camera, pos, tgt, k[6], k[7] || 0);
      const whipPush = smooth(prog(t, 15.32, 15.48)) * (1 - smooth(prog(t, 15.72, 15.9)));
      f.camera.translateZ(-0.3 * whipPush);
      const biteFrame = smooth(prog(t, 15.9, 16.15)) * (1 - smooth(prog(t, 16.8, 17.2)));
      f.camera.translateX(-0.025 * biteFrame); f.camera.translateZ(0.0375 * biteFrame);
      const coreFrame = smooth(prog(t, 25.7, 25.95)) * (1 - smooth(prog(t, 26.3, T_DROP)));
      f.camera.translateX(-0.01875 * coreFrame); f.camera.translateY(-0.00625 * coreFrame); f.camera.translateZ(0.025 * coreFrame);
      f.stars.position.copy(f.camera.position);
      f.dust.position.set(CATCH.x, CATCH.y, CATCH.z + 40);   // the dust box's long axis runs along the flight (+Z)
      f.dust.rotation.y = Math.PI / 2;
    },
    btsFrame: (f) => [{ at: f.rider.position.clone().add(V(0, 0.8, 0)), r: 1.2 }], btsDist: 4,
    groundY: (f) => f.rider.position.y - 2.5,
  },

  // T_DROP – T_MORPH: she lets go; the camera drops with the tumbling core. The palette wipes back to white on
  // black ink (27.25 – 27.4), and the core swells to the size of a person.
  {
    name: 'core-fall', t0: T_DROP, t1: T_MORPH, shutter: (t) => lerp(1 / 75, 1 / 30, smooth(prog(t, 26.55, 26.85))), fast: [[T_DROP, 26.7], [T_WIPE0, T_WIPE1], [27.95, T_MORPH]],
    apply(f, t) {
      ensureRelease(f); ensureCatch(f); ensureBites(f); placeCastle(f); ensureFall(f);
      const night = t < T_WIPE1;
      setPalette(night ? 1 : 0);
      if (night && t >= T_WIPE0) f.wipe = WIPE_K(t);
      if (t < 26.9) {                  // she flies on, her hand rising, out of the frame
        poseRider(f, t);
      }
      f.core.visible = true;
      const C = poseFallingCore(f, t);
      const d = CORE_K * coreScale(t) / Math.sqrt(fall.area(t));
      trackCam(f, C, fall.screen(t), d);
    },
    btsTarget: (f, t) => coreCentre(t), btsDist: (f, t) => 0.9 + coreScale(t) * 0.35, btsAngle: 1.4,
    groundY: (f, t) => coreCentre(t).y - 2,
  },

  // T_MORPH – end: the core turns into Patchouli, who rights herself, lands and stands; the camera pushes in on
  // her gestures down to the raised finger.
  {
    name: 'patchouli', t0: T_MORPH, t1: T_REM,
    // a short shutter in the close-up keeps the wagging finger as crisp as the original's drawings
    shutter: (t) => lerp(1 / 36, 1 / 90, smooth(prog(t, 34.02, 34.12))), fast: [[T_MORPH, 28.7], [32.0, 32.5], [33.5, 34.2]],
    apply(f, t) {
      ensureRelease(f); ensureCatch(f); ensureBites(f); placeCastle(f); ensureFall(f); ensureStage(f); ensureArm(f);
      setPalette(0);
      const v = f.patchouli;
      v.root.visible = true; f.floor.visible = true;
      v.j.neck.scale.setScalar(1);
      v.j.shoulderR.visible = true;
      const yaw = posePatchouli(f, t);
      // the morph: she grows out of the core as it shrinks inside her
      const grow = smooth(prog(t, T_MORPH - 0.04, 28.55));
      const scale = PAT_SCALE * lerp(0.75, 1, grow);
      // her roll: counter-clockwise on screen is a turn about the axis pointing at the camera (-F)
      const qRoll = new THREE.Quaternion().setFromAxisAngle(fall.F, -(ROLL(t) - 90) * D2R);
      const qStage = f.stage.quaternion.clone();
      const qYaw = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw * D2R, 0));
      const qWorld = qRoll.clone().multiply(qStage).multiply(qYaw);
      const root = patchouliRoot(t, qRoll, scale / PAT_SCALE, new THREE.Vector3());
      // into stage space
      v.root.position.copy(f.stage.worldToLocal(root.clone()));
      v.root.quaternion.copy(qStage.clone().invert().multiply(qWorld));
      v.root.scale.setScalar(scale);
      v.root.updateMatrixWorld(true);
      armIK(f, t);
      poseArm(f, t);
      // as she turns away (32 s) her hair swings out behind her
      const swing = Math.sin(Math.PI * prog(t, 31.9, 32.6)) ** 2;
      v.update(t, { wind: f.stage.localToWorld(V(0, 0, 0.22 * swing)).sub(f.stage.position) });
      const kc = smooth(prog(t, T_MORPH, 28.58));
      if (kc < 1) {
        f.core.visible = true;
        const S = CORE_BIG * (1 - kc);
        const hips = v.j.hips.getWorldPosition(new THREE.Vector3());
        const stem = V(0, 1, 0).applyQuaternion(qRoll);
        const z = fall.F.clone().negate(), x = new THREE.Vector3().crossVectors(stem, z);
        f.core.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, stem, z));
        f.core.scale.setScalar(Math.max(S, 1e-3));
        f.core.position.copy(hips).addScaledVector(stem, CORE_MID * S);
      }
      // camera: tracking her hips on the measured path, then the stage-space path
      const hips = v.j.hips.getWorldPosition(new THREE.Vector3());
      if (t < T_PATH) {
        const d = lerp(stage.d0, 3.75, smooth(prog(t, T_MORPH, T_PATH)));
        trackCam(f, hips, PAT_SCREEN(t), d);
        return;
      }
      stageCam(f, t);
    },
    btsFrame: (f) => [{ at: f.patchouli.j.hips.getWorldPosition(new THREE.Vector3()), r: 1.0 }], btsDist: 3.5,
  },

  // T_REM – 41: Patchouli turns into Remilia, who bops, turns with a teacup held out and lets it drop.
  {
    name: 'remilia', t0: T_REM, t1: 41.0,
    // (the original's pull-back through the morph is sharp: a short shutter until she stands there)
    // (and while the camera drops with the cup: her arm stays about as crisp as the original's)
    shutter: (t) => lerp(1 / 90, 1 / 36, smooth(prog(t, 36.65, 36.85))) * lerp(1, 0.6, smooth(prog(t, 40.5, 40.65))), fast: [[36.35, 36.9], [38.95, 39.45], [40.45, 41.2]],
    apply(f, t) {
      const pat = SHOTS.find((s) => s.name === 'patchouli');
      ensureSwap(f);                      // (poses Patchouli at T_SWAP: before posing this time)
      patHandNow = null;
      if (t < T_SWAP1) {
        pat.apply(f, t);                  // poses her and places the camera
        if (t <= T_SWAP) patHandNow = readPatHand(f, t);
        shrinkPatchouli(f, t);
      } else {
        ensureRelease(f); ensureCatch(f); ensureBites(f); placeCastle(f); ensureFall(f); ensureStage(f); ensureArm(f);
        setPalette(0);
        f.floor.visible = true;
        f.patchouli.root.visible = false;   // (the one-time solves pose her; she is gone by now)
        f.core.visible = false;
      }
      if (t >= T_CUP) { ensureCupDrop(f); ensureCupCam(f); }   // (these pose her at other times: before posing this one)
      poseRemilia(f, t);
      poseCup(f, t);
      if (t >= T_CUP) cupCam(f, t);
      else if (t >= T_SWAP1) stageCam(f, t);
    },
    // witness camera: from the side, between the film camera and the drop, following the cup down after T_CUP
    btsFrame: (f) => [btsBody(f.remilia, 1.05), { at: f.cup.position.clone(), r: 0.15 }], btsDist: 3.2,
    groundY: (f) => f.stage.position.y - 0.001,
  },
  {
    name: 'cup-shatter', t0: 41, t1: 44,
    shutter: 1 / 90,
    apply(f, t) {
      ensureFracture(f);
      setPalette(t < T_SHATTER ? 0 : 1);
      if (t < 42.12) { poseCup(f, t); cupCam(f, t); return; }
      poseFragments(f, t);
      f.camera.position.copy(fracture.camera); f.camera.quaternion.copy(fracture.q); f.camera.fov = 30;
      if (t > 43.15) {
        const hero = f.cupFragments.children[0].getWorldPosition(new THREE.Vector3()), k = shardFrame(t);
        const start = f.camera.position.clone();
        framePoint(f, hero, k, k[2]);
        f.camera.position.lerp(start, 1 - smooth(prog(t, 43.15, 43.4)));
      }
    },
    btsTarget: (f) => f.cup.visible ? f.cup.position.clone() : f.cupFragments.children[0].getWorldPosition(new THREE.Vector3()),
    btsDist: 0.6, btsAngle: 1,
  },
  {
    name: 'sakuya', t0: 44, t1: T_KNIFE,
    shutter: (t) => t < 45.65 ? 1 / 60 : 1 / 90,
    fast: [[47.75, 48.1], [49.0, 49.35]],
    apply(f, t) {
      ensureFracture(f); setPalette(1);
      poseFragments(f, t);
      const center = f.cupFragments.children[0].getWorldPosition(new THREE.Vector3());
      f.cupFragments.visible = t < T_FRAG_END;
      poseSakuya(f, t, center);
      knifeHeld(f, t);
      const k = sakuyaFrame(t);
      framePoint(f, center, k, k[2] * sakuyaGrowth(t));
      const adjust = sakuyaCameraOffset(t);
      f.camera.translateX(adjust[0]); f.camera.translateY(adjust[1]); f.camera.translateZ(adjust[2]);
    },
    btsFrame: (f, t) => [{ at: f.sakuya.j.chest.getWorldPosition(new THREE.Vector3()), r: 0.09 * sakuyaGrowth(t) }], btsDist: (f, t) => 0.3 * sakuyaGrowth(t),
  },
  {
    name: 'knife-flight', t0: T_KNIFE, t1: T_WING, shutter: 1 / 100, fast: [[T_KNIFE, 49.4]],
    apply(f, t) {
      ensureKnife(f); setPalette(1);
      if (t < 49.4) poseSakuya(f, t, sakuyaCenter(f, t));
      f.cupFragments.visible = false;
      knifeFlight(f, t); knifeCamera(f, t);
    },
    btsTarget: (f) => f.knife.position.clone(), btsDist: 1.8, btsAngle: 0.7,
  },
  {
    name: 'flandre', t0: T_WING, t1: 56.5,
    shutter: (t) => t < 50.5 ? 1 / 120 : t < 50.9 ? 1 / 75 : 1 / 90, fast: [[T_WING, 50.9], [52.65, 53.2]],
    apply(f, t) {
      ensureFlandre(f); setPalette(t < T_FLANDRE_FLIP ? 1 : 0);
      poseFlandre(f, t, flandreStage.anchor);
      flandreCamera(f, t);
    },
    btsFrame: (f) => [{ at: f.flandre.j.chest.getWorldPosition(new THREE.Vector3()), r: 1.2 }], btsDist: 3,
  },

  {
    name: 'blade-reveal', t0: 56.5, t1: T_GARDEN, shutter: 1 / 100,
    apply(f, t) {
      ensureGarden(f); setPalette(0); bladeApproach(f, t);
      f.garden.visible = true;
      for (const child of f.garden.children) child.visible = false;
      f.sword.visible = t >= 57.02;
      // The incoming blade is in front of the outgoing silhouette throughout the lens-covering push.
      f.sword.traverse((o) => { if (o.isMesh) { o.material.depthTest = false; o.renderOrder = 2; } });
      const x = flow([[57.02, 1.85], [57.25, 1.15], [T_GARDEN, 1.15]])(t);
      const y = flow([[57.02, 0.65], [57.3, 0.565], [57.7, 0.565], [T_GARDEN, 0.517]])(t);
      const distance = 1.6, hh = distance * Math.tan(15 * D2R);
      const p = V((2 * x - 1) * hh * f.camera.aspect, (1 - 2 * y) * hh, -distance).applyQuaternion(f.camera.quaternion).add(f.camera.position);
      f.sword.position.copy(f.garden.worldToLocal(p)); f.sword.rotation.set(0, 0, Math.PI); f.sword.scale.set(1.15 * distance / 1.6, distance / 1.6, distance / 1.6); f.sword.userData.blade.scale.y = 2.7;
    },
    // witness camera: Flandre swelling about the lens (keeping her silhouette), then the incoming blade
    btsFrame: (f, t) => [{ at: f.sword.getWorldPosition(new THREE.Vector3()), r: 0.6 },
      { at: f.flandre.j.chest.getWorldPosition(new THREE.Vector3()), r: 1.2 * f.flandre.root.scale.x, w: 1 - smooth(prog(t, 57.0, 57.5)) }],
    btsDist: 3,
  },
  {
    name: 'youmu', t0: T_GARDEN, t1: T_TREE, shutter: (t) => t > 60.97 && t < 61.35 ? 1 / 25 : 1 / 65, fast: [[60.4, 60.75], [60.95, 61.45]],
    apply(f, t) {
      ensureGarden(f); setPalette(1); poseYoumu(f, t); poseYuyuko(f, t); gardenAtmosphere(f, t); youmuCamera(f, t);
    },
    btsFrame: (f) => [btsBody(f.youmu, 1.1), { at: f.ghost.getWorldPosition(new THREE.Vector3()), r: 0.4 }], btsDist: 3.5,
  },
  {
    name: 'cherry-tree', t0: T_TREE, t1: T_YUYUKO, shutter: (t) => t > 63.62 ? 1 / 1500 : 1 / 60, fast: [[62.65, 62.95]],
    apply(f, t) {
      ensureGarden(f); ensureTreePath(f); setPalette(1); poseYoumu(f, t); poseYuyuko(f, t); gardenAtmosphere(f, t);
      // The sword group takes its wide-shot mark while the camera's pull-back has both marks out of frame.
      if (t >= T_MARKS) {
        for (const o of [f.youmu.root, f.sword, ...f.sheaths]) o.position.add(V(...YOUMU_WIDE));
        f.ghost.position.set(YOUMU_WIDE[0] - 0.6, 1.25, YOUMU_WIDE[2]); f.ghost.rotation.set(0, 0, 0.3);   // (left of her)
      }
      // the push-in leaves her out of frame on the right; the pan would sweep her back across it
      if (t >= T_PAN) for (const o of [f.youmu.root, f.sword, ...f.sheaths, f.ghost]) o.visible = false;
      if (t < T_REVEAL) {
        f.camera.position.copy(gardenPoint(f, treePath(t))); f.camera.fov = 30;
        // (accelerating: the crown lingers at the left edge, then whips out in the last frames)
        f.camera.quaternion.copy(gardenStage.q).slerp(yuyukoQuat(), prog(t, T_PAN, T_REVEAL) ** 3);
      } else yuyukoCamera(f, t);
    },
    btsFrame: (f) => [{ at: gardenPoint(f, [TREE_AT[0] - 0.5, 1.6, TREE_AT[2]]), r: 3 }, btsBody(f.youmu, 1.1), btsBody(f.yuyuko, 1.1)], btsDist: 9,
  },
  {
    name: 'yuyuko', t0: T_YUYUKO, t1: 70.5,
    shutter: 1 / 90,
    apply(f, t) {
      ensureGarden(f); setPalette(1); poseYuyuko(f, t); gardenAtmosphere(f, t); yuyukoCamera(f, t);
      poseHeroPetal(f, t);
    },
    btsFrame: (f) => [btsBody(f.yuyuko, 1.2), { at: f.fan.getWorldPosition(new THREE.Vector3()), r: 0.3 }], btsDist: 3,
  },

];
