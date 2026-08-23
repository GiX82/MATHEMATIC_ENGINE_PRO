import type { EffectMode, GeometryMode, MaterialMode } from './types';

export const geometryCatalog = {
  points: { id: 'points', label: 'Punti', description: 'Punti discreti con linea di connessione', premium: false },
  lines: { id: 'lines', label: 'Linee', description: 'Linee continue lungo la traiettoria', premium: false },
  polygons: { id: 'polygons', label: 'Poligoni', description: 'Poligoni e formati strutturati', premium: true },
  particles: { id: 'particles', label: 'Particelle', description: 'Particelle sparse luminose', premium: true },
  tubes: { id: 'tubes', label: 'Tubature', description: 'Curve con spessore volumetrico', premium: true },
  surface: { id: 'surface', label: 'Superfici', description: 'Superfici e mesh generate', premium: true },
  mesh: { id: 'mesh', label: 'Mesh 3D', description: 'Mesh volumetriche cinematiche', premium: true },
} as const;

export const materialCatalog = {
  basic: { id: 'basic', label: 'Base', premium: false },
  metallic: { id: 'metallic', label: 'Metallico', premium: true },
  glass: { id: 'glass', label: 'Vetro', premium: true },
  crystal: { id: 'crystal', label: 'Cristallo', premium: true },
  gem: { id: 'gem', label: 'Gemma', premium: true },
  holographic: { id: 'holographic', label: 'Olografico', premium: true },
} as const;

export const effectCatalog = {
  bloom: { id: 'bloom', label: 'Fioritura', premium: true },
  glow: { id: 'glow', label: 'Bagliore', premium: false },
  depth: { id: 'depth', label: 'Profondità', premium: true },
  reflection: { id: 'reflection', label: 'Riflessi', premium: true },
  refraction: { id: 'refraction', label: 'Rifrazione', premium: true },
  fog: { id: 'fog', label: 'Nebbia', premium: false },
  'cinematic-lighting': { id: 'cinematic-lighting', label: 'Illuminazione cinematica', premium: true },
} as const;

export type GeometryId = keyof typeof geometryCatalog;
export type MaterialId = keyof typeof materialCatalog;
export type EffectId = keyof typeof effectCatalog;

export const defaultGeometry: GeometryMode = 'points';
export const defaultMaterial: MaterialMode = 'basic';
export const defaultEffect: EffectMode = 'glow';

export const cinematicPresets = {
  'energy-storm': {
    label: 'Tempesta energetica',
    description: 'Collatz + Ulam + plasma + luce intensa',
    config: {
      engine: 'collatz',
      grid: 'ulam',
      palette: 'solar',
      geometry: 'particles',
      material: 'crystal',
      effect: 'bloom',
    },
  },
  'alien-crystal': {
    label: 'Cristallo alieno',
    description: 'Recamán + esagonale + vetro cristallino',
    config: {
      engine: 'recaman',
      grid: 'hexagonal',
      palette: 'ice',
      geometry: 'mesh',
      material: 'crystal',
      effect: 'glow',
    },
  },
  'black-diamond': {
    label: 'Diamante nero',
    description: 'Primi + geometria sfaccettata + luce dura',
    config: {
      engine: 'primes',
      grid: 'triangular',
      palette: 'void',
      geometry: 'mesh',
      material: 'gem',
      effect: 'cinematic-lighting',
    },
  },
  'quantum-organic': {
    label: 'Organico quantico',
    description: 'Fibonacci + radiale + organico e luminoso',
    config: {
      engine: 'fibonacci',
      grid: 'radial',
      palette: 'aurora',
      geometry: 'tubes',
      material: 'glass',
      effect: 'depth',
    },
  },
} as const;
