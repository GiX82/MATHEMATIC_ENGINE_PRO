import type { EffectMode, GeometryMode, MaterialMode } from './types';

export const geometryCatalog = {
  lines: { id: 'lines', label: 'Linee', description: 'Linee 3D con spessore lungo la traiettoria', premium: false },
  polygons: { id: 'polygons', label: 'Poligoni', description: 'Poligoni e formati strutturati', premium: true },
  tubes: { id: 'tubes', label: 'Tubature', description: 'Curve con spessore volumetrico', premium: true },
  surface: { id: 'surface', label: 'Superfici', description: 'Superfici e mesh generate', premium: true },
  mesh: { id: 'mesh', label: 'Mesh 3D', description: 'Mesh volumetriche cinematiche', premium: true },
  ribbon: { id: 'ribbon', label: 'Nastro', description: 'Nastro continuo lungo la curva', premium: true },
  torus: { id: 'torus', label: 'Toro', description: 'Toro rotazionale con materiale PBR', premium: true },
  cylinder: { id: 'cylinder', label: 'Cilindro', description: 'Cilindri lungo i punti della curva', premium: true },
  cone: { id: 'cone', label: 'Cono', description: 'Coni con orientamento variabile', premium: true },
  branching: { id: 'branching', label: 'Rami', description: 'Sistemi ramificati procedurali', premium: true },
  network: { id: 'network', label: 'Rete', description: 'Grafi con nodi e connessioni', premium: true },
  trail: { id: 'trail', label: 'Scia', description: 'Linee di scia lungo la traiettoria', premium: true },
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

export const defaultGeometry: GeometryMode = 'lines';
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
      geometry: 'tubes',
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
