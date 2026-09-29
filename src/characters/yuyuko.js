import * as THREE from 'three';
import { Remilia } from './remilia.js';
import { lathe, mesh, ellipsoid, StrandBatch } from '../core/geo.js';

/*
 * Yuyuko: the woman with the fan (1:03.9 onward). Silhouette features, from the close-up at 63.9 – 70 s:
 * a tall, puffy mob cap (as tall above the brow as her face is long) whose frilled rim sticks out in flaps at
 * the sides and over the brow, with a pointed crest on top that leans back; wavy hair to the jaw, flicking out,
 * longer at the back; a high kimono collar right under the chin (a dark notch between chin and collar in
 * profile); broad shoulders with ruffled edges and long hanging sleeves; a floor-length robe.
 */
export class Yuyuko extends Remilia {
  constructor() {
    super({ scale: 1.06, headR: 0.122, shoulderW: 0.14, upperArm: 0.25, foreArm: 0.25 });
    const j = this.j, R = this.o.headR;
    // the ground strip she stands on in the wide shots
    const ground = mesh(ellipsoid(0.55, 0.006, 0.16)); ground.position.set(-0.25, -0.01, 0); this.root.add(ground);
    this.headMesh.geometry = Remilia.headGeometry(R, { jaw: 0.34, chin: 0.1, nose: 0.2, mouth: 0.03 });
    this.wing.L.joint.visible = false; this.wing.R.joint.visible = false;

    // ---------- hair: Remilia's jaw-length bob, wavier, the back locks down to the collar ----------
    for (const s of this.hairSpecs) {
      if (s.kind !== 'bob') continue;
      const back = Math.max(0, Math.cos(s.a));          // 1 straight back, 0 at the sides
      const front = Math.max(0, -Math.cos(s.a) - 0.3);  // the locks beside the face stay short, off the jaw line
      s.len *= (1.2 + 0.55 * back) * (1 - 0.6 * front); s.flick *= 0.8 * (1 - front); s.stiff = 0.62; s.r0 = 0.042;
    }
    j.head.remove(this.hair.mesh);
    this.hair = new StrandBatch(this.hairSpecs, { radial: 6 });
    j.head.add(this.hair.mesh);

    // ---------- the cap ----------
    this.cap.clear();
    this.cap.position.set(0, R * 1.5, -R * 0.42);
    this.cap.scale.setScalar(0.95);
    this.cap.rotation.set(-0.12, 0, 0);
    this.cap.add(mesh(lathe([[0.001, 0.19], [0.085, 0.182], [0.135, 0.15], [0.162, 0.095], [0.166, 0.04], [0.158, 0.0], [0.145, -0.012]], {
      segments: 48, sz: 1.05, radial: (a, y) => 1 + 0.025 * Math.cos(a * 7) * Math.max(0, 0.08 - y) * 10,
    })));
    // the frilled rim: a ruffled band whose lobes stand out as flaps over the brow, the sides and the back
    this.cap.add(mesh(lathe([[0.14, 0.012], [0.162, -0.002], [0.172, -0.018], [0.172, -0.03], [0.158, -0.026], [0.138, -0.01]], {
      segments: 96, smooth: 2, sz: 1.05,
      radial: (a) => 1 + 0.03 * Math.max(0, Math.cos(a * 22)),
    })));
    // two frill flaps: over the brow and on her right (screen-left in the front view), their tips drooping
    for (const [a, len] of [[0, 0.045], [-Math.PI / 2, 0.07]]) {
      const flap = mesh(ellipsoid(len, 0.016, 0.05));
      flap.position.set(Math.sin(a) * 0.175, -0.03, Math.cos(a) * 0.175 * 1.05);
      flap.rotation.set(0, a - Math.PI / 2, -0.35);
      this.cap.add(flap);
    }
    // the crest: a pointed triangle standing on the front of the crown, leaning back (a cone: it reads as a
    // triangle both from the front and in profile)
    this.crest = mesh(new THREE.ConeGeometry(0.036, 0.1, 16));
    this.crest.scale.set(1, 1, 0.55);
    this.crest.position.set(0, 0.215, 0.035);
    this.crest.rotation.x = -0.55;
    this.cap.add(this.crest);

    // ---------- kimono: high collar, broad ruffled shoulders, hanging sleeves, a floor-length robe ----------
    const collar = mesh(lathe([[0.045, 0.155], [0.06, 0.145], [0.1, 0.128], [0.16, 0.098], [0.2, 0.06], [0.205, -0.02], [0.19, -0.08]], {
      segments: 48, sz: 0.72, radial: (a, y) => 1 + 0.035 * Math.max(0, Math.cos(a * 16)) * Math.max(0, 0.12 - y) * 5,
    }));
    j.chest.add(collar);
    this.skirt.clear();
    this.skirt.add(mesh(lathe([[0.11, 0.07], [0.15, -0.12], [0.21, -0.45], [0.3, -0.76], [0.28, -0.79]], {
      segments: 56, sz: 0.85, radial: (a, y) => 1 + 0.025 * Math.cos(a * 12) * Math.abs(y),
    })));
    for (const side of ['L', 'R']) {
      // a long furisode sleeve hanging from the elbow, its edge ruffled
      const sleeve = mesh(lathe([[0.05, 0.03], [0.08, -0.04], [0.115, -0.16], [0.125, -0.27], [0.105, -0.3], [0.07, -0.305]], {
        segments: 40, sz: 0.62, radial: (a, y) => 1 + 0.05 * Math.max(0, Math.cos(a * 12)) * Math.max(0, -y - 0.2) * 8,
      }));
      this.j['elbow' + side].add(sleeve);
      const upper = mesh(lathe([[0.03, 0.05], [0.075, 0.0], [0.085, -0.12], [0.085, -0.25]], { segments: 32, sz: 0.8 }));
      this.j['shoulder' + side].add(upper);
    }
    this.rest = {};
    for (const [k, g] of Object.entries(this.j)) this.rest[k] = { p: g.position.clone(), q: g.quaternion.clone() };
  }
}
