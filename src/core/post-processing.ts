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
  grainPass: ShaderPass | null;
  refractionPass: ShaderPass | null;
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

// ── Reflection Shader (mirror + fade) ───────────────────────────────────────

const ReflectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.3 },
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
      vec4 color = texture2D(tDiffuse, vUv);
      // Horizontal mirror
      vec2 mirrorUv = vec2(1.0 - vUv.x, vUv.y);
      vec4 mirror = texture2D(tDiffuse, mirrorUv);
      // Edge fade — stronger at edges, softer at center
      float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(0.0, 0.5, 1.0 - vUv.x);
      // Specular highlight: brighten mirror overlay
      vec3 specular = max(color.rgb, mirror.rgb * 0.6);
      vec3 result = mix(color.rgb, specular, uAmount * edge);
      gl_FragColor = vec4(result, color.a);
    }
  `,
};

// ── Refraction Shader (chromatic distortion) ────────────────────────────────

const RefractionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.02 },
    uTime: { value: 0 },
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
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      // Animated wave distortion
      float wave = sin(dist * 25.0 - uTime * 3.0) * uAmount * smoothstep(0.0, 0.5, dist);
      vec2 dir = dist > 0.001 ? center / dist : vec2(0.0);
      vec2 offset = dir * wave;
      // Chromatic split for glass-like refraction
      float r = texture2D(tDiffuse, vUv + offset * 1.2).r;
      float g = texture2D(tDiffuse, vUv + offset * 0.8).g;
      float b = texture2D(tDiffuse, vUv - offset * 0.6).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

// ── Effect-specific bloom parameters ────────────────────────────────────────

function getBloomParams(effect: EffectMode) {
  switch (effect) {
    case 'bloom':
      return { strength: 0.8, radius: 0.5, threshold: 0.65 };
    case 'glow':
      return { strength: 0.5, radius: 0.35, threshold: 0.72 };
    case 'cinematic-lighting':
      return { strength: 0.7, radius: 0.5, threshold: 0.6 };
    case 'depth':
      return { strength: 0.35, radius: 0.4, threshold: 0.75 };
    default:
      return { strength: 0.3, radius: 0.3, threshold: 0.75 };
  }
}

export function setupPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  effect: EffectMode = 'glow',
): PostProcessingSetup | null {
  // Neutral = no post-processing at all
  if (effect === 'neutral') return null;

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

  // Effect-specific additional passes
  let chromaticPass: ShaderPass | null = null;
  let grainPass: ShaderPass | null = null;
  let reflectionPass: ShaderPass | null = null;
  let refractionPass: ShaderPass | null = null;

  if (effect === 'reflection') {
    reflectionPass = new ShaderPass(ReflectionShader);
    reflectionPass.uniforms.uAmount.value = 0.3;
    composer.addPass(reflectionPass);
  }

  if (effect === 'refraction') {
    refractionPass = new ShaderPass(RefractionShader);
    refractionPass.uniforms.uAmount.value = 0.02;
    composer.addPass(refractionPass);
  }

  // Chromatic aberration — bloom, cinematic-lighting, depth
  if (effect === 'bloom' || effect === 'cinematic-lighting' || effect === 'depth') {
    chromaticPass = new ShaderPass(ChromaticAberrationShader);
    chromaticPass.uniforms.uAmount.value = effect === 'cinematic-lighting' ? 0.003 : 0.002;
    composer.addPass(chromaticPass);
  }

  // Film grain — bloom, cinematic-lighting, depth
  if (effect === 'bloom' || effect === 'cinematic-lighting' || effect === 'depth') {
    grainPass = new ShaderPass(FilmGrainShader);
    grainPass.uniforms.uIntensity.value = effect === 'cinematic-lighting' ? 0.04 : 0.03;
    composer.addPass(grainPass);
  }

  // Vignette — present on all effects except fog
  let vignettePass: ShaderPass | null = null;
  if (effect !== 'fog') {
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.uDarkness.value = effect === 'cinematic-lighting' ? 0.7 : effect === 'depth' ? 0.65 : effect === 'bloom' ? 0.55 : 0.45;
    vignettePass.uniforms.uOffset.value = effect === 'depth' ? 0.28 : 0.38;
    composer.addPass(vignettePass);
  }

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
    if (reflectionPass) reflectionPass.dispose();
    if (refractionPass) refractionPass.dispose();
    if (vignettePass) vignettePass.dispose();
    outputPass.dispose();
    composer.dispose();
  };

  return { composer, bloom, grainPass, refractionPass, resize, dispose };
}
