// ─────────────────────────────────────────────────────────────────────────────
// Quantum Chromatic Dispersion — RGB channel separation on edges
// Intensity depends on camera speed and surface curvature
// ─────────────────────────────────────────────────────────────────────────────

import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const QuantumDispersionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.3 },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
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
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      vec2 dir = dist > 0.001 ? center / dist : vec2(0.0);

      float dynamicAmount = uAmount * (0.4 + uSpeed * 0.6);

      float rOffset = dynamicAmount * 0.012 * (1.0 + sin(uTime * 0.7) * 0.3);
      float bOffset = -dynamicAmount * 0.012 * (1.0 + cos(uTime * 0.5) * 0.3);

      float r = texture2D(tDiffuse, vUv + dir * rOffset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * bOffset).b;

      float edge = smoothstep(0.15, 0.65, dist);
      vec3 dispersed = vec3(r, g, b);
      vec3 original = texture2D(tDiffuse, vUv).rgb;
      gl_FragColor = vec4(mix(original, dispersed, edge), 1.0);
    }
  `,
};

export interface QuantumDispersionPass {
  pass: ShaderPass;
  update: (time: number, speed: number) => void;
  setAmount: (amount: number) => void;
  dispose: () => void;
}

export function createQuantumDispersion(initialAmount = 0.3): QuantumDispersionPass {
  const pass = new ShaderPass(QuantumDispersionShader);
  pass.uniforms.uAmount.value = initialAmount;

  return {
    pass,
    update(time: number, speed: number) {
      pass.uniforms.uTime.value = time * 0.001;
      pass.uniforms.uSpeed.value = speed;
    },
    setAmount(amount: number) {
      pass.uniforms.uAmount.value = amount;
    },
    dispose() {
      pass.dispose();
    },
  };
}
