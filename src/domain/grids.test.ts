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
