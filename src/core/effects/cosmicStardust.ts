// ─────────────────────────────────────────────────────────────────────────────
// Cosmic Stardust — 5000 micro-particles attracted by cursor + geometry
// Custom shader for glow and attraction
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { mulberry32 } from '../seed';
import type { PaletteKey } from '../../lib/math';
import { getPalette } from '../../lib/math';

const stardustVertexShader = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aBaseColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uReactivity;
uniform vec2 uMouse;
uniform float uMouseActive;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;

  float t = uTime * 0.001;

  float mouseDistX = uMouse.x - pos.x;
  float mouseDistY = uMouse.y - pos.y;
  float mouseDist = length(vec2(mouseDistX, mouseDistY));
  float attraction = uReactivity * uMouseActive * smoothstep(4.0, 0.5, mouseDist);
  pos.x += mouseDistX * attraction * 0.15;
  pos.y += mouseDistY * attraction * 0.15;

  pos.x += sin(t * 0.4 + aPhase * 6.28) * 0.06 * (1.0 + uReactivity * 0.5);
  pos.y += cos(t * 0.3 + aPhase * 4.71) * 0.04 * (1.0 + uReactivity * 0.5);
  pos.z += sin(t * 0.2 + aPhase * 3.14) * 0.03;

  float twinkle = 0.5 + 0.5 * sin(t * 2.0 + aPhase * 12.56);
  vAlpha = 0.3 + twinkle * 0.7;
  vColor = aBaseColor * (1.0 + twinkle * 0.4);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z) * (1.0 + twinkle * 0.3);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const stardustFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 2.0);

  gl_FragColor = vec4(vColor * (1.0 + glow * 0.8), vAlpha * glow * 0.9);
}
`;

export interface CosmicStardustSystem {
  points: THREE.Points;
  update: (time: number, mouseX: number, mouseY: number) => void;
  setDensity: (count: number) => void;
  setReactivity: (r: number) => void;
  setPalette: (palette: PaletteKey, customColors?: [string, string, string]) => void;
  dispose: () => void;
}

function resolveColor(palette: PaletteKey, customColors?: [string, string, string]): THREE.Color {
  const base = getPalette(palette);
  const hex = customColors ? customColors[0] : base.glow;
  return new THREE.Color(hex);
}

export function createCosmicStardust(
  palette: PaletteKey,
  seed: number,
  density = 3000,
  reactivity = 0.5,
  customColors?: [string, string, string],
): CosmicStardustSystem {
  const rand = mulberry32(seed + 9999);
  const color = resolveColor(palette, customColors);

  let count = density;

  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() - 0.5) * 18;
    positions[i * 3 + 1] = (rand() - 0.5) * 14;
    positions[i * 3 + 2] = (rand() - 0.5) * 14 - 2;

    sizes[i] = 0.01 + rand() * 0.04;
    phases[i] = rand();

    const flicker = 0.6 + rand() * 0.4;
    colors[i * 3] = color.r * flicker;
    colors[i * 3 + 1] = color.g * flicker;
    colors[i * 3 + 2] = color.b * flicker;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aBaseColor', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: stardustVertexShader,
    fragmentShader: stardustFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uReactivity: { value: reactivity },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseActive: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  let currentReactivity = reactivity;

  return {
    points,
    update(time: number, mouseX: number, mouseY: number) {
      material.uniforms.uTime.value = time;
      material.uniforms.uMouse.value.set(mouseX, mouseY);
      material.uniforms.uMouseActive.value = mouseX === 0 && mouseY === 0 ? 0 : 1;
      material.uniforms.uReactivity.value = currentReactivity;
    },
    setDensity(newCount: number) {
      const clamped = Math.max(500, Math.min(5000, Math.round(newCount)));
      if (clamped === count) return;
      count = clamped;
      const newRand = mulberry32(seed + 9999);
      const posArr = new Float32Array(count * 3);
      const sizeArr = new Float32Array(count);
      const phaseArr = new Float32Array(count);
      const colArr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        posArr[i * 3] = (newRand() - 0.5) * 18;
        posArr[i * 3 + 1] = (newRand() - 0.5) * 14;
        posArr[i * 3 + 2] = (newRand() - 0.5) * 14 - 2;
        sizeArr[i] = 0.01 + newRand() * 0.04;
        phaseArr[i] = newRand();
        const f = 0.6 + newRand() * 0.4;
        colArr[i * 3] = color.r * f;
        colArr[i * 3 + 1] = color.g * f;
        colArr[i * 3 + 2] = color.b * f;
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
      geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizeArr, 1));
      geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phaseArr, 1));
      geometry.setAttribute('aBaseColor', new THREE.Float32BufferAttribute(colArr, 3));
    },
    setReactivity(r: number) {
      currentReactivity = r;
    },
    setPalette(palette: PaletteKey, customColors?: [string, string, string]) {
      const c = resolveColor(palette, customColors);
      const colAttr = geometry.attributes.aBaseColor as THREE.BufferAttribute;
      const arr = colAttr.array as Float32Array;
      const r2 = mulberry32(seed + 9999);
      for (let i = 0; i < count; i++) {
        const f = 0.6 + r2() * 0.4;
        arr[i * 3] = c.r * f;
        arr[i * 3 + 1] = c.g * f;
        arr[i * 3 + 2] = c.b * f;
      }
      colAttr.needsUpdate = true;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
