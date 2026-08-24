import { describe, it, expect } from 'vitest';
import { buildArtwork, normalizeArtwork, hashSequence, getPalette } from './math';

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
    const palettes = ['void', 'aurora', 'nebula', 'solar', 'ice', 'inferno'] as const;
    for (const id of palettes) {
      const p = getPalette(id);
      expect(typeof p.bg).toBe('string');
      expect(typeof p.start).toBe('string');
    }
  });
});
