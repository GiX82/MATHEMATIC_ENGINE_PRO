import { create } from 'zustand';
import type { EffectMode, GeometryMode, MaterialMode } from '../domain/types';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';
import type { RenderMode } from './useArtworkStore';

const STORAGE_KEY = 'mathematic-engine-gallery';

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

interface GalleryState {
  gallery: SavedArtwork[];
  loadGallery: () => void;
  saveArtwork: (artwork: Omit<SavedArtwork, 'id' | 'createdAt'>) => void;
  removeArtwork: (id: string) => void;
}

function isValidArtwork(item: unknown): item is SavedArtwork {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.seed === 'number' && Number.isFinite(record.seed) &&
    typeof record.steps === 'number' && Number.isFinite(record.steps) &&
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

export const useGalleryStore = create<GalleryState>((set, get) => ({
  gallery: [],
  loadGallery: () => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) { set({ gallery: [] }); return; }
    try {
      const parsed: unknown = JSON.parse(raw);
      set({ gallery: Array.isArray(parsed) ? parsed.filter(isValidArtwork).slice(0, 12) : [] });
    } catch { set({ gallery: [] }); }
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
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch { set({ gallery: get().gallery.slice(0, 12) }); }
  },
  removeArtwork: (id) => {
    const list = get().gallery.filter((item) => item.id !== id);
    set({ gallery: list });
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch { /* noop */ }
  },
}));
