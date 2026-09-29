import * as THREE from 'three';

// Low-discrepancy sequence for sub-pixel jitter.
function halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
  return r;
}

/**
 * Accumulation renderer: a frame is the average of N sub-frames, each rendered at a slightly different
 * time (motion blur over the shutter interval) and with a sub-pixel camera jitter (anti-aliasing).
 * This mimics the soft motion blur the original video shows on fast moves while keeping edges clean.
 */
export class AccumPipeline {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    const opts = { type: THREE.HalfFloatType, depthBuffer: true };
    this.rtSub = new THREE.WebGLRenderTarget(width, height, opts);
    this.rtAcc = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: false });

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.addMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, weight: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tex; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb * weight, 1.0); }',
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
    });
    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tex; varying vec2 vUv; void main(){ gl_FragColor = vec4(clamp(texture2D(tex, vUv).rgb, 0.0, 1.0), 1.0); }',
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.addMat);
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
  }

  /**
   * Render a frame at time t into the given viewport of the canvas.
   * update(time) must pose the whole world for `time` and return { scene, camera }.
   */
  render(t, update, { samples = 8, shutter = 1 / 60, viewport = null, jitter = true } = {}) {
    const r = this.renderer;
    r.setRenderTarget(this.rtAcc);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);

    for (let i = 0; i < samples; i++) {
      const u = samples > 1 ? (i + 0.5) / samples - 0.5 : 0;
      const { scene, camera, prerender, overlays } = update(t + u * shutter, t);
      if (jitter && samples > 1 && camera.setViewOffset) {
        const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
        camera.setViewOffset(this.width, this.height, jx, jy, this.width, this.height);
      }
      if (prerender) prerender(r);
      r.setRenderTarget(this.rtSub);
      r.clear(true, true, true);
      r.render(scene, camera);
      if (overlays) {
        // extra passes drawn over the same frame (e.g. wireframe in the behind-the-scenes view)
        const keep = scene.overrideMaterial, bg = scene.background;
        r.autoClear = false;
        scene.background = null;
        for (const o of overlays) {
          if (o.isMaterial) {
            // (the material's userData.skip: objects this pass leaves out)
            const skip = (o.userData.skip || []).filter((x) => x.visible);
            for (const x of skip) x.visible = false;
            scene.overrideMaterial = o; r.render(scene, camera);
            for (const x of skip) x.visible = true;
          }
          else r.render(o, camera);            // a separate overlay scene (helpers keep their own materials)
        }
        scene.overrideMaterial = keep; scene.background = bg;
        r.autoClear = true;
      }
      if (camera.clearViewOffset) camera.clearViewOffset();

      r.setRenderTarget(this.rtAcc);
      this.quad.material = this.addMat;
      this.addMat.uniforms.tex.value = this.rtSub.texture;
      this.addMat.uniforms.weight.value = 1 / samples;
      r.autoClear = false;
      r.render(this.quadScene, this.quadCam);
      r.autoClear = true;
    }

    r.setRenderTarget(null);
    if (viewport) {
      r.setViewport(...viewport);
      r.setScissor(...viewport);
      r.setScissorTest(true);
    }
    this.quad.material = this.copyMat;
    this.copyMat.uniforms.tex.value = this.rtAcc.texture;
    r.autoClear = false;
    r.render(this.quadScene, this.quadCam);
    r.autoClear = true;
    if (viewport) r.setScissorTest(false);
  }
}
