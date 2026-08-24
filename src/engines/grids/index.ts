import type { IGridEngine } from '../../core/plugin';
import { registry } from '../../core/registry';
import {
  ulamPosition,
  cartesianPosition,
  squareSpiralPosition,
  hexagonalPosition,
  triangularPosition,
  radialPosition,
  concentricPosition,
  polarSpiralPosition,
  goldenSpiralPosition,
  hilbertPosition,
  mortonPosition,
  randomSeededPosition,
  radialScatterPosition,
  recursivePosition,
} from '../../domain/grids';

const gridEngines: IGridEngine[] = [
  {
    id: 'ulam', name: 'Ulam', description: 'Spirale canonica con distribuzione a anello.', category: 'grid',
    premium: false, tags: ['spiral', 'prime'],
    params: [],
    map: (v) => ulamPosition(v),
  },
  {
    id: 'cartesian', name: 'Cartesiana', description: 'Mappatura rettangolare semplice e lineare.', category: 'grid',
    premium: true, tags: ['rectangular', 'linear'],
    params: [],
    map: (v) => cartesianPosition(v),
  },
  {
    id: 'square-spiral', name: 'Spirale quadrata', description: 'Spirale quadrata con partenza dal centro.', category: 'grid',
    premium: true, tags: ['spiral', 'square'],
    params: [],
    map: (v) => squareSpiralPosition(v),
  },
  {
    id: 'hexagonal', name: 'Esagonale', description: 'Reticolo esagonale e organico.', category: 'grid',
    premium: true, tags: ['hexagonal', 'organic'],
    params: [],
    map: (v) => hexagonalPosition(v),
  },
  {
    id: 'triangular', name: 'Triangolare', description: 'Reticolo triangolare per densità e crescita.', category: 'grid',
    premium: true, tags: ['triangular', 'dense'],
    params: [],
    map: (v) => triangularPosition(v),
  },
  {
    id: 'radial', name: 'Radiale', description: 'Distribuzione radiale da un punto centrale.', category: 'grid',
    premium: true, tags: ['radial', 'center'],
    params: [],
    map: (v) => radialPosition(v),
  },
  {
    id: 'concentric', name: 'Concentrica', description: 'Anelli concentrici con angolo variabile.', category: 'grid',
    premium: true, tags: ['concentric', 'rings'],
    params: [],
    map: (v) => concentricPosition(v),
  },
  {
    id: 'polar-spiral', name: 'Spirale polare', description: 'Coordinate polari con spirale combinata.', category: 'grid',
    premium: true, tags: ['polar', 'spiral'],
    params: [],
    map: (v) => polarSpiralPosition(v),
  },
  {
    id: 'golden-spiral', name: 'Spirale aurea', description: 'Spirale aurea legata alla crescita.', category: 'grid',
    premium: true, tags: ['golden-ratio', 'spiral'],
    params: [],
    map: (v) => goldenSpiralPosition(v),
  },
  {
    id: 'hilbert', name: 'Hilbert', description: 'Curva di Hilbert per riempimento spaziale.', category: 'grid',
    premium: true, tags: ['space-filling', 'curve'],
    params: [],
    map: (v) => hilbertPosition(v),
  },
  {
    id: 'morton', name: 'Morton', description: 'Mappa Z-order per pattern multidimensionali.', category: 'grid',
    premium: true, tags: ['z-order', 'multidimensional'],
    params: [],
    map: (v) => mortonPosition(v),
  },
  {
    id: 'random', name: 'Casuale con seed', description: 'Posizionamento pseudo-random deterministico.', category: 'grid',
    premium: true, tags: ['random', 'seeded'],
    params: [],
    map: (v) => randomSeededPosition(v, 7),
  },
  {
    id: 'voronoi', name: 'Voronoi', description: 'Punti distribuiti con distribuzione radiale scattering.', category: 'grid',
    premium: true, tags: ['scatter', 'radial'],
    params: [],
    map: (v) => radialScatterPosition(v),
  },
  {
    id: 'recursive', name: 'Ricorsiva', description: 'Mapping ricorsivo per pattern frattali.', category: 'grid',
    premium: true, tags: ['recursive', 'fractal'],
    params: [],
    map: (v) => recursivePosition(v),
  },
];

for (const engine of gridEngines) {
  registry.register(engine);
}
