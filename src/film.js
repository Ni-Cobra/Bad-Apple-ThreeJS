import * as THREE from 'three';
import { palette, wipeMat } from './core/materials.js';
import { Director } from './shots/director.js';
import { CameraGizmo, makeGrid } from './core/btsRig.js';

/*
 * The film: one persistent 3D world containing every actor and prop, posed as a pure function of time by
 * the Director. Two ways of looking at it: the film camera (final) and a witness camera (behind the scenes).
 *
 * Build actors and props once, here, and register each top-level object with `this.add(obj)`: the director
 * hides everything registered before each frame, and the shot playing at that time shows and poses what it uses.
 *   this.hero = new Hero();          // src/characters/hero.js, a rig whose `root` is an Object3D
 *   this.add(this.hero.root);
 */
export class Film {
  constructor(aspect, width = 960, height = 720) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.01, 2000);
    this.btsCamera = new THREE.PerspectiveCamera(45, aspect, 0.01, 5000);
    this.cast = [];                  // top-level objects, hidden before each frame (Director.resetVisibility)
    this.btsHide = [];               // registered objects the behind-the-scenes view leaves out (point sprites)

    // ---- actors and props go here ----

    // ---- behind-the-scenes helpers (hidden in the final view) ----
    this.bts = new THREE.Group();
    this.camRig = new CameraGizmo(width, height);   // the film camera: body and frustum out to the subject
    this.grid = makeGrid();
    this.bts.add(this.camRig, this.grid, new THREE.HemisphereLight(0xffffff, 0x404050, 2.2));
    this.helperScene = new THREE.Scene();       // drawn on top in the behind-the-scenes view only
    this.helperScene.add(this.bts);
    this.normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    this.wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false });
    this.wireMat.polygonOffset = true;
    this.btsBg = new THREE.Color(0x151a22);
    // Objects left out of the wireframe pass: large scenery whose lines pass behind the witness camera, which the
    // headless software rasterizer draws as big blocky shapes (see core/btsRig.js).
    this.wireMat.userData.skip = [];

    // the palette wipe: a full-screen pass over the final frame, active while `wipe` holds its edge position
    this.wipe = null;
    this.wipeScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wipeMat);
    quad.frustumCulled = false;
    this.wipeScene.add(quad);

    this.director = new Director(this);
  }

  /** Add a top-level object to the world (or to `parent`) and register it for the director's visibility reset. */
  add(obj, parent = this.scene) {
    parent.add(obj);
    this.cast.push(obj);
    return obj;
  }

  shutterAt(t) { return this.director.shutterAt(t); }

  pose(t, view, tFrame = t) {
    t = this.director.clampToCut(t, tFrame);
    this.director.apply(t);
    const isBts = view === 'bts';
    this.bts.visible = isBts;
    if (isBts) {
      this.director.applyBts(t);
      this.scene.background = this.btsBg;
      this.scene.overrideMaterial = this.normalMat;
      // point sprites don't take the normal material; hide them in this view
      for (const o of this.btsHide) o.visible = false;
      const dbg = globalThis.location?.search || '';
      const overlays = [];
      if (!dbg.includes('nowire')) overlays.push(this.wireMat);
      if (!dbg.includes('nohelp')) overlays.push(this.helperScene);
      return { scene: this.scene, camera: this.btsCamera, overlays };
    }
    this.scene.overrideMaterial = null;
    this.scene.background = palette.bg;
    if (this.wipe !== null) {
      wipeMat.uniforms.k.value = this.wipe;
      return { scene: this.scene, camera: this.camera, overlays: [this.wipeScene] };
    }
    return { scene: this.scene, camera: this.camera };
  }
}
