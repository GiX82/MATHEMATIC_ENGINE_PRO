import type { ICameraEngine, ParamDefinition } from '../../core/plugin';
import { registry } from '../../core/registry';

const cameraParams: ParamDefinition[] = [
  { id: 'distance', label: 'Distanza', type: 'number', min: 3, max: 20, step: 0.5, default: 8.5 },
  { id: 'height', label: 'Altezza', type: 'number', min: -5, max: 10, step: 0.5, default: 0.5 },
];

const cameraEngines: ICameraEngine[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    description: 'Camera orbitale attorno alla scena.',
    category: 'camera',
    cameraType: 'orbit',
    premium: false,
    tags: ['orbit', 'default'],
    params: [...cameraParams],
    position: [0, 0.5, 8.5],
    lookAt: [0, 0, 0],
    fov: 40,
  },
  {
    id: 'close-up',
    name: 'Close-Up',
    description: 'Vista ravvicinata del dettaglio.',
    category: 'camera',
    cameraType: 'follow',
    premium: true,
    tags: ['close', 'detail'],
    params: [...cameraParams],
    position: [0, 0.2, 4],
    lookAt: [0, 0, 0],
    fov: 35,
  },
  {
    id: 'wide-angle',
    name: 'Wide Angle',
    description: 'Vista panoramica con ampio campo visivo.',
    category: 'camera',
    cameraType: 'path',
    premium: true,
    tags: ['wide', 'panoramic'],
    params: [...cameraParams],
    position: [0, 2, 12],
    lookAt: [0, 0, 0],
    fov: 60,
  },
  {
    id: 'cinematic',
    name: 'Cinematica',
    description: 'Inquadratura cinematografica drammatica.',
    category: 'camera',
    cameraType: 'cinematic',
    premium: true,
    tags: ['cinematic', 'dramatic'],
    params: [
      ...cameraParams,
      { id: 'angle', label: 'Angolo', type: 'number', min: -30, max: 30, step: 1, default: 12 },
    ],
    position: [-3, 1.5, 7],
    lookAt: [0, 0, 0],
    fov: 38,
  },
];

for (const engine of cameraEngines) {
  registry.register(engine);
}
