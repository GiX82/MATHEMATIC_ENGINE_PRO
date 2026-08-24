// ─────────────────────────────────────────────────────────────────────────────
// Post-Processing Pipeline — Using Three.js built-in addons
// (no external postprocessing library — CSP safe)
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface PostProcessingSetup {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

// ── Vignette Shader ─────────────────────────────────────────────────────────

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDarkness: { value: 0.7 },
    uOffset: { value: 0.3 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vig = smoothstep(0.6, uOffset, dist);
      color.rgb *= 1.0 - vig * uDarkness;
      gl_FragColor = color;
    }
  `,
};

export function setupPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostProcessingSetup {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);

  // Base render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom — glow on bright areas (UnrealBloomPass)
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.8,   // strength
    0.4,   // radius
    0.2,   // threshold
  );
  composer.addPass(bloom);

  // Vignette — custom shader pass
  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.uDarkness.value = 0.7;
  vignettePass.uniforms.uOffset.value = 0.3;
  composer.addPass(vignettePass);

  // Output pass — handles tone mapping (ACES Filmic) + color space
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const resize = (width: number, height: number) => {
    composer.setSize(width, height);
    bloom.resolution.set(width, height);
  };

  const dispose = () => {
    bloom.dispose();
    vignettePass.dispose();
    outputPass.dispose();
    composer.dispose();
  };

  return { composer, bloom, resize, dispose };
}
