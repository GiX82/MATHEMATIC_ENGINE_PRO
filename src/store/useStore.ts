import { create } from 'zustand';
import { clampSeed } from '../domain/engines';
import type { EffectMode, GeometryMode, MaterialMode } from '../domain/types';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';

export type RenderMode = '2d' | '3d';

export type SavedArtwork = {
  id: string;
  seed: number;
  steps: number;
  mode: RenderMode;
  engine: GeneratorEngine;
  grid: SpatialGrid;
  palette: PaletteKey;
  geometry: GeometryMode;
  material: MaterialMode;
  effect: EffectMode;
  createdAt: string;
  preview: string;
};

interface AppState {
  seed: number;
  steps: number;
  mode: RenderMode;
  engine: GeneratorEngine;
  grid: SpatialGrid;
  palette: PaletteKey;
  geometry: GeometryMode;
  material: MaterialMode;
  effect: EffectMode;
  premium: boolean;
  devMode: boolean;
  creatorName: string;
  gallery: SavedArtwork[];
  setSeed: (value: number) => void;
  setSteps: (value: number) => void;
  setMode: (mode: RenderMode) => void;
  setEngine: (engine: GeneratorEngine) => void;
  setGrid: (grid: SpatialGrid) => void;
  setPalette: (palette: PaletteKey) => void;
  setGeometry: (geometry: GeometryMode) => void;
  setMaterial: (material: MaterialMode) => void;
  setEffect: (effect: EffectMode) => void;
  setCreatorName: (name: string) => void;
  setDevMode: (value: boolean) => void;
  randomize: () => void;
  togglePremium: () => void;
  loadGallery: () => void;
  saveArtwork: (artwork: Omit<SavedArtwork, 'id' | 'createdAt'>) => void;
}

const STORAGE_KEY = 'mathematic-engine-gallery';

const MIN_STEPS = 25;
const MAX_STEPS = 1200;

function isValidArtwork(item: unknown): item is SavedArtwork {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.seed === 'number' &&
    Number.isFinite(record.seed) &&
    typeof record.steps === 'number' &&
    Number.isFinite(record.steps) &&
    (record.mode === '2d' || record.mode === '3d') &&
    typeof record.engine === 'string' &&
    typeof record.grid === 'string' &&
    typeof record.palette === 'string' &&
    typeof record.geometry === 'string' &&
    typeof record.material === 'string' &&
    typeof record.effect === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.preview === 'string'
  );
}

export const useStore = create<AppState>((set, get) => ({
  seed: 27,
  steps: 200,
  mode: '2d',
  engine: 'collatz',
  grid: 'ulam',
  palette: 'aurora',
  geometry: 'points',
  material: 'basic',
  effect: 'glow',
  premium: false,
  devMode: true,
  creatorName: 'Astra Nova',
  gallery: [],
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
  setCreatorName: (name) => set({ creatorName: name.trim() || 'Astra Nova' }),
  setDevMode: (value) => set({ devMode: value }),
  randomize: () => set({ seed: Math.floor(Math.random() * 9000) + 10 }),
  togglePremium: () => set((state) => ({ premium: !state.premium })),
  loadGallery: () => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ gallery: [] });
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      set({ gallery: Array.isArray(parsed) ? parsed.filter(isValidArtwork).slice(0, 12) : [] });
    } catch {
      set({ gallery: [] });
    }
  },
  saveArtwork: (artwork) => {
    if (typeof window === 'undefined') return;

    const nextArtwork: SavedArtwork = {
      ...artwork,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    const list = [nextArtwork, ...get().gallery].slice(0, 12);
    set({ gallery: list });

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      set({ gallery: get().gallery.slice(0, 12) });
    }
  },
}));
