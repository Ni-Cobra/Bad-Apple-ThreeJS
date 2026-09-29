import * as THREE from 'three';
import { Sakuya } from './sakuya.js';
import { ellipsoid, lathe, mesh } from '../core/geo.js';

/*
 * Youmu: the swordswoman (58 s onward). Silhouette features, from 59.9 – 62.3 s: a round bob cut straight at the
 * jaw; a black hairband whose ribbon stands up as one tall loop over her left temple (screen right when she faces
 * the camera), leaning outward; puffed short sleeves over a fitted vest; an A-line skirt to the knee.
 * Sakuya's rig with longer arms (she holds the katana out at arm's length).
 */
export class Youmu extends Sakuya {
  constructor() {
    super({ upperArm: 0.28, foreArm: 0.26 });
    const j = this.j;
    this.band.visible = false;
    this.bow.visible = false;
    this.braids.forEach((braid) => { braid.visible = false; });
    // a solid bob under the locks: the strands give the cut ends, the mass keeps it round and closed
    const bob = mesh(lathe([[0.001, 0.255], [0.075, 0.245], [0.125, 0.205], [0.143, 0.14], [0.137, 0.075], [0.12, 0.03], [0.09, 0.018]], { segments: 40, sz: 1.02 }));
    bob.position.z = -0.012; j.head.add(bob);
    for (const s of this.hairSpecs) { s.r0 = Math.max(s.r0, 0.03); s.len = Math.min(s.len, 0.17); }
    // hairband over the crown, and the ribbon: one tall loop standing on her left, a small one behind it
    const band = mesh(new THREE.TorusGeometry(0.128, 0.008, 6, 40, Math.PI));
    band.position.set(0, 0.125, 0.012); band.rotation.set(0, Math.PI / 2, 0); band.scale.set(1, 1, 0.95); j.head.add(band);
    this.ribbon = new THREE.Group();
    this.ribbon.position.set(0.085, 0.225, 0.01);
    this.ribbon.rotation.z = -0.45;
    j.head.add(this.ribbon);
    for (const [h, w, lean] of [[0.17, 0.045, 0], [0.09, 0.034, 0.9]]) {
      const loop = mesh(ellipsoid(w, h / 2, 0.012));
      loop.position.set(Math.sin(-lean) * h / 2, Math.cos(lean) * h / 2, 0); loop.rotation.z = lean;
      this.ribbon.add(loop);
    }
    this.ribbon.add(mesh(ellipsoid(0.02, 0.018, 0.018)));
    // A-line skirt to the knee
    this.skirt.clear();
    this.skirt.add(mesh(lathe([[0.1, 0.07], [0.135, -0.02], [0.23, -0.16], [0.33, -0.32], [0.355, -0.37], [0.34, -0.385]], {
      segments: 64, sz: 0.85, radial: (a, y) => 1 + 0.05 * Math.max(0, -y) * Math.cos(a * 12),
    })));
  }
}
