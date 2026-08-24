import { engineDefinitions } from './engines';
import { gridDefinitions } from './grids';
import { effectCatalog, geometryCatalog, materialCatalog } from './geometry';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from './types';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';

export const paletteNames: Record<PaletteKey, string> = {
  void: 'Vuoto',
  aurora: 'Aurora',
  nebula: 'Nebula',
  solar: 'Solar',
  ice: 'Ice',
  inferno: 'Inferno',
};

export const engineNames: Record<GeneratorEngine, string> = Object.fromEntries(
  Object.values(engineDefinitions).map((engine) => [engine.id, engine.name]),
) as Record<GeneratorEngine, string>;

export const gridNames: Record<SpatialGrid, string> = Object.fromEntries(
  Object.values(gridDefinitions).map((grid) => [grid.id, grid.name]),
) as Record<SpatialGrid, string>;

export const geometryNames: Record<GeometryMode, string> = Object.fromEntries(
  Object.entries(geometryCatalog).map(([key, value]) => [key, value.label]),
) as Record<GeometryMode, string>;

export const materialNames: Record<MaterialMode, string> = Object.fromEntries(
  Object.entries(materialCatalog).map(([key, value]) => [key, value.label]),
) as Record<MaterialMode, string>;

export const effectNames: Record<EffectMode, string> = Object.fromEntries(
  Object.entries(effectCatalog).map(([key, value]) => [key, value.label]),
) as Record<EffectMode, string>;

export const lightPresetNames: Record<LightPresetId, string> = {
  standard: 'Standard',
  cinematic: 'Cinematica',
  neon: 'Neon',
  studio: 'Studio',
  dark: 'Scuro',
};

export const audioEngineNames: Record<string, string> = {
  'generative-melody': 'Melodia Generativa',
  'ambient-drone': 'Drone Ambient',
  'rhythmic-pulse': 'Pulse Ritmico',
  'melodic-arpeggio': 'Arpeggio Melodico',
};

export const motionPresetNames: Record<MotionPresetId, string> = {
  'ease-in-out': 'Ease In-Out',
  'ease-in': 'Ease In',
  'ease-out': 'Ease Out',
  spring: 'Spring',
  bounce: 'Bounce',
  'procedural-wave': 'Onda Procedurale',
};

export const cameraPresetNames: Record<CameraPresetId, string> = {
  orbit: 'Orbit',
  'close-up': 'Close-Up',
  'wide-angle': 'Wide Angle',
  cinematic: 'Cinematica',
};