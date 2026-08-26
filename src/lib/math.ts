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

const FIELD_ENGINES: ReadonlySet<EngineId> = new Set(['mandelbrot', 'julia', 'burning-ship']);
const GRID_ENGINES: ReadonlySet<EngineId> = new Set(['cellular-automata', 'sierpinski']);
const TINY_VALUE_ENGINES: ReadonlySet<EngineId> = new Set(['mobius']);
const DIGITAL_ROOT_ENGINES: ReadonlySet<EngineId> = new Set(['digital-root']);
const COORDINATE_PAIR_ENGINES: ReadonlySet<EngineId> = new Set(['lsystem']);
const COORDINATE_TRIPLET_ENGINES: ReadonlySet<EngineId> = new Set(['lorenz', 'rossler']);

function computeFieldPosition(index: number, _value: number): { x: number; y: number } {
  const px = (index % 20 - 10) / 5;
  const py = (Math.floor(index / 20) - 15) / 5;
  return { x: px, y: py };
}

function computeGridPosition(index: number, value: number, engine: EngineId): { x: number; y: number } {
  if (engine === 'cellular-automata') {
    const width = 64;
    const col = index % width;
    const row = Math.floor(index / width);
    return { x: col, y: row };
  }
  const size = Math.min(64, Math.ceil(Math.sqrt(index + 1)));
  const col = index % size;
  const row = Math.floor(index / size);
  return { x: col, y: row };
}

export function buildArtwork(seed: number, maxSteps = 200, engine: GeneratorEngine = 'collatz', grid: SpatialGrid = 'ulam') {
  const sequence = generateSequence(seed, engine, maxSteps);

  let maxValue = 0;
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] > maxValue) maxValue = sequence[i];
  }

  const safeMax = Math.max(1, maxValue);
  const points = sequence.map((value, index) => {
    let pos: { x: number; y: number };
    if (FIELD_ENGINES.has(engine)) {
      pos = computeFieldPosition(index, value);
    } else if (GRID_ENGINES.has(engine)) {
      pos = computeGridPosition(index, value, engine);
    } else if (TINY_VALUE_ENGINES.has(engine)) {
      const angle = ((value + 1) / 3) * Math.PI * 2 + index * 0.05;
      const radius = Math.sqrt(index + 1) * 0.3;
      pos = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    } else if (DIGITAL_ROOT_ENGINES.has(engine)) {
      const sector = (value - 1) / 9;
      const angle = sector * Math.PI * 2 + index * 0.02;
      const radius = Math.sqrt(index + 1) * 0.3;
      pos = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    } else if (COORDINATE_PAIR_ENGINES.has(engine)) {
      if (index % 2 === 0 && index + 1 < sequence.length) {
        pos = { x: value, y: sequence[index + 1] };
      } else if (index % 2 === 1) {
        pos = { x: sequence[index - 1], y: value };
      } else {
        pos = gridPosition(value, grid);
      }
    } else if (COORDINATE_TRIPLET_ENGINES.has(engine)) {
      const tripletIndex = index % 3;
      if (tripletIndex === 0 && index + 2 < sequence.length) {
        pos = { x: value, y: sequence[index + 1] };
      } else if (tripletIndex === 1 && index + 1 < sequence.length) {
        pos = { x: sequence[index - 1], y: sequence[index + 1] };
      } else if (tripletIndex === 2) {
        pos = { x: sequence[index - 2], y: sequence[index - 1] };
      } else {
        pos = gridPosition(value, grid);
      }
    } else {
      pos = gridPosition(value, grid);
    }
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
