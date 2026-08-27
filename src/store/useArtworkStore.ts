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
  customColors: [string, string, string];
  lineWidth: number;
  pointSize: number;
  shadowIntensity: number;
  shadowDirection: number;
  shadowSoftness: number;
  lightAngle: number;
  animationDuration: number;
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
  setCustomColor: (index: 0 | 1 | 2, color: string) => void;
  setLineWidth: (value: number) => void;
  setPointSize: (value: number) => void;
  setShadowIntensity: (value: number) => void;
  setShadowDirection: (value: number) => void;
  setShadowSoftness: (value: number) => void;
  setLightAngle: (value: number) => void;
  setAnimationDuration: (value: number) => void;
  randomize: () => void;
}

export const useArtworkStore = create<ArtworkState>((set) => ({
  seed: 27,
  steps: 200,
  mode: '2d',
  engine: 'collatz',
  grid: 'ulam',
  palette: 'aurora',
  geometry: 'lines',
  material: 'basic',
  effect: 'neutral',
  lightPreset: 'standard',
  motionPreset: 'ease-in-out',
  cameraPreset: 'orbit',
  customColors: ['#00f5d4', '#7b2ff7', '#f72585'],
  lineWidth: 2.5,
  pointSize: 3.0,
  shadowIntensity: 4,
  shadowDirection: 135,
  shadowSoftness: 2,
  lightAngle: 45,
  animationDuration: 10,
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
  setCustomColor: (index, color) =>
    set((state) => {
      const next = [...state.customColors] as [string, string, string];
      next[index] = color;
      return { customColors: next };
    }),
  setLineWidth: (value) => set({ lineWidth: Math.max(0.5, Math.min(10, value)) }),
  setPointSize: (value) => set({ pointSize: Math.max(0.5, Math.min(12, value)) }),
  setShadowIntensity: (value) => set({ shadowIntensity: Math.max(0, Math.min(10, Math.round(value))) }),
  setShadowDirection: (value) => set({ shadowDirection: ((value % 360) + 360) % 360 }),
  setShadowSoftness: (value) => set({ shadowSoftness: Math.max(0, Math.min(3, Math.round(value))) }),
  setLightAngle: (value) => set({ lightAngle: Math.max(15, Math.min(90, Math.round(value))) }),
  setAnimationDuration: (value) => set({ animationDuration: Math.max(1, Math.min(15, Math.round(value))) }),
  randomize: () => set({ seed: Math.floor(Math.random() * 9000) + 10 }),
}));
