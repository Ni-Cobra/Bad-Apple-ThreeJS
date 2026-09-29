// Shared base poses.

/**
 * Riding side-saddle: the pelvis turns 70° to her left so both thighs rest across the handle on that side
 * and the shins hang down together; the spine turns back so the torso faces the flight direction.
 * (Leans go on the chest, after the counter-twist.) Hands forward on the handle.
 */
export function ridePose() {
  return {
    root: { pos: [0, 0, 0], rot: [0, 0, 0] },
    hips: [0, 70, 0], spine: [0, -62, 0], chest: [14, 0, 0], neck: [-5, 0, 0], head: [-8, 0, 0],
    hipL: [-82, 0, 4], hipR: [-78, 0, -2], kneeL: [128, 0, 0], kneeR: [138, 0, 0], ankleL: [30, 0, 0], ankleR: [22, 0, 0],
    shoulderL: [-45, 0, 10], shoulderR: [-45, 0, 10], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0], gripL: 0.9, gripR: 0.9,
  };
}
