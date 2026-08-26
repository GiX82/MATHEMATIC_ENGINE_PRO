import { describe, it, expect } from 'vitest';
import {
  ulamPosition,
  cartesianPosition,
  hexagonalPosition,
  polarSpiralPosition,
  hilbertPosition,
  randomSeededPosition,
  gridDefinitions,
  mapValueToGrid,
} from './grids';

function hasXY(pos: unknown) {
  return (
    typeof pos === 'object' &&
    pos !== null &&
    'x' in pos &&
    'y' in pos &&
    Number.isFinite((pos as { x: number }).x) &&
    Number.isFinite((pos as { y: number }).y)
  );
}

describe('All grid mappers', () => {
  const ids = Object.keys(gridDefinitions) as Array<keyof typeof gridDefinitions>;

  for (const id of ids) {
    it(`${id}: returns {x, y} for value 1`, () => {
      const pos = gridDefinitions[id].map(1);
      expect(hasXY(pos)).toBe(true);
    });

    it(`${id}: returns {x, y} for value 100`, () => {
      const pos = gridDefinitions[id].map(100);
      expect(hasXY(pos)).toBe(true);
    });

    it(`${id}: returns {x, y} for value 10000`, () => {
      const pos = gridDefinitions[id].map(10000);
      expect(hasXY(pos)).toBe(true);
    });

    it(`${id}: deterministic`, () => {
      const a = gridDefinitions[id].map(42);
      const b = gridDefinitions[id].map(42);
      expect(a).toEqual(b);
    });
  }
});

describe('Ulam spiral', () => {
  it('maps 1 to origin', () => {
    expect(ulamPosition(1)).toEqual({ x: 0, y: 0 });
  });

  it('handles non-positive values', () => {
    expect(ulamPosition(0)).toEqual({ x: 0, y: 0 });
    expect(ulamPosition(-5)).toEqual({ x: 0, y: 0 });
  });

  it('correct counterclockwise coordinates for values 1-42', () => {
    const expected: Array<[number, number, number]> = [
      [1, 0, 0],
      [2, 1, 0],
      [3, 1, 1],
      [4, 0, 1],
      [5, -1, 1],
      [6, -1, 0],
      [7, -1, -1],
      [8, 0, -1],
      [9, 1, -1],
      [10, 2, -1],
      [11, 2, 0],
      [12, 2, 1],
      [13, 2, 2],
      [14, 1, 2],
      [15, 0, 2],
      [16, -1, 2],
      [17, -2, 2],
      [18, -2, 1],
      [19, -2, 0],
      [20, -2, -1],
      [21, -2, -2],
      [22, -1, -2],
      [23, 0, -2],
      [24, 1, -2],
      [25, 2, -2],
      [26, 3, -2],
      [27, 3, -1],
      [28, 3, 0],
      [29, 3, 1],
      [30, 3, 2],
      [31, 3, 3],
      [32, 2, 3],
      [33, 1, 3],
      [34, 0, 3],
      [35, -1, 3],
      [36, -2, 3],
      [37, -3, 3],
      [38, -3, 2],
      [39, -3, 1],
      [40, -3, 0],
      [41, -3, -1],
      [42, -3, -2],
    ];

    for (const [value, expectedX, expectedY] of expected) {
      const pos = ulamPosition(value);
      expect(pos).toEqual({ x: expectedX, y: expectedY });
    }
  });

  it('value 2 is immediately right of 1', () => {
    const pos1 = ulamPosition(1);
    const pos2 = ulamPosition(2);
    expect(pos2.x).toBe(pos1.x + 1);
    expect(pos2.y).toBe(pos1.y);
  });

  it('ring boundaries are correct', () => {
    expect(ulamPosition(9)).toEqual({ x: 1, y: -1 });
    expect(ulamPosition(10)).toEqual({ x: 2, y: -1 });
    expect(ulamPosition(25)).toEqual({ x: 2, y: -2 });
    expect(ulamPosition(26)).toEqual({ x: 3, y: -2 });
  });
});

describe('Cartesian grid', () => {
  it('returns finite coordinates', () => {
    expect(hasXY(cartesianPosition(1))).toBe(true);
    expect(hasXY(cartesianPosition(10))).toBe(true);
  });
});

describe('Hilbert curve', () => {
  it('clamps to valid range', () => {
    const pos = hilbertPosition(0);
    expect(hasXY(pos)).toBe(true);
  });
});

describe('mapValueToGrid', () => {
  it('routes to correct mapper', () => {
    const pos = mapValueToGrid(1, 'ulam');
    expect(pos).toEqual(ulamPosition(1));
  });

  it('handles alias "polar"', () => {
    const pos = mapValueToGrid(10, 'polar');
    expect(pos).toEqual(polarSpiralPosition(10));
  });

  it('handles alias "hex"', () => {
    const pos = mapValueToGrid(10, 'hex');
    expect(pos).toEqual(hexagonalPosition(10));
  });

  it('defaults to ulam', () => {
    const pos = mapValueToGrid(1);
    expect(pos).toEqual(ulamPosition(1));
  });
});

describe('Random seeded', () => {
  it('is deterministic for same seed', () => {
    const a = randomSeededPosition(42, 7);
    const b = randomSeededPosition(42, 7);
    expect(a).toEqual(b);
  });
});
