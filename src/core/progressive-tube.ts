// ─────────────────────────────────────────────────────────────────────────────
// Progressive Tube Material — GLSL-based tube with reveal + glow
// Uses onBeforeCompile to patch MeshPhysicalMaterial
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { tubeGradientVertexPatch, tubeGradientFragmentPatch } from './shaders';
import { getPalette } from '../lib/math';
import type { PaletteKey } from '../lib/math';
import type { MaterialMode } from '../domain/types';
import { registry } from './registry';
import type { IMaterialEngine } from './plugin';

export interface ProgressiveTubeMaterial {
  material: THREE.MeshPhysicalMaterial;
  setProgress: (value: number) => void;
  setTime: (value: number) => void;
  setMaterial: (palette: PaletteKey, materialMode: MaterialMode) => void;
  dispose: () => void;
}

export function createProgressiveTubeMaterial(
  palette: PaletteKey,
  materialMode: MaterialMode,
): ProgressiveTubeMaterial {
  const colors = getPalette(palette);
  const engine = registry.get(materialMode) as IMaterialEngine | undefined;
  const props = engine?.threeMaterialProps ?? {};

  // Base uniforms that onBeforeCompile will inject
  const uniforms = {
    uProgress: { value: 0.0 },
    uTime: { value: 0.0 },
    uColorStart: { value: new THREE.Color(colors.start) },
    uColorEnd: { value: new THREE.Color(colors.end) },
    uColorGlow: { value: new THREE.Color(colors.glow) },
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color((props.color as string) ?? colors.start),
    emissive: new THREE.Color(colors.end),
    emissiveIntensity: (props.emissiveIntensity as number) ?? 0.7,
    roughness: (props.roughness as number) ?? 0.08,
    metalness: (props.metalness as number) ?? 0.7,
    clearcoat: (props.clearcoat as number) ?? 1.0,
    clearcoatRoughness: (props.clearcoatRoughness as number) ?? 0.05,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
  });

  // Patch the material's shader via onBeforeCompile
  material.onBeforeCompile = (shader) => {
    // Add uniforms
    shader.uniforms.uProgress = uniforms.uProgress;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uColorStart = uniforms.uColorStart;
    shader.uniforms.uColorEnd = uniforms.uColorEnd;
    shader.uniforms.uColorGlow = uniforms.uColorGlow;

    // Inject vertex varying
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>\n${tubeGradientVertexPatch}`,
    );

    // Call vertex init after UV is available
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `tubeVertexInit();\n#include <begin_vertex>`,
    );

    // Inject fragment uniform + varying + color logic
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\n${tubeGradientFragmentPatch}`,
    );

    // Override the final color output
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // Progressive tube: apply our custom color
      vec3 tubeColor = tubeComputeColor();
      float tubeAlpha = tubeComputeAlpha();
      if (tubeAlpha <= 0.0) discard;
      gl_FragColor.rgb = tubeColor;
      gl_FragColor.a = tubeAlpha;
      #include <dithering_fragment>
      `,
    );

    // Store reference for updates
    material.userData.shader = shader;
  };

  const setProgress = (value: number) => {
    uniforms.uProgress.value = Math.max(0, Math.min(1, value));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const shader = material.userData.shader;
    if (shader && typeof shader === 'object' && 'uniforms' in shader) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      shader.uniforms.uProgress.value = uniforms.uProgress.value;
    }
  };

  const setTime = (value: number) => {
    uniforms.uTime.value = value;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const shader = material.userData.shader;
    if (shader && typeof shader === 'object' && 'uniforms' in shader) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      shader.uniforms.uTime.value = value;
    }
  };

  const setMaterial = (newPalette: PaletteKey, newMaterialMode: MaterialMode) => {
    const c = getPalette(newPalette);
    const eng = registry.get(newMaterialMode) as IMaterialEngine | undefined;
    const p = eng?.threeMaterialProps ?? {};
    material.color.set((p.color as string) ?? c.start);
    material.emissive.set(c.end);
    material.emissiveIntensity = (p.emissiveIntensity as number) ?? 0.7;
    material.roughness = (p.roughness as number) ?? 0.08;
    material.metalness = (p.metalness as number) ?? 0.7;
    material.clearcoat = (p.clearcoat as number) ?? 1.0;
    material.clearcoatRoughness = (p.clearcoatRoughness as number) ?? 0.05;
    uniforms.uColorStart.value.set(c.start);
    uniforms.uColorEnd.value.set(c.end);
    uniforms.uColorGlow.value.set(c.glow);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const shader = material.userData.shader;
    if (shader && typeof shader === 'object' && 'uniforms' in shader) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const su = shader.uniforms as Record<string, { value: THREE.Color }>;
      if (su.uColorStart) su.uColorStart.value.set(c.start);
      if (su.uColorEnd) su.uColorEnd.value.set(c.end);
      if (su.uColorGlow) su.uColorGlow.value.set(c.glow);
    }
  };

  const dispose = () => {
    material.dispose();
  };

  return { material, setProgress, setTime, setMaterial, dispose };
}
