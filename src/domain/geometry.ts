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
  neutral: { id: 'neutral', label: 'Neutro', premium: false },
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
export const defaultEffect: EffectMode = 'neutral';
