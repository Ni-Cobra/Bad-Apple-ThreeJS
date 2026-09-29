import * as THREE from 'three';
import { track, spline, flow, wobble, prog, clamp, lerp, smooth } from '../core/timeline.js';
import { setPalette } from '../core/materials.js';

/*
 * The shot list. The director plays the first shot whose [t0, t1) holds t; give every shot a real end, and let
 * the last one run on (t1: 1e9). A shot:
 *   name        find shots by name, never by index (the list grows)
 *   t0, t1      its time span, seconds of the original video
 *   apply(f, t) show what it uses (the director has hidden everything registered with film.add), pose it, place
 *               f.camera (position, orientation, fov) and set the palette (setPalette(0) day: white background, black
 *               ink; setPalette(1) night: the inverse). Pure function of t: no state carried between calls.
 *   shutter     motion-blur shutter, seconds (default 1/45), or a function of t
 *   fast        [[a, b], ...] spans rendered with 32 sub-frames instead of 10 (long blur streaks)
 * behind the scenes (see Director.applyBts):
 *   btsFrame(f, t)   [{ at: Vector3, r, w? }]: spheres around what is in the scene, framed with the film camera
 *   btsTarget(f, t)  or a single point to look at;  btsDist: minimum witness distance
 *   btsSide          radians off the film camera's line of sight (default 1);  btsAngle: a fixed world direction instead
 *   btsCamera: false leave the film camera out of the framing;  groundY(f, t): draw the ground grid at that height
 *   btsExtras(f, t)  anything to show only in this view
 *
 * Instant palette inversions go in CUTS, so no frame's motion-blur samples mix the two palettes (a flip between two
 * frames: t = (frame + 0.5) / 30). Set f.wipe to an edge position to run the palette wipe (core/materials.js).
 */

export const CUTS = [];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- camera helpers
export function camOrbit(cam, target, az, el, dist, fov = 30, roll = 0) {
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
export function camLook(cam, pos, target, fov = 30, roll = 0) {
  cam.position.copy(pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  if (roll) cam.rotateZ(roll);
  cam.fov = fov;
}

// ---------------------------------------------------------------- shots
// An empty world and a camera ready to be used: 1.6 m high, 4 m from the origin, looking at a point 1 m up.
// Replace it with the film's shots. A camera path on a motion curve looks like:
//   const camPath = flow([[0, [0, 1.6, 4, 0, 1, 0]], [3, [1, 1.4, 3, 0, 1, 0]]]);   // [x, y, z, tx, ty, tz]
//   const [x, y, z, tx, ty, tz] = camPath(t); camLook(f.camera, V(x, y, z), V(tx, ty, tz));
export const SHOTS = [
  {
    name: 'empty',
    t0: 0,
    t1: 1e9,
    apply(f, t) {
      setPalette(0);
      camLook(f.camera, V(0, 1.6, 4), V(0, 1, 0), 30);
    },
    btsTarget: () => V(0, 1, 0),
    btsDist: 6,
    groundY: () => 0,
  },
];
