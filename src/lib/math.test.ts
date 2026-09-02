import { describe, it, expect } from 'vitest';
import { buildArtwork, normalizeArtwork, hashSequence, getPalette } from './math';

const ALL_ENGINES = [
  'collatz', 'recaman', 'fibonacci', 'primes', 'prime-gaps',
  'divisors', 'euler-phi', 'mobius', 'happy', 'digital-root',
  'polygonal', 'catalan', 'bell', 'triangular', 'custom-recurrence',
  'lucas', 'pell', 'perfect', 'square', 'logistic-map',
  'lorenz', 'henon', 'rossler', 'mandelbrot', 'julia',
  'burning-ship', 'lsystem', 'phyllotaxis', 'cellular-automata', 'sierpinski',
] as const;

const ALL_GRIDS = [
  'ulam', 'cartesian', 'square-spiral', 'hexagonal', 'triangular',
  'radial', 'concentric', 'polar-spiral', 'golden-spiral', 'hilbert',
  'morton', 'random', 'voronoi', 'recursive',
] as const;

const FIELD_ENGINES = ['mandelbrot', 'julia', 'burning-ship'] as const;
const GRID_ENGINES = ['cellular-automata', 'sierpinski'] as const;
const TINY_ENGINES = ['mobius'] as const;

describe('buildArtwork', () => {
  it('returns points and stats', () => {
    const result = buildArtwork(42, 50, 'collatz', 'ulam');
    expect(result).toHaveProperty('points');
    expect(result).toHaveProperty('stats');
    expect(Array.isArray(result.points)).toBe(true);
    expect(result.points.length).toBeGreaterThan(0);
  });

  it('each point has required fields', () => {
    const { points } = buildArtwork(42, 30, 'collatz', 'ulam');
    for (const p of points) {
      expect(p).toHaveProperty('index');
      expect(p).toHaveProperty('value');
      expect(p).toHaveProperty('x');
      expect(p).toHaveProperty('y');
      expect(p).toHaveProperty('z');
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('stats contains required fields', () => {
    const { stats } = buildArtwork(42, 50, 'collatz', 'ulam');
    expect(stats.length).toBeGreaterThan(0);
    expect(stats.maxValue).toBeGreaterThan(0);
    expect(stats.even + stats.odd).toBe(stats.length);
    expect(typeof stats.hash).toBe('string');
  });

  it('is deterministic', () => {
    const a = buildArtwork(42, 50, 'collatz', 'ulam');
    const b = buildArtwork(42, 50, 'collatz', 'ulam');
    expect(a.points).toEqual(b.points);
    expect(a.stats).toEqual(b.stats);
  });

  it('works with all grid types', () => {
    const grids = ['ulam', 'cartesian', 'hexagonal', 'radial'] as const;
    for (const grid of grids) {
      const { points } = buildArtwork(42, 20, 'collatz', grid);
      expect(points.length).toBeGreaterThan(0);
    }
  });
});

describe('Pipeline integration — every engine', () => {
  for (const engine of ALL_ENGINES) {
    it(`${engine}: produces valid finite points`, () => {
      const { points, stats } = buildArtwork(42, 50, engine, 'ulam');
      expect(points.length).toBeGreaterThan(0);
      expect(stats.length).toBeGreaterThan(0);
      expect(Number.isFinite(stats.maxValue)).toBe(true);
      for (const p of points) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    });
  }
});

describe('Pipeline routing — field engines', () => {
  for (const engine of FIELD_ENGINES) {
    it(`${engine}: positions use computeFieldPosition (20x15 grid)`, () => {
      const { points } = buildArtwork(42, 80, engine, 'ulam');
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(-2.2);
        expect(p.x).toBeLessThanOrEqual(2.2);
        expect(p.y).toBeGreaterThanOrEqual(-3.2);
        expect(p.y).toBeLessThanOrEqual(3.2);
      }
    });
  }
});

describe('Pipeline routing — grid engines', () => {
  for (const engine of GRID_ENGINES) {
    it(`${engine}: positions are integer grid coords`, () => {
      const { points } = buildArtwork(42, 50, engine, 'ulam');
      for (const p of points) {
        expect(p.x % 1).toBe(0);
        expect(p.y % 1).toBe(0);
      }
    });
  }
});

describe('Pipeline routing — tiny value engines', () => {
  for (const engine of TINY_ENGINES) {
    it(`${engine}: radial mapping produces finite positions`, () => {
      const { points } = buildArtwork(42, 30, engine, 'ulam');
      for (const p of points) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    });
  }
});

describe('Pipeline routing — coordinate pair engines', () => {
  it('lsystem: interleaved x,y from sequence', () => {
    const { points } = buildArtwork(42, 10, 'lsystem', 'ulam');
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe('Pipeline — all grids with all engines (sample)', () => {
  const sampleEngines: Array<typeof ALL_ENGINES[number]> = [
    'collatz', 'primes', 'mandelbrot', 'cellular-automata', 'lsystem',
  ];
  for (const engine of sampleEngines) {
    for (const grid of ALL_GRIDS) {
      it(`${engine} + ${grid}: produces valid output`, () => {
        const { points } = buildArtwork(42, 30, engine, grid);
        expect(points.length).toBeGreaterThan(0);
        for (const p of points) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      });
    }
  }
});

describe('normalizeArtwork', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeArtwork([])).toEqual([]);
  });

  it('normalizes points to approximately [-1.15, 1.15] range', () => {
    const { points } = buildArtwork(42, 100, 'collatz', 'ulam');
    const normalized = normalizeArtwork(points);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of normalized) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    expect(maxX - minX).toBeLessThanOrEqual(2.4);
    expect(maxY - minY).toBeLessThanOrEqual(2.4);
  });

  it('is deterministic', () => {
    const { points } = buildArtwork(42, 50, 'collatz', 'ulam');
    const a = normalizeArtwork(points);
    const b = normalizeArtwork(points);
    expect(a).toEqual(b);
  });
});

describe('hashSequence', () => {
  it('returns an 8-char hex string', () => {
    const hash = hashSequence([1, 2, 3, 4, 5]);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('is deterministic', () => {
    const a = hashSequence([1, 2, 3]);
    const b = hashSequence([1, 2, 3]);
    expect(a).toBe(b);
  });

  it('different inputs produce different hashes', () => {
    const a = hashSequence([1, 2, 3]);
    const b = hashSequence([4, 5, 6]);
    expect(a).not.toBe(b);
  });
});

describe('getPalette', () => {
  it('returns palette with bg and color fields', () => {
    const p = getPalette('void');
    expect(p).toHaveProperty('bg');
    expect(p).toHaveProperty('start');
    expect(p).toHaveProperty('end');
    expect(typeof p.bg).toBe('string');
    expect(typeof p.start).toBe('string');
    expect(typeof p.end).toBe('string');
  });

  it('works for all palettes', () => {
    const palettes = ['none', 'void', 'aurora', 'nebula', 'solar', 'ice', 'inferno'] as const;
    for (const id of palettes) {
      const p = getPalette(id);
      expect(typeof p.bg).toBe('string');
      expect(typeof p.start).toBe('string');
    }
  });
});
