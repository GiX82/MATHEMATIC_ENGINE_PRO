import type { IMaterialEngine, ParamDefinition } from '../../core/plugin';
import { registry } from '../../core/registry';

const materialParams: ParamDefinition[] = [
  { id: 'emissiveIntensity', label: 'Emissione', type: 'number', min: 0, max: 3, step: 0.1, default: 0.9 },
  { id: 'roughness', label: 'Roughness', type: 'number', min: 0, max: 1, step: 0.05, default: 0.15 },
  { id: 'clearcoatRoughness', label: 'Clearcoat Rugosità', type: 'number', min: 0, max: 1, step: 0.05, default: 0.05 },
];

const materialEngines: IMaterialEngine[] = [
  {
    id: 'basic', name: 'Base', description: 'Materiale base non reattivo.', category: 'material',
    premium: false, tags: ['basic', 'default'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ffffff', roughness: 0.5, metalness: 0.0, emissiveIntensity: 0.3, clearcoat: 0 },
  },
  {
    id: 'metallic', name: 'Metallico', description: 'Superficie metallica riflettente.', category: 'material',
    premium: true, tags: ['metallic', 'reflective'],
    params: [...materialParams],
    threeMaterialProps: { color: '#b8b8b8', roughness: 0.25, metalness: 0.8, clearcoat: 0.7, clearcoatRoughness: 0.1, emissiveIntensity: 0.5 },
  },
  {
    id: 'glass', name: 'Vetro', description: 'Vetro trasparente e rifrattivo.', category: 'material',
    premium: true, tags: ['glass', 'transparent', 'refractive'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ffffff', roughness: 0.05, metalness: 0.0, transmission: 0.9, ior: 1.5, transparent: true, opacity: 0.72, clearcoat: 1, emissiveIntensity: 0.65 },
  },
  {
    id: 'crystal', name: 'Cristallo', description: 'Cristallo luminoso e traslucido.', category: 'material',
    premium: true, tags: ['crystal', 'luminous'],
    params: [...materialParams],
    threeMaterialProps: { color: '#e0f0ff', roughness: 0.08, metalness: 0.35, transmission: 0.6, transparent: true, opacity: 0.8, clearcoat: 1, emissiveIntensity: 0.9 },
  },
  {
    id: 'gem', name: 'Gemma', description: 'Gemma preziosa con riflessi interni.', category: 'material',
    premium: true, tags: ['gem', 'precious', 'refractive'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ffd700', roughness: 0.12, metalness: 0.42, ior: 2.0, clearcoat: 1, emissiveIntensity: 1.1 },
  },
  {
    id: 'holographic', name: 'Olografico', description: 'Superficie olografica cangiante.', category: 'material',
    premium: true, tags: ['holographic', 'iridescent'],
    params: [...materialParams],
    threeMaterialProps: { color: '#ff88ff', roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.58, clearcoat: 0.7, emissiveIntensity: 0.7 },
  },
];

for (const engine of materialEngines) {
  registry.register(engine);
}
