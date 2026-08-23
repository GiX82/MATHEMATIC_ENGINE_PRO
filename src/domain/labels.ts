import { engineDefinitions } from './engines';
import { gridDefinitions } from './grids';
import { effectCatalog, geometryCatalog, materialCatalog } from './geometry';
import type { EffectMode, GeometryMode, MaterialMode } from './types';
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

export const gridNames: Record<SpatialGrid, string> = {
  ...Object.fromEntries(
    Object.values(gridDefinitions).map((grid) => [grid.id, grid.name]),
  ),
  polar: 'Polare',
  hex: 'Esagonale',
} as Record<SpatialGrid, string>;

export const geometryNames: Record<GeometryMode, string> = Object.fromEntries(
  Object.entries(geometryCatalog).map(([key, value]) => [key, value.label]),
) as Record<GeometryMode, string>;

export const materialNames: Record<MaterialMode, string> = Object.fromEntries(
  Object.entries(materialCatalog).map(([key, value]) => [key, value.label]),
) as Record<MaterialMode, string>;

export const effectNames: Record<EffectMode, string> = Object.fromEntries(
  Object.entries(effectCatalog).map(([key, value]) => [key, value.label]),
) as Record<EffectMode, string>;