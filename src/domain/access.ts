import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';

export type AccessFeature = 'engine' | 'grid' | 'mode' | 'palette' | 'geometry' | 'material' | 'effect' | 'lightPreset' | 'motionPreset' | 'cameraPreset';

export const freeAccess = {
  engines: ['collatz'] as const,
  grids: ['ulam'] as const,
  modes: ['2d'] as const,
  palettes: ['none', 'clean', 'void', 'aurora', 'nebula'] as const,
  geometries: ['lines'] as const,
  materials: ['basic'] as const,
  effects: ['glow', 'fog'] as const,
} as const;

export function canAccessFeature(
  feature: AccessFeature,
  value: string | undefined,
  premium: boolean,
): boolean {
  if (premium) return true;

  switch (feature) {
    case 'engine':
      return freeAccess.engines.includes(value as (typeof freeAccess.engines)[number]);
    case 'grid':
      return freeAccess.grids.includes(value as (typeof freeAccess.grids)[number]);
    case 'mode':
      return value === '2d';
    case 'palette':
      return freeAccess.palettes.includes(value as (typeof freeAccess.palettes)[number]);
    case 'geometry':
      return freeAccess.geometries.includes(value as (typeof freeAccess.geometries)[number]);
    case 'material':
      return freeAccess.materials.includes(value as (typeof freeAccess.materials)[number]);
    case 'effect':
      return freeAccess.effects.includes(value as (typeof freeAccess.effects)[number]);
    case 'lightPreset':
      return value === 'standard';
    case 'motionPreset':
      return ['ease-in-out', 'ease-in', 'ease-out'].includes(value ?? '');
    case 'cameraPreset':
      return value === 'orbit';
    default:
      return false;
  }
}

export function getAvailableFeatureLabel(feature: AccessFeature): string {
  const labels: Record<AccessFeature, string> = {
    engine: 'engines',
    grid: 'grids',
    mode: 'modes',
    palette: 'palettes',
    geometry: 'geometries',
    material: 'materials',
    effect: 'effects',
    lightPreset: 'lighting',
    motionPreset: 'motion',
    cameraPreset: 'camera',
  };
  return labels[feature] ?? feature;
}

export function isPremiumFeature(feature: AccessFeature, value: string | undefined, premium: boolean): boolean {
  return !canAccessFeature(feature, value, premium);
}

export const premiumFeatureSet = {
  engine: freeAccess.engines as readonly GeneratorEngine[],
  grid: freeAccess.grids as readonly SpatialGrid[],
  palette: freeAccess.palettes as readonly PaletteKey[],
};
