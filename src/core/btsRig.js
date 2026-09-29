import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/*
 * Behind-the-scenes helpers: a model of the film camera with its view frustum, and a ground grid.
 * No GL line primitives: the software rasterizer of the headless renders draws a line that crosses behind the
 * witness camera as a large blocky "staircase" for one frame. The frustum uses screen-space quads (LineSegments2,
 * trimmed at the near plane in its shader) and the grid is drawn by a fragment shader on a plane.
 */

const ORANGE = 0xffa630;

// the film camera as a small movie camera: body, lens and two reels; the optical centre is the origin, looking down -Z
function cameraBody() {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: ORANGE });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a3228 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 1.6), body);
  box.position.z = 0.95;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.5, 20), dark);
  lens.rotation.x = Math.PI / 2; lens.position.z = -0.1;
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 0.25, 20, 1, true), dark);
  hood.material = dark.clone(); hood.material.side = THREE.DoubleSide;
  hood.rotation.x = Math.PI / 2; hood.position.z = -0.45;
  g.add(box, lens, hood);
  for (const z of [0.45, 1.45]) {
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 24), body);
    reel.rotation.z = Math.PI / 2; reel.position.set(0, 1.05, z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.26, 12), dark);
    hub.rotation.z = Math.PI / 2; hub.position.copy(reel.position);
    g.add(reel, hub);
  }
  return g;
}

export class CameraGizmo extends THREE.Group {
  constructor(width, height) {
    super();
    this.body = cameraBody();
    this.add(this.body);
    // frustum edges: 4 rays, the image rectangle and the "up" triangle above it (11 segments)
    this.nSeg = 11;
    const geo = new LineSegmentsGeometry();
    geo.setPositions(new Float32Array(this.nSeg * 6));
    this.edges = new LineSegments2(geo, new LineMaterial({ color: ORANGE, linewidth: 2, resolution: new THREE.Vector2(width, height), transparent: true, opacity: 0.95 }));
    this.edges.frustumCulled = false;
    // translucent faces: the four sides of the pyramid and the image plane
    const faces = new THREE.BufferGeometry();
    faces.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 3 * 3), 3));
    this.faces = new THREE.Mesh(faces, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    this.faces.frustumCulled = false;
    this.add(this.edges, this.faces);
  }

  /** place on the film camera: `size` sets the body's scale, `depth` how far the frustum reaches (to the subject) */
  update(camera, size, depth) {
    camera.updateMatrixWorld();
    this.position.copy(camera.position);
    this.quaternion.copy(camera.quaternion);
    this.body.scale.setScalar(size);
    const h = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), w = h * camera.aspect;
    const c = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [x, y, -depth]);
    const O = [0, 0, 0];
    const seg = [];
    for (let i = 0; i < 4; i++) seg.push(O, c[i]);
    for (let i = 0; i < 4; i++) seg.push(c[i], c[(i + 1) % 4]);
    const up = [0, h * 1.35, -depth];
    seg.push([-w * 0.35, h * 1.06, -depth], up, up, [w * 0.35, h * 1.06, -depth], [w * 0.35, h * 1.06, -depth], [-w * 0.35, h * 1.06, -depth]);
    const buf = this.edges.geometry.attributes.instanceStart.data;
    buf.array.set(seg.flat());
    buf.needsUpdate = true;
    const tri = [];
    for (let i = 0; i < 4; i++) tri.push(O, c[i], c[(i + 1) % 4]);
    tri.push(c[0], c[1], c[2], c[0], c[2], c[3]);
    const pos = this.faces.geometry.attributes.position;
    pos.array.set(tri.flat());
    pos.needsUpdate = true;
  }
}

// ground grid: 1 m cells, a stronger line every 5 m; minor lines fade out where they would crowd, and the
// whole grid fades with the distance from `center`
export function makeGrid() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { center: { value: new THREE.Vector2() }, radius: { value: 20 }, minor: { value: new THREE.Color(0x2e3848) }, major: { value: new THREE.Color(0x56688a) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec2 center; uniform float radius; uniform vec3 minor, major; varying vec3 vW;
      float lines(vec2 p) { vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main() {
        vec2 p = vW.xz;
        float crowd = max(fwidth(p).x, fwidth(p).y);
        float a1 = lines(p) * (1.0 - smoothstep(0.08, 0.25, crowd));
        float a5 = lines(p / 5.0) * (1.0 - smoothstep(0.4, 1.25, crowd));
        float fade = 1.0 - smoothstep(radius * 0.35, radius, distance(p, center));
        float a = max(a1 * 0.6, a5) * fade;
        if (a < 0.004) discard;
        gl_FragColor = vec4(mix(minor, major, a5), a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  grid.rotation.x = -Math.PI / 2;
  grid.frustumCulled = false;
  grid.place = (x, y, z, radius) => {
    grid.position.set(x, y, z);
    grid.scale.setScalar(radius);
    mat.uniforms.center.value.set(x, z);
    mat.uniforms.radius.value = radius;
  };
  return grid;
}
