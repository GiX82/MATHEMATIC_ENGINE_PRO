import type { IMaterialEngine, ParamDefinition } from '../../core/plugin';
import { registry } from '../../core/registry';

const materialParams: ParamDefinition[] = [
  { id: 'emissiveIntensity', label: 'Emissione', type: 'number', min: 0, max: 3, step: 0.1, default: 0.2 },
  { id: 'roughness', label: 'Roughness', type: 'number', min: 0, max: 1, step: 0.05, default: 0.15 },
  { id: 'clearcoatRoughness', label: 'Clearcoat Rugosità', type: 'number', min: 0, max: 1, step: 0.05, default: 0.05 },
];

const materialEngines: IMaterialEngine[] = [
  {
    id: 'basic', name: 'Base', description: 'Materiale base non reattivo.', category: 'material',
    premium: false, tags: ['basic', 'default'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ffffff', roughness: 0.8, metalness: 0.0, emissiveIntensity: 0.0, clearcoat: 0, ior: 1.5 },
  },
  {
    id: 'metallic', name: 'Metallico', description: 'Superficie metallica riflettente.', category: 'material',
    premium: true, tags: ['metallic', 'reflective'],
    params: [...materialParams],
    threeMaterialProps: { color: '#b8b8b8', roughness: 0.2, metalness: 1.0, clearcoat: 0.1, clearcoatRoughness: 0.05, emissiveIntensity: 0.1, ior: 1.5 },
  },
  {
    id: 'glass', name: 'Vetro', description: 'Vetro trasparente e rifrattivo.', category: 'material',
    premium: true, tags: ['glass', 'transparent', 'refractive'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ffffff', roughness: 0.0, metalness: 0.0, transmission: 0.95, ior: 2.5, transparent: true, opacity: 0.6, clearcoat: 0, emissiveIntensity: 0.0 },
  },
  {
    id: 'crystal', name: 'Cristallo', description: 'Cristallo luminoso e prismatico.', category: 'material',
    premium: true, tags: ['crystal', 'luminous', 'prismatic'],
    params: [...materialParams],
    threeMaterialProps: { color: '#e0f0ff', roughness: 0.1, metalness: 0.0, transmission: 0.7, transparent: true, opacity: 0.75, clearcoat: 1.0, clearcoatRoughness: 0.0, emissiveIntensity: 0.2, ior: 2.0 },
  },
  {
    id: 'gem', name: 'Gemma', description: 'Gemma preziosa iridescente.', category: 'material',
    premium: true, tags: ['gem', 'precious', 'iridescent'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ffd700', roughness: 0.15, metalness: 0.3, ior: 2.4, clearcoat: 0.8, clearcoatRoughness: 0.05, emissiveIntensity: 0.3, iridescence: 0.8, iridescenceIOR: 2.0 },
  },
  {
    id: 'holographic', name: 'Olografico', description: 'Superficie olografica cangiante.', category: 'material',
    premium: true, tags: ['holographic', 'iridescent'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ff88ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.7, clearcoat: 0.5, clearcoatRoughness: 0.05, emissiveIntensity: 0.4, iridescence: 1.0, iridescenceIOR: 1.8 },
  },
];

for (const engine of materialEngines) {
  registry.register(engine);
}
