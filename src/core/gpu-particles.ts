// ─────────────────────────────────────────────────────────────────────────────
// GPU Particle System — Custom ShaderMaterial + BufferGeometry
// Particles spawn along curve, drift gently, pulse with additive blending
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { particleVertexShader, particleFragmentShader } from './shaders';
import { getPalette } from '../lib/math';
import type { PaletteKey } from '../lib/math';
import { mulberry32 } from './seed';

export type ResolvedColors = { start: string; end: string; glow: string; bg: string; accent: string };

function resolveColors(palette: PaletteKey, customColors?: [string, string, string]): ResolvedColors {
  const base = getPalette(palette);
  return customColors
    ? { ...base, start: customColors[0], glow: customColors[1], end: customColors[2] }
    : base;
}

export interface GPUParticleSystem {
  points: THREE.Points;
  update: (time: number) => void;
  dispose: () => void;
}

export function createGPUParticles(
  curve: THREE.CatmullRomCurve3,
  palette: PaletteKey,
  seed: number,
  count = 800,
  customColors?: [string, string, string],
): GPUParticleSystem | null {
  if (!curve || !curve.points || curve.points.length < 2) return null;
  for (const p of curve.points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
  }

  let totalLength: number;
  try {
    totalLength = curve.getLength();
  } catch {
    return null;
  }
  if (!Number.isFinite(totalLength) || totalLength < 1e-6) return null;

  const colors = resolveColors(palette, customColors);
  const rand = mulberry32(seed);

  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const lives = new Float32Array(count);
  const colorArr = new Float32Array(count * 3);

  const startColor = new THREE.Color(colors.start);
  const endColor = new THREE.Color(colors.end);
  const glowColor = new THREE.Color(colors.glow);

  for (let i = 0; i < count; i++) {
    const t = Math.max(0.001, Math.min(0.999, rand()));
    let point: THREE.Vector3;
    try {
      point = curve.getPointAt(t);
    } catch {
      point = curve.getPoint(Math.max(0, Math.min(1, t)));
    }
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
      point = curve.points[0];
    }
    const scatter = 0.6;
    positions[i * 3] = point.x + (rand() - 0.5) * scatter;
    positions[i * 3 + 1] = point.y + (rand() - 0.5) * scatter;
    positions[i * 3 + 2] = point.z + (rand() - 0.5) * scatter;

    sizes[i] = 0.04 + rand() * 0.08;
    lives[i] = 0.3 + rand() * 0.7;

    // Color: blend between start/end with some glow particles
    const colorT = rand();
    const useGlow = rand() > 0.8;
    const c = useGlow
      ? glowColor.clone().lerp(startColor, colorT)
      : startColor.clone().lerp(endColor, colorT);
    colorArr[i * 3] = c.r;
    colorArr[i * 3 + 1] = c.g;
    colorArr[i * 3 + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aLife', new THREE.Float32BufferAttribute(lives, 1));
  geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colorArr, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  const update = (time: number) => {
    material.uniforms.uTime.value = time;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
}

// ── Ambient Dust Particles (background sparkle) ─────────────────────────────

export function createAmbientDust(
  palette: PaletteKey,
  seed: number,
  count = 400,
  customColors?: [string, string, string],
): GPUParticleSystem {
  const colors = resolveColors(palette, customColors);
  const rand = mulberry32(seed);

  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const lives = new Float32Array(count);
  const colorArr = new Float32Array(count * 3);

  const glowColor = new THREE.Color(colors.glow);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() - 0.5) * 16;
    positions[i * 3 + 1] = (rand() - 0.5) * 16;
    positions[i * 3 + 2] = (rand() - 0.5) * 12 - 2;

    sizes[i] = 0.02 + rand() * 0.04;
    lives[i] = 0.2 + rand() * 0.5;

    const flicker = 0.5 + rand() * 0.5;
    colorArr[i * 3] = glowColor.r * flicker;
    colorArr[i * 3 + 1] = glowColor.g * flicker;
    colorArr[i * 3 + 2] = glowColor.b * flicker;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aLife', new THREE.Float32BufferAttribute(lives, 1));
  geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colorArr, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  const update = (time: number) => {
    material.uniforms.uTime.value = time;
    // Gentle rotation for dust
    points.rotation.y = time * 0.02;
    points.rotation.x = Math.sin(time * 0.01) * 0.1;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
}
