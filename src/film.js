import * as THREE from 'three';
import { Reimu } from './characters/reimu.js';
import { Marisa } from './characters/marisa.js';
import { Patchouli } from './characters/patchouli.js';
import { Sakuya } from './characters/sakuya.js';
import { Remilia } from './characters/remilia.js';
import { Youmu } from './characters/youmu.js';
import { Yuyuko } from './characters/yuyuko.js';
import { makeKatana, makeFan, makeGhost, makeCherryTree, makePetals, makeHeroPetal } from './props/garden.js';
import { Flandre } from './characters/flandre.js';
import { makeApple, makeCore, makeBroom, makeCastle, makeStars, makeDust, makeCup, makeCupFragments, makeKnife } from './props/props.js';
import { palette, paper, wipeMat } from './core/materials.js';
import { Director } from './shots/director.js';
import { CameraGizmo, makeGrid } from './core/btsRig.js';

/*
 * The film: one persistent 3D world containing every actor and prop, posed as a pure function of time by
 * the Director. Two ways of looking at it: the film camera (final) and a witness camera (behind the scenes).
 */
export class Film {
  constructor(aspect, width = 960, height = 720) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.01, 2000);
    this.btsCamera = new THREE.PerspectiveCamera(45, aspect, 0.01, 5000);

    this.reimu = new Reimu();
    this.marisa = new Marisa();
    this.patchouli = new Patchouli();
    this.remilia = new Remilia();
    this.sakuya = new Sakuya();
    this.flandre = new Flandre();
    this.youmu = new Youmu();
    this.yuyuko = new Yuyuko();
    this.garden = new THREE.Group();
    this.sword = makeKatana({ length: 1.25 });
    this.sword.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }); });
    this.sheaths = [makeKatana({ sheath: true, length: 1.4, empty: true }), makeKatana({ sheath: true, length: 0.66 })];
    this.fan = makeFan(); this.ghost = makeGhost(); this.cherryTree = makeCherryTree(); this.petals = makePetals();
    this.heroPetal = makeHeroPetal();
    this.garden.add(this.youmu.root, this.yuyuko.root, this.sword, ...this.sheaths, this.fan, this.ghost, this.cherryTree, this.petals, this.heroPetal);
    this.scene.add(this.garden);
    this.knife = makeKnife();
    this.cupFragments = makeCupFragments();
    this.scene.add(this.sakuya.root, this.flandre.root, this.knife, this.cupFragments);
    this.apple = makeApple();
    this.core = makeCore();          // what is left of the apple (from 0:23)
    this.cup = makeCup();            // Remilia's teacup (from 0:39)
    this.broom = makeBroom();
    this.castle = makeCastle();
    this.stars = makeStars();
    this.dust = makeDust();
    // Patchouli's stage: where she lands and stands (placed once from the fall); her root is posed inside it.
    // Its floor is drawn in the background color, like Reimu's cliff.
    this.stage = new THREE.Group();
    this.stage.add(this.patchouli.root, this.remilia.root);
    // (a terrace: its edge runs just in front of where Remilia stands, 0:40, and her cup falls past it)
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), paper);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.z = 5.72;
    this.stage.add(this.floor);
    this.scene.add(this.stage);
    // The rider rig: Marisa sits on the broom; both move together.
    this.rider = new THREE.Group();
    this.rider.add(this.marisa.root, this.broom);
    this.broom.rotation.y = Math.PI / 2;
    // Reimu's cliff: drawn in the background color, so it is invisible in the final render but gives the
    // staging physical sense (and shows up in the behind-the-scenes view).
    this.cliff = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 30, 24, 1, false, Math.PI * 0.5, Math.PI), paper);
    this.cliff.position.set(0, -15, 1.2);
    this.scene.add(this.reimu.root, this.rider, this.apple, this.core, this.cup, this.castle, this.stars, this.dust, this.cliff);

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
    // No wireframe on the large scenery: its lines pass behind the witness camera, which the headless software
    // rasterizer draws as big blocky shapes (see core/btsRig.js); the huge flat triangles show little anyway.
    this.wireMat.userData.skip = [this.cliff, this.floor, this.castle];

    // the palette wipe: a full-screen pass over the final frame, active while `wipe` holds its edge position
    this.wipe = null;
    this.wipeScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wipeMat);
    quad.frustumCulled = false;
    this.wipeScene.add(quad);

    this.director = new Director(this);
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
      this.stars.visible = false; this.dust.visible = false;
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
