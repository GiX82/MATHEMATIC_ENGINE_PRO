// ─────────────────────────────────────────────────────────────────────────────
// Audio-Reactive Shockwave — Distortion wave propagates from tracer
// when music is playing. Connects to Tone.js analyser volume.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const ShockwaveShader = {
  uniforms: {
    tDiffuse: { value: null },
    uShockwave: { value: 0 },
    uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0 },
    uIntensity: { value: 0.5 },
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
    uniform float uShockwave;
    uniform vec2 uOrigin;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;

    void main() {
      vec2 diff = vUv - uOrigin;
      float dist = length(diff);

      float waveRadius = fract(uTime * 0.15) * 1.2;
      float waveWidth = 0.04 + uShockwave * 0.03;
      float wave = smoothstep(waveRadius - waveWidth, waveRadius, dist)
                 - smoothstep(waveRadius, waveRadius + waveWidth, dist);

      float distortion = wave * uShockwave * uIntensity * 0.015;
      vec2 dir = dist > 0.001 ? diff / dist : vec2(0.0);
      vec2 offset = dir * distortion;

      float r = texture2D(tDiffuse, vUv + offset * 1.1).r;
      float g = texture2D(tDiffuse, vUv + offset).g;
      float b = texture2D(tDiffuse, vUv - offset * 0.9).b;
      vec3 color = vec3(r, g, b);

      float brightBoost = wave * uShockwave * uIntensity * 0.15;
      color += brightBoost;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export interface AudioShockwavePass {
  pass: ShaderPass;
  update: (time: number, volume: number) => void;
  setIntensity: (intensity: number) => void;
  dispose: () => void;
}

export function createAudioShockwave(initialIntensity = 0.5): AudioShockwavePass {
  const pass = new ShaderPass(ShockwaveShader);
  pass.uniforms.uIntensity.value = initialIntensity;

  let smoothVolume = 0;

  return {
    pass,
    update(time: number, volume: number) {
      smoothVolume = smoothVolume * 0.9 + volume * 0.1;
      pass.uniforms.uTime.value = time * 0.001;
      pass.uniforms.uShockwave.value = smoothVolume;
    },
    setIntensity(intensity: number) {
      pass.uniforms.uIntensity.value = intensity;
    },
    dispose() {
      pass.dispose();
    },
  };
}
