import type { IGeometryEngine } from '../../core/plugin';
import { registry } from '../../core/registry';

const geometryEngines: IGeometryEngine[] = [
  {
    id: 'lines', name: 'Linee', description: 'Linee 3D con spessore lungo la traiettoria.', category: 'geometry',
    geometryType: 'three-d', premium: false, tags: ['lines', 'continuous', '3d'],
    params: [],
  },
  {
    id: 'polygons', name: 'Poligoni', description: 'Poligoni e formati strutturati.', category: 'geometry',
    geometryType: 'primitive', premium: true, tags: ['polygons', 'structured'],
    params: [],
  },
  {
    id: 'tubes', name: 'Tubature', description: 'Curve con spessore volumetrico.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['tubes', 'volumetric', '3d'],
    params: [],
  },
  {
    id: 'surface', name: 'Superfici', description: 'Superfici e mesh generate.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['surface', 'generated', '3d'],
    params: [],
  },
  {
    id: 'mesh', name: 'Mesh 3D', description: 'Mesh volumetriche cinematiche.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['mesh', 'volumetric', 'cinematic', '3d'],
    params: [],
  },
  {
    id: 'ribbon', name: 'Nastro', description: 'Nastro continuo lungo la curva.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['ribbon', 'continuous', '3d'],
    params: [],
  },
  {
    id: 'network', name: 'Rete', description: 'Grafi con nodi e connessioni.', category: 'geometry',
    geometryType: 'procedural', premium: true, tags: ['network', 'graph', 'procedural'],
    params: [],
  },
  {
    id: 'torus-knot', name: 'Nodo Torico', description: 'Nodo torico topologico lungo la curva.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['torus-knot', 'topology', '3d'],
    params: [],
  },
  {
    id: 'mobius', name: 'Nastro di Möbius', description: 'Nastro a una faccia con twist.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['mobius', 'strip', 'twist', '3d'],
    params: [],
  },
  {
    id: 'helix', name: 'Elica', description: 'Elica spiraliforme lungo la traiettoria.', category: 'geometry',
    geometryType: 'three-d', premium: true, tags: ['helix', 'spiral', '3d'],
    params: [],
  },
];

for (const engine of geometryEngines) {
  registry.register(engine);
}
