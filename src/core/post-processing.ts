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
import type { EffectMode } from '../domain/types';

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

// ── Chromatic Aberration Shader ─────────────────────────────────────────────

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.003 },
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
    uniform float uAmount;
    varying vec2 vUv;

    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      float offset = uAmount * dist;
      float r = texture2D(tDiffuse, vUv + dir * offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir * offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

// ── Film Grain Shader ───────────────────────────────────────────────────────

const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.06 },
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
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = rand(vUv + uTime) * uIntensity;
      color.rgb += grain - uIntensity * 0.5;
      gl_FragColor = color;
    }
  `,
};

// ── Effect-specific bloom parameters ────────────────────────────────────────

function getBloomParams(effect: EffectMode) {
  switch (effect) {
    case 'bloom':
      return { strength: 1.2, radius: 0.6, threshold: 0.15 };
    case 'glow':
      return { strength: 0.5, radius: 0.3, threshold: 0.3 };
    case 'cinematic-lighting':
      return { strength: 0.9, radius: 0.5, threshold: 0.2 };
    default:
      return { strength: 0.7, radius: 0.4, threshold: 0.25 };
  }
}

export function setupPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  effect: EffectMode = 'glow',
): PostProcessingSetup {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);

  // Base render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom — parameters differ per effect
  const params = getBloomParams(effect);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    params.strength,
    params.radius,
    params.threshold,
  );
  composer.addPass(bloom);

  // Chromatic aberration — only for bloom and cinematic-lighting
  let chromaticPass: ShaderPass | null = null;
  if (effect === 'bloom' || effect === 'cinematic-lighting') {
    chromaticPass = new ShaderPass(ChromaticAberrationShader);
    chromaticPass.uniforms.uAmount.value = effect === 'cinematic-lighting' ? 0.005 : 0.002;
    composer.addPass(chromaticPass);
  }

  // Film grain — for bloom, cinematic-lighting, depth
  let grainPass: ShaderPass | null = null;
  if (effect === 'bloom' || effect === 'cinematic-lighting' || effect === 'depth') {
    grainPass = new ShaderPass(FilmGrainShader);
    grainPass.uniforms.uIntensity.value = effect === 'cinematic-lighting' ? 0.08 : 0.04;
    composer.addPass(grainPass);
  }

  // Vignette — always present, darkness varies
  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.uDarkness.value = effect === 'cinematic-lighting' ? 0.9 : effect === 'depth' ? 0.8 : 0.6;
  vignettePass.uniforms.uOffset.value = effect === 'depth' ? 0.2 : 0.35;
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
    if (chromaticPass) chromaticPass.dispose();
    if (grainPass) grainPass.dispose();
    vignettePass.dispose();
    outputPass.dispose();
    composer.dispose();
  };

  return { composer, bloom, resize, dispose };
}
