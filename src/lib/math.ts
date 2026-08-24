import { engineDefinitions, generateSequence, clampSeed } from '../domain/engines';
import { gridDefinitions, mapValueToGrid } from '../domain/grids';
import { getPaletteDefinition } from '../domain/palettes';
import type { ArtworkPoint, EngineId, GridId, PaletteId } from '../domain/types';

export type GeneratorEngine = EngineId;
export type SpatialGrid = GridId;
export type PaletteKey = PaletteId;

export { clampSeed, generateSequence, engineDefinitions, gridDefinitions, getPaletteDefinition };

export function collatzSequence(seed: number, maxIterations = 1200) {
  return engineDefinitions.collatz.generate(seed, maxIterations);
}

export function recamanSequence(seed: number, maxIterations = 1200) {
  return engineDefinitions.recaman.generate(seed, maxIterations);
}

export function fibonacciSequence(seed: number, maxIterations = 1200) {
  return engineDefinitions.fibonacci.generate(seed, maxIterations);
}

export function primeSequence(seed: number, maxIterations = 500) {
  return engineDefinitions.primes.generate(seed, maxIterations);
}

export function ulamPosition(value: number): { x: number; y: number } {
  return gridDefinitions.ulam.map(value);
}

export function cartesianPosition(value: number): { x: number; y: number } {
  return gridDefinitions.cartesian.map(value);
}

export function polarPosition(value: number): { x: number; y: number } {
  return gridDefinitions['polar-spiral'].map(value);
}

export function hexPosition(value: number): { x: number; y: number } {
  return gridDefinitions.hexagonal.map(value);
}

export function gridPosition(value: number, grid: SpatialGrid = 'ulam'): { x: number; y: number } {
  return mapValueToGrid(value, grid);
}

export function hashSequence(sequence: number[]): string {
  const text = sequence.slice(0, 64).join(',');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (`00000000${(hash >>> 0).toString(16)}`).slice(-8);
}

export function buildArtwork(seed: number, maxSteps = 200, engine: GeneratorEngine = 'collatz', grid: SpatialGrid = 'ulam') {
  const sequence = generateSequence(seed, engine, maxSteps);

  let maxValue = 0;
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] > maxValue) maxValue = sequence[i];
  }

  const safeMax = Math.max(1, maxValue);
  const points = sequence.map((value, index) => {
    const pos = gridPosition(value, grid);
    return {
      index,
      value,
      x: pos.x,
      y: pos.y,
      z: value / safeMax,
    };
  });

  let even = 0;
  let odd = 0;
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] % 2 === 0) even++;
    else odd++;
  }

  const stats = {
    length: sequence.length,
    maxValue,
    even,
    odd,
    peak: maxValue,
    hash: hashSequence(sequence),
  };

  return { points, stats };
}

export function normalizeArtwork(points: ArtworkPoint[]) {
  if (points.length === 0) return points;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const maxDimension = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = 2.3 / maxDimension;

  return points.map((point) => ({
    ...point,
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
  }));
}

export function getPalette(palette: PaletteKey) {
  return getPaletteDefinition(palette);
}
