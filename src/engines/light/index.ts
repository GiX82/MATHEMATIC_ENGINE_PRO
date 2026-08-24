import type { ILightEngine } from '../../core/plugin';
import { registry } from '../../core/registry';

const lightEngines: ILightEngine[] = [
  {
    id: 'standard', name: 'Standard', description: 'Illuminazione standard con key + rim.', category: 'light',
    premium: false, tags: ['standard', 'default'],
    params: [],
    lights: [
      { type: 'ambient', color: '#ffffff', intensity: 0.85 },
      { type: 'directional', color: '#8ae6ff', intensity: 1.6, position: [5, 4, 6] },
      { type: 'directional', color: '#ff7bd5', intensity: 0.8, position: [-5, -2, 4] },
    ],
  },
  {
    id: 'cinematic', name: 'Cinematica', description: 'Illuminazione cinematica drammatica.', category: 'light',
    premium: true, tags: ['cinematic', 'dramatic'],
    params: [],
    lights: [
      { type: 'ambient', color: '#1a1a2e', intensity: 0.4 },
      { type: 'directional', color: '#ffd700', intensity: 2.0, position: [3, 8, 5] },
      { type: 'directional', color: '#4a0080', intensity: 1.2, position: [-4, -3, 6] },
      { type: 'point', color: '#00ffff', intensity: 1.0, position: [0, 0, 4] },
    ],
  },
  {
    id: 'neon', name: 'Neon', description: 'Luci neon intense e colorate.', category: 'light',
    premium: true, tags: ['neon', 'vibrant', 'cyberpunk'],
    params: [],
    lights: [
      { type: 'ambient', color: '#0a0014', intensity: 0.2 },
      { type: 'point', color: '#ff00ff', intensity: 2.5, position: [3, 2, 3] },
      { type: 'point', color: '#00ffff', intensity: 2.5, position: [-3, -2, 3] },
      { type: 'point', color: '#ffff00', intensity: 1.5, position: [0, 4, -2] },
    ],
  },
  {
    id: 'studio', name: 'Studio', description: 'Tre luci da studio professionale.', category: 'light',
    premium: true, tags: ['studio', 'professional'],
    params: [],
    lights: [
      { type: 'ambient', color: '#f5f5f5', intensity: 0.6 },
      { type: 'directional', color: '#ffffff', intensity: 1.8, position: [4, 6, 4] },
      { type: 'directional', color: '#b0c4de', intensity: 0.9, position: [-3, 2, 5] },
      { type: 'directional', color: '#ffe4b5', intensity: 0.5, position: [0, -2, 6] },
    ],
  },
  {
    id: 'dark', name: 'Scuro', description: 'Illuminazione minimale e scura.', category: 'light',
    premium: true, tags: ['dark', 'minimal', 'moody'],
    params: [],
    lights: [
      { type: 'ambient', color: '#000011', intensity: 0.15 },
      { type: 'directional', color: '#334455', intensity: 0.8, position: [2, 5, 3] },
    ],
  },
];

for (const engine of lightEngines) {
  registry.register(engine);
}
