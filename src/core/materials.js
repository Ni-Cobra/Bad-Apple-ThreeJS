import * as THREE from 'three';

// The whole film is two colors. `inv` = 0: white background, black figures ("paper" world);
// `inv` = 1: black background, white figures (the "night" world). Materials are shared, so a single
// call recolors everything consistently.
export const palette = {
  inv: 0,
  bg: new THREE.Color(1, 1, 1),
  fg: new THREE.Color(0, 0, 0),
};

export const ink = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
// Same color as the background: used for cut-outs / occluders that must read as "holes" in a silhouette.
export const paper = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

export function setPalette(inv) {
  palette.inv = inv;
  const bg = 1 - inv, fg = inv;
  palette.bg.setRGB(bg, bg, bg);
  palette.fg.setRGB(fg, fg, fg);
  ink.color.setRGB(fg, fg, fg);
  paper.color.setRGB(bg, bg, bg);
  // (a material in between, like a faint gray, recolors here too: lerp(bg, fg, k))
}
setPalette(0);

/**
 * Palette wipe: a straight, soft edge sweeps across the frame and the
 * palette is inverted behind it. Drawn as a full-screen pass over the finished frame: the output is
 * mask * (1 - frame) + (1 - mask) * frame, which inverts the two-tone image where mask = 1.
 * The edge is the line u = slope * v - k (u right, v down, frame fractions); the inverted side is u < slope * v - k.
 * Set slope and soft from the original if it wipes, and animate the edge with film.wipe = k (null: no wipe).
 */
export const wipeMat = new THREE.ShaderMaterial({
  uniforms: { k: { value: 0 }, slope: { value: 1.0 }, soft: { value: 0.04 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform float k, slope, soft; varying vec2 vUv;
    void main(){ float e = slope * (1.0 - vUv.y) - vUv.x; gl_FragColor = vec4(vec3(smoothstep(k - soft, k + soft, e)), 1.0); }`,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneMinusDstColorFactor,
  blendDst: THREE.OneMinusSrcColorFactor,
  depthTest: false,
  depthWrite: false,
});
