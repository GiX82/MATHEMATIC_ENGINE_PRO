import type { PaletteDefinition, PaletteId } from './types';

export const paletteDefinitions: Record<PaletteId, PaletteDefinition> = {
  none: {
    id: 'none',
    name: 'Nessuno',
    start: '#C0C5CE',
    end: '#2E3440',
    glow: '#F5F7FA',
    bg: '#0a0a0a',
    accent: '#6B7280',
  },
  clean: {
    id: 'clean',
    name: 'Pulito',
    start: '#e2e8f0',
    end: '#94a3b8',
    glow: '#f8fafc',
    bg: '#0a0a0a',
    accent: '#9ca3af',
  },
  void: {
    id: 'void',
    name: 'Vuoto',
    start: '#edf6ff',
    end: '#7dd3fc',
    glow: '#d9f2ff',
    bg: '#030711',
    accent: '#8b5cf6',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    start: '#79f2d0',
    end: '#7c7cff',
    glow: '#9cf7ff',
    bg: '#050812',
    accent: '#5eead4',
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula',
    start: '#ff8ae2',
    end: '#7d6bff',
    glow: '#ffe29a',
    bg: '#120812',
    accent: '#f9a8d4',
  },
  solar: {
    id: 'solar',
    name: 'Solar',
    start: '#ffd166',
    end: '#ff6b6b',
    glow: '#fff4d0',
    bg: '#110b07',
    accent: '#fb7185',
  },
  ice: {
    id: 'ice',
    name: 'Ice',
    start: '#bae6fd',
    end: '#38bdf8',
    glow: '#e0f2fe',
    bg: '#06121f',
    accent: '#7dd3fc',
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    start: '#f97316',
    end: '#ef4444',
    glow: '#facc15',
    bg: '#17080a',
    accent: '#fca5a5',
  },
};

export const paletteIds = Object.keys(paletteDefinitions) as PaletteId[];

export function getPaletteDefinition(id: PaletteId = 'aurora') {
  return paletteDefinitions[id];
}
