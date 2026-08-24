import { create } from 'zustand';
import { clampSeed } from '../domain/engines';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from '../domain/types';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';

export type RenderMode = '2d' | '3d';

const MIN_STEPS = 25;
const MAX_STEPS = 1200;

interface ArtworkState {
  seed: number;
  steps: number;
  mode: RenderMode;
  engine: GeneratorEngine;
  grid: SpatialGrid;
  palette: PaletteKey;
  geometry: GeometryMode;
  material: MaterialMode;
  effect: EffectMode;
  lightPreset: LightPresetId;
  motionPreset: MotionPresetId;
  cameraPreset: CameraPresetId;
  setSeed: (value: number) => void;
  setSteps: (value: number) => void;
  setMode: (mode: RenderMode) => void;
  setEngine: (engine: GeneratorEngine) => void;
  setGrid: (grid: SpatialGrid) => void;
  setPalette: (palette: PaletteKey) => void;
  setGeometry: (geometry: GeometryMode) => void;
  setMaterial: (material: MaterialMode) => void;
  setEffect: (effect: EffectMode) => void;
  setLightPreset: (lightPreset: LightPresetId) => void;
  setMotionPreset: (motionPreset: MotionPresetId) => void;
  setCameraPreset: (cameraPreset: CameraPresetId) => void;
  randomize: () => void;
}

export const useArtworkStore = create<ArtworkState>((set) => ({
  seed: 27,
  steps: 200,
  mode: '2d',
  engine: 'collatz',
  grid: 'ulam',
  palette: 'aurora',
  geometry: 'points',
  material: 'basic',
  effect: 'glow',
  lightPreset: 'standard',
  motionPreset: 'ease-in-out',
  cameraPreset: 'orbit',
  setSeed: (value) => set({ seed: clampSeed(value) }),
  setSteps: (value) =>
    set({
      steps: Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.trunc(Number.isFinite(value) ? value : MIN_STEPS))),
    }),
  setMode: (mode) => set({ mode }),
  setEngine: (engine) => set({ engine }),
  setGrid: (grid) => set({ grid }),
  setPalette: (palette) => set({ palette }),
  setGeometry: (geometry) => set({ geometry }),
  setMaterial: (material) => set({ material }),
  setEffect: (effect) => set({ effect }),
  setLightPreset: (lightPreset) => set({ lightPreset }),
  setMotionPreset: (motionPreset) => set({ motionPreset }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  randomize: () => set({ seed: Math.floor(Math.random() * 9000) + 10 }),
}));
