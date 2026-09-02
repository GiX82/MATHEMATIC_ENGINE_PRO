// ─────────────────────────────────────────────────────────────────────────────
// Tilt-Shift Depth of Field — Selective focus with bokeh blur
// Center is sharp; edges have smooth photographic bokeh
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.4 },
    uResolution: { value: new THREE.Vector2(1, 1) },
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
    uniform float uStrength;
    uniform vec2 uResolution;
    varying vec2 vUv;

    vec4 blur(sampler2D tex, vec2 uv, vec2 dir) {
      vec4 color = vec4(0.0);
      float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
      color += texture2D(tex, uv) * weights[0];
      for (int i = 1; i < 5; i++) {
        vec2 offset = dir * float(i) * 1.5;
        color += texture2D(tex, uv + offset) * weights[i];
        color += texture2D(tex, uv - offset) * weights[i];
      }
      return color;
    }

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);

      float focusRadius = 0.25;
      float blurAmount = smoothstep(focusRadius, focusRadius + 0.55, dist) * uStrength;

      vec2 pixelSize = 1.0 / uResolution;
      vec2 blurDir = blurAmount * pixelSize * 4.0;

      vec4 hBlur = blur(tDiffuse, vUv, vec2(blurDir.x, 0.0));
      vec4 vBlur = blur(tDiffuse, vUv, vec2(0.0, blurDir.y));
      vec4 blurred = (hBlur + vBlur) * 0.5;

      vec4 sharp = texture2D(tDiffuse, vUv);
      gl_FragColor = mix(sharp, blurred, blurAmount);
    }
  `,
};

export interface TiltShiftPass {
  pass: ShaderPass;
  setStrength: (strength: number) => void;
  setResolution: (width: number, height: number) => void;
  dispose: () => void;
}

export function createTiltShift(initialStrength = 0.4): TiltShiftPass {
  const pass = new ShaderPass(TiltShiftShader);
  pass.uniforms.uStrength.value = initialStrength;

  return {
    pass,
    setStrength(strength: number) {
      pass.uniforms.uStrength.value = strength;
    },
    setResolution(width: number, height: number) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pass.uniforms.uResolution.value.set(width * dpr, height * dpr);
    },
    dispose() {
      pass.dispose();
    },
  };
}
