import type { GridDefinition, GridId, GridMapper } from './types';

export function ulamPosition(value: number): { x: number; y: number } {
  if (!Number.isFinite(value) || value <= 0) return { x: 0, y: 0 };
  if (value === 1) return { x: 0, y: 0 };

  const ring = Math.ceil((Math.sqrt(value) - 1) / 2);
  const side = 2 * ring + 1;
  const maxOnRing = side * side;
  const distance = maxOnRing - value;

  if (distance < side) {
    return { x: ring, y: -ring + distance + 1 };
  }

  if (distance < 2 * side) {
    return { x: ring - (distance - side) - 1, y: ring };
  }

  if (distance < 3 * side) {
    return { x: -ring, y: ring - (distance - 2 * side) - 1 };
  }

  return { x: -ring + (distance - 3 * side) + 1, y: -ring };
}

export function cartesianPosition(value: number): { x: number; y: number } {
  const side = Math.ceil(Math.sqrt(value || 1));
  const column = (value - 1) % side;
  const row = Math.floor((value - 1) / side);
  return { x: column - side / 2, y: row - side / 2 };
}

export function squareSpiralPosition(value: number): { x: number; y: number } {
  if (value <= 1) return { x: 0, y: 0 };
  const ring = Math.ceil((Math.sqrt(value) - 1) / 2);
  const side = 2 * ring + 1;
  const offset = value - ring * ring;
  const angle = (offset / side) * Math.PI * 2;
  return {
    x: Math.cos(angle) * ring,
    y: Math.sin(angle) * ring,
  };
}

export function hexagonalPosition(value: number): { x: number; y: number } {
  const radius = Math.ceil(Math.sqrt(value / 3));
  const x = (value % (radius * 2 + 1)) - radius;
  const y = Math.floor(value / (radius * 2 + 1)) - radius;
  return {
    x: x + (Math.abs(y) % 2) * 0.5,
    y: y * 0.86,
  };
}

export function triangularPosition(value: number): { x: number; y: number } {
  const index = Math.max(1, value);
  const row = Math.ceil((Math.sqrt(8 * index + 1) - 1) / 2);
  const previous = row * (row - 1) / 2;
  const offset = index - previous - 1;
  return {
    x: offset - row / 2,
    y: row,
  };
}

