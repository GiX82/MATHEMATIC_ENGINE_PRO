// ─────────────────────────────────────────────────────────────────────────────
// Tracer Manager — Glowing sphere that moves along the curve
// Includes point light, trail particles, and size/color based on sequence value
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { getPalette } from '../lib/math';
import type { PaletteKey } from '../lib/math';

export interface TracerManager {
  group: THREE.Group;
  sphere: THREE.Mesh;
  light: THREE.PointLight;
  glowSprite: THREE.Mesh;
  update: (progress: number, curve: THREE.CatmullRomCurve3, maxValue: number, values: number[]) => void;
  dispose: () => void;
}

export function createTracerManager(
  palette: PaletteKey,
  _curve: THREE.CatmullRomCurve3,
): TracerManager {
  const colors = getPalette(palette);
  const group = new THREE.Group();

  // Main tracer sphere
  const sphereGeo = new THREE.SphereGeometry(0.12, 24, 24);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.accent),
    emissive: new THREE.Color(colors.glow),
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.5,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Glow sprite (larger transparent sphere around tracer)
  const glowGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colors.glow),
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const glowSprite = new THREE.Mesh(glowGeo, glowMat);
  group.add(glowSprite);

  // Point light attached to tracer
  const light = new THREE.PointLight(new THREE.Color(colors.glow), 2.5, 6, 2);
  light.position.set(0, 0, 0);
  group.add(light);

  const update = (
    progress: number,
    catmullCurve: THREE.CatmullRomCurve3,
    maxValue: number,
    values: number[],
  ) => {
    const t = Math.max(0, Math.min(1, progress));
    const point = catmullCurve.getPointAt(t);
    group.position.copy(point);

    // Scale based on current sequence value
    const valueIndex = Math.floor(t * (values.length - 1));
    const currentValue = values[valueIndex] ?? 0;
    const energy = 1 + (currentValue / Math.max(1, maxValue)) * 0.8;
    sphere.scale.setScalar(energy);
    glowSprite.scale.setScalar(energy * 1.2);

    // Pulse
    const pulse = 1 + Math.sin(progress * 20) * 0.15;
    glowSprite.scale.multiplyScalar(pulse);

    // Light intensity follows energy
    light.intensity = 1.5 + energy * 0.8;
  };

  const dispose = () => {
    sphereGeo.dispose();
    sphereMat.dispose();
    glowGeo.dispose();
    glowMat.dispose();
  };

  return { group, sphere, light, glowSprite, update, dispose };
}
