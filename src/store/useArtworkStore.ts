import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clampSeed } from '../domain/engines';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from '../domain/types';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';
import { engineIds } from '../domain/engines';
import { gridIds } from '../domain/grids';

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
  customColorsPreset: boolean;
  lineWidth: number;
  pointSize: number;
  shadowIntensity: number;
  shadowDirection: number;
  shadowSoftness: number;
  lightAngle: number;
  animationDuration: number;
  isAnimating: boolean;
  backgroundMode: 'none' | 'mosaic' | 'tunnel';
  fogDensity: number;
  dispersion: number;
  stardustDensity: number;
  stardustReactivity: number;
  shockwaveIntensity: number;
  dofStrength: number;
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
  setIsAnimating: (value: boolean) => void;
  setBackgroundMode: (mode: 'none' | 'mosaic' | 'tunnel') => void;
  setFogDensity: (value: number) => void;
  setDispersion: (value: number) => void;
  setStardustDensity: (value: number) => void;
  setStardustReactivity: (value: number) => void;
  setShockwaveIntensity: (value: number) => void;
  setDofStrength: (value: number) => void;
  randomize: () => void;
}

export const useArtworkStore = create<ArtworkState>()(
  persist(
    (set) => ({
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
      customColorsPreset: false,
      lineWidth: 2.5,
      pointSize: 3.0,
      shadowIntensity: 4,
      shadowDirection: 135,
      shadowSoftness: 2,
      lightAngle: 45,
      animationDuration: 10,
      isAnimating: true,
      backgroundMode: 'mosaic',
      fogDensity: 0,
      dispersion: 0,
      stardustDensity: 0,
      stardustReactivity: 0,
      shockwaveIntensity: 0,
      dofStrength: 0,
      setSeed: (value) => set({ seed: clampSeed(value) }),
      setSteps: (value) =>
        set({
          steps: Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.trunc(Number.isFinite(value) ? value : MIN_STEPS))),
        }),
      setMode: (mode) => set({ mode }),
      setEngine: (engine) => set({ engine }),
      setGrid: (grid) => set({ grid }),
      setPalette: (palette) => set({ palette, customColorsPreset: false }),
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
          return { customColors: next, customColorsPreset: true };
        }),
      setLineWidth: (value) => set({ lineWidth: Math.max(0.5, Math.min(20, value)) }),
      setPointSize: (value) => set({ pointSize: Math.max(0.5, Math.min(12, value)) }),
      setShadowIntensity: (value) => set({ shadowIntensity: Math.max(0, Math.min(10, Math.round(value))) }),
      setShadowDirection: (value) => set({ shadowDirection: ((value % 360) + 360) % 360 }),
      setShadowSoftness: (value) => set({ shadowSoftness: Math.max(0, Math.min(3, Math.round(value))) }),
      setLightAngle: (value) => set({ lightAngle: Math.max(15, Math.min(90, Math.round(value))) }),
      setAnimationDuration: (value) => set({ animationDuration: Math.max(1, Math.min(15, Math.round(value))) }),
      setIsAnimating: (value) => set({ isAnimating: value }),
      setBackgroundMode: (mode) => set({ backgroundMode: mode }),
      setFogDensity: (value) => set({ fogDensity: Math.max(0, Math.min(1, value)) }),
      setDispersion: (value) => set({ dispersion: Math.max(0, Math.min(1, value)) }),
      setStardustDensity: (value) => set({ stardustDensity: Math.max(500, Math.min(5000, Math.round(value))) }),
      setStardustReactivity: (value) => set({ stardustReactivity: Math.max(0, Math.min(1, value)) }),
      setShockwaveIntensity: (value) => set({ shockwaveIntensity: Math.max(0, Math.min(1, value)) }),
      setDofStrength: (value) => set({ dofStrength: Math.max(0, Math.min(1, value)) }),
      randomize: () => {
        const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
        const randHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const geoms: GeometryMode[] = ['lines', 'polygons', 'tubes', 'surface', 'mesh', 'ribbon', 'torus-knot', 'mobius', 'helix', 'network'];
        const mats: MaterialMode[] = ['basic', 'metallic', 'glass', 'crystal', 'gem', 'holographic'];
        const effects: EffectMode[] = ['neutral', 'bloom', 'glow', 'depth', 'reflection', 'refraction', 'fog', 'cinematic-lighting'];
        const palettes: PaletteKey[] = ['none', 'clean', 'void', 'aurora', 'nebula', 'solar', 'ice', 'inferno'];
        const lights: LightPresetId[] = ['standard', 'cinematic', 'neon', 'studio', 'dark'];
        const motions: MotionPresetId[] = ['ease-in-out', 'ease-in', 'ease-out', 'spring', 'bounce', 'procedural-wave'];
        const cameras: CameraPresetId[] = ['orbit', 'close-up', 'wide-angle', 'cinematic'];
        const engines = engineIds;
        const grids = gridIds;
        set({
          seed: Math.floor(Math.random() * 1000000) + 1,
          engine: pick(engines),
          grid: pick(grids),
          geometry: pick(geoms),
          material: pick(mats),
          effect: pick(effects),
          palette: pick(palettes),
          lightPreset: pick(lights),
          motionPreset: pick(motions),
          cameraPreset: pick(cameras),
          customColors: [randHex(), randHex(), randHex()],
          customColorsPreset: true,
        });
      },
    }),
    { name: 'mathematic-engine-artwork' },
  ),
);