export function radialPosition(value: number): { x: number; y: number } {
  const angle = value * 0.61803398875;
  const radius = Math.sqrt(value) * 0.35;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function concentricPosition(value: number): { x: number; y: number } {
  const ring = Math.ceil(Math.sqrt(value));
  const ringStart = (ring - 1) ** 2 + 1;
  const offset = value - ringStart;
  const angle = (offset / (Math.max(1, ring * 2))) * Math.PI * 2;
  return {
    x: Math.cos(angle) * ring * 0.7,
    y: Math.sin(angle) * ring * 0.7,
  };
}

export function polarSpiralPosition(value: number): { x: number; y: number } {
  const angle = value * 2.399963229728653;
  const radius = Math.sqrt(Math.max(1, value)) * 0.4;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function goldenSpiralPosition(value: number): { x: number; y: number } {
  const angle = value * 2.399963229728653 * 0.618;
  const radius = Math.sqrt(value) * 0.42;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

export function hilbertPosition(value: number): { x: number; y: number } {
  const order = 4;
  const maxVal = (1 << (2 * order)) - 1;
  const clamped = Math.min(Math.max(0, value), maxVal);

  let x = 0;
  let y = 0;
  let t = clamped;
  for (let s = 1; s < (1 << (2 * order)); s <<= 1) {
    const rx = (t / 2) & 1;
    const ry = (t & 2) ? (rx ^ 1) : rx;
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const tmp = x;
      x = y;
      y = tmp;
    }
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }

  const half = (1 << order) / 2;
  return { x: x - half, y: y - half };
}

export function mortonPosition(value: number): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let v = Math.max(0, value);
  for (let i = 0; v > 0; i++) {
    if (i % 2 === 0) x |= (v & 1) << (i >> 1);
    else y |= (v & 1) << (i >> 1);
    v >>= 1;
  }
  return { x: x - 16, y: y - 16 };
}

export function randomSeededPosition(value: number, seed = 7): { x: number; y: number } {
  const safeSeed = (seed * 9301 + value * 49297) % 233280;
  const random = safeSeed / 233280;
  return {
    x: Math.cos(random * Math.PI * 2) * (value % 18) * 0.5,
    y: Math.sin(random * Math.PI * 2) * (value % 18) * 0.5,
  };
}

export function radialScatterPosition(value: number): { x: number; y: number } {
  const angle = (value * 0.618) % 1;
  return {
    x: Math.cos(angle * Math.PI * 2) * (value % 16) * 0.5,
    y: Math.sin(angle * Math.PI * 2) * (value % 16) * 0.5,
  };
}

export function recursivePosition(value: number): { x: number; y: number } {
  const depth = Math.max(1, Math.ceil(Math.log2(value + 1)));
  return {
    x: (value % depth) - depth / 2,
    y: Math.sin(value) * depth * 0.6,
  };
}

export const gridDefinitions: Record<GridId, GridDefinition> = {
  ulam: {
    id: 'ulam',
    name: 'Ulam',
    description: 'Spirale canonica con distribuzione a anello.',
    premium: false,
    map: ulamPosition,
  },
  cartesian: {
    id: 'cartesian',
    name: 'Cartesiana',
    description: 'Mappatura rettangolare semplice e lineare.',
    premium: true,
    map: cartesianPosition,
  },
  'square-spiral': {
    id: 'square-spiral',
    name: 'Spirale quadrata',
    description: 'Spirale quadrata con partenza dal centro.',
    premium: true,
    map: squareSpiralPosition,
  },
  hexagonal: {
    id: 'hexagonal',
    name: 'Esagonale',
    description: 'Reticolo esagonale e organico.',
    premium: true,
    map: hexagonalPosition,
  },
  triangular: {
    id: 'triangular',
    name: 'Triangolare',
    description: 'Reticolo triangolare per densità e crescita.',
    premium: true,
    map: triangularPosition,
  },
  radial: {
    id: 'radial',
    name: 'Radiale',
    description: 'Distribuzione radiale da un punto centrale.',
    premium: true,
    map: radialPosition,
  },
  concentric: {
    id: 'concentric',
    name: 'Concentrica',
    description: 'Anelli concentrici con angolo variabile.',
    premium: true,
    map: concentricPosition,
  },
  'polar-spiral': {
    id: 'polar-spiral',
    name: 'Spirale polare',
    description: 'Coordinate polari con spirale combinata.',
    premium: true,
    map: polarSpiralPosition,
  },
  'golden-spiral': {
    id: 'golden-spiral',
    name: 'Spirale aurea',
    description: 'Spirale aurea legata alla crescita.',
    premium: true,
    map: goldenSpiralPosition,
  },
  hilbert: {
    id: 'hilbert',
    name: 'Hilbert',
    description: 'Curva di Hilbert per riempimento spaziale.',
    premium: true,
    map: hilbertPosition,
  },
  morton: {
    id: 'morton',
    name: 'Morton',
    description: 'Mappa Z-order per pattern multidimensionali.',
    premium: true,
    map: mortonPosition,
  },
  random: {
    id: 'random',
    name: 'Casuale con seed',
    description: 'Posizionamento pseudo-random deterministico.',
    premium: true,
    map: (value) => randomSeededPosition(value, 7),
  },
  voronoi: {
    id: 'voronoi',
    name: 'Voronoi',
    description: 'Punti distribuiti con geometrie cellulari.',
    premium: true,
    map: radialScatterPosition,
  },
  recursive: {
    id: 'recursive',
    name: 'Ricorsiva',
    description: 'Mapping ricorsivo per pattern frattali.',
    premium: true,
    map: recursivePosition,
  },
};

export const gridIds = Object.keys(gridDefinitions) as GridId[];

export function normalizeGridId(grid: GridId | 'polar' | 'hex'): GridId {
  if (grid === 'polar') return 'polar-spiral';
  if (grid === 'hex') return 'hexagonal';
  return grid;
}

export function mapValueToGrid(value: number, grid: GridId | 'polar' | 'hex' = 'ulam'): { x: number; y: number } {
  const normalized = normalizeGridId(grid);
  return gridDefinitions[normalized].map(value);
}

export const gridMappers: Record<GridId, GridMapper> = Object.fromEntries(
  Object.values(gridDefinitions).map((grid) => [grid.id, grid.map]),
) as Record<GridId, GridMapper>;
