import { describe, it, expect } from 'vitest';
import {
  collatzSequence, recamanSequence, fibonacciSequence, primeSequence,
  mobiusSequence, mandelbrotSequence, juliaSequence, burningShipSequence,
  cellularAutomataSequence, sierpinskiSequence, perfectNumberSequence,
  squareNumberSequence, lorenzSequence, henonMapSequence, rosslerSequence,
  logisticMapSequence, lSystemSequence, phyllotaxisSequence,
  divisorSequence, eulerPhiSequence, happySequence, digitalRootSequence,
  polygonalSequence, catalanSequence, bellSequence, triangularSequence,
  customRecurrenceSequence, lucasSequence, pellSequence, primeGapSequence,
} from './engines';
import { mapValueToGrid } from './grids';
import { buildArtwork, normalizeArtwork } from '../lib/math';
import type { EngineId } from './types';

const SEED = 42;
const STEPS = 200;

interface EngineAudit {
  id: EngineId;
  name: string;
  outputSample: number[];
  outputLength: number;
  minVal: number;
  maxVal: number;
  allFinite: boolean;
  hasNegative: boolean;
  valueRange: string;
  gridPositions: Array<{ x: number; y: number }>;
  gridXRange: string;
  gridYRange: string;
  normalizedRange: string;
  dataType: 'sequence' | 'density-field' | 'binary-grid';
}

function auditEngine(id: EngineId, name: string, generate: (seed: number, n: number) => number[], dataType: EngineAudit['dataType']): EngineAudit {
  const output = generate(SEED, STEPS);
  const minVal = Math.min(...output);
  const maxVal = Math.max(...output);
  const allFinite = output.every(Number.isFinite);
  const hasNegative = output.some((v) => v < 0);

  const gridPositions = output.slice(0, 20).map((v) => mapValueToGrid(v, 'ulam'));
  const gx = gridPositions.map((p) => p.x);
  const gy = gridPositions.map((p) => p.y);

  const { points } = buildArtwork(SEED, STEPS, id, 'ulam');
  const normalized = normalizeArtwork(points);
  const nx = normalized.map((p) => p.x);
  const ny = normalized.map((p) => p.y);

  return {
    id, name,
    outputSample: output.slice(0, 10),
    outputLength: output.length,
    minVal, maxVal, allFinite, hasNegative,
    valueRange: `[${minVal}, ${maxVal}]`,
    gridPositions,
    gridXRange: `[${Math.min(...gx).toFixed(2)}, ${Math.max(...gx).toFixed(2)}]`,
    gridYRange: `[${Math.min(...gy).toFixed(2)}, ${Math.max(...gy).toFixed(2)}]`,
    normalizedRange: `[${Math.min(...nx).toFixed(3)}, ${Math.max(...nx).toFixed(3)}] x [${Math.min(...ny).toFixed(3)}, ${Math.max(...ny).toFixed(3)}]`,
    dataType,
  };
}

describe('ENGINE AUDIT — FASE 1', () => {
  const audits: EngineAudit[] = [
    auditEngine('collatz', 'Collatz', collatzSequence, 'sequence'),
    auditEngine('recaman', 'Recamán', recamanSequence, 'sequence'),
    auditEngine('fibonacci', 'Fibonacci', fibonacciSequence, 'sequence'),
    auditEngine('primes', 'Primes', primeSequence, 'sequence'),
    auditEngine('prime-gaps', 'Prime Gaps', primeGapSequence, 'sequence'),
    auditEngine('divisors', 'Divisors', divisorSequence, 'sequence'),
    auditEngine('euler-phi', 'Euler Phi', eulerPhiSequence, 'sequence'),
    auditEngine('mobius', 'Möbius', mobiusSequence, 'sequence'),
    auditEngine('happy', 'Happy', happySequence, 'sequence'),
    auditEngine('digital-root', 'Digital Root', digitalRootSequence, 'sequence'),
    auditEngine('polygonal', 'Polygonal', polygonalSequence, 'sequence'),
    auditEngine('catalan', 'Catalan', catalanSequence, 'sequence'),
    auditEngine('bell', 'Bell', bellSequence, 'sequence'),
    auditEngine('triangular', 'Triangular', triangularSequence, 'sequence'),
    auditEngine('custom-recurrence', 'Recurrence', customRecurrenceSequence, 'sequence'),
    auditEngine('lucas', 'Lucas', lucasSequence, 'sequence'),
    auditEngine('pell', 'Pell', pellSequence, 'sequence'),
    auditEngine('perfect', 'Perfect', perfectNumberSequence, 'sequence'),
    auditEngine('square', 'Square', squareNumberSequence, 'sequence'),
    auditEngine('logistic-map', 'Logistic Map', logisticMapSequence, 'sequence'),
    auditEngine('lorenz', 'Lorenz', lorenzSequence, 'sequence'),
    auditEngine('henon', 'Hénon', henonMapSequence, 'sequence'),
    auditEngine('rossler', 'Rössler', rosslerSequence, 'sequence'),
    auditEngine('mandelbrot', 'Mandelbrot', mandelbrotSequence, 'density-field'),
    auditEngine('julia', 'Julia', juliaSequence, 'density-field'),
    auditEngine('burning-ship', 'Burning Ship', burningShipSequence, 'density-field'),
    auditEngine('lsystem', 'L-System', lSystemSequence, 'sequence'),
    auditEngine('phyllotaxis', 'Phyllotaxis', phyllotaxisSequence, 'sequence'),
    auditEngine('cellular-automata', 'Cell Automata', cellularAutomataSequence, 'binary-grid'),
    auditEngine('sierpinski', 'Sierpinski', sierpinskiSequence, 'binary-grid'),
  ];

  it('all engines produce finite output', () => {
    for (const a of audits) {
      expect(a.allFinite).toBe(true);
    }
  });

  it('all engines produce non-empty output', () => {
    for (const a of audits) {
      expect(a.outputLength).toBeGreaterThan(0);
    }
  });

  it('print full audit table', () => {
    const lines: string[] = [];
    lines.push('');
    lines.push('ENGINE                 | TYPE          | LEN | RANGE               | GRID X              | GRID Y              | NORMALIZED');
    lines.push('-----------------------|---------------|-----|---------------------|---------------------|---------------------|------------------');
    for (const a of audits) {
      lines.push(
        `${a.name.padEnd(23)} | ${(a.dataType).padEnd(13)} | ${String(a.outputLength).padStart(3)} | ${a.valueRange.padEnd(19)} | ${a.gridXRange.padEnd(19)} | ${a.gridYRange.padEnd(19)} | ${a.normalizedRange}`,
      );
    }
    console.log(lines.join('\n'));
  });

  it('MOBIUS: values are only -1, 0, 1 — grid maps them to near-identical positions', () => {
    const output = mobiusSequence(SEED, STEPS);
    const unique = [...new Set(output)];
    expect(unique.sort()).toEqual([-1, 0, 1]);

    const positions = output.map((v) => mapValueToGrid(v, 'ulam'));
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const ySpread = Math.max(...ys) - Math.min(...ys);

    expect(xSpread).toBeLessThan(2);
    expect(ySpread).toBeLessThan(2);
  });

  it('JULIA: produces escape-time values, not positional data', () => {
    const output = juliaSequence(SEED, STEPS);
    const unique = [...new Set(output)];
    expect(unique.length).toBeLessThan(55);
    expect(Math.max(...output)).toBeLessThanOrEqual(50);
  });

  it('BURNING SHIP: same pattern as Julia — escape-time density', () => {
    const output = burningShipSequence(SEED, STEPS);
    const unique = [...new Set(output)];
    expect(unique.length).toBeLessThan(55);
  });

  it('MANDELBROT: same pattern — escape-time density', () => {
    const output = mandelbrotSequence(SEED, STEPS);
    const unique = [...new Set(output)];
    expect(unique.length).toBeLessThan(55);
  });

  it('CELLULAR AUTOMATA: binary 0/1 grid output', () => {
    const output = cellularAutomataSequence(SEED, STEPS);
    const unique = [...new Set(output)];
    expect(unique.sort()).toEqual([0, 1]);
    expect(output.length).toBe(STEPS);
  });

  it('SIERPINSKI: binary 0/1 grid output', () => {
    const output = sierpinskiSequence(SEED, STEPS);
    const unique = [...new Set(output)];
    expect(unique.sort()).toEqual([0, 1]);
  });

  it('PERFECT: very few values — sparse output', () => {
    const output = perfectNumberSequence(SEED, 10);
    expect(output.length).toBeLessThanOrEqual(10);
    expect(output.length).toBeGreaterThan(0);
    expect(output.every((v) => v > 0)).toBe(true);
  });

  it('SQUARE: monotonically increasing — produces a line when plotted', () => {
    const output = squareNumberSequence(SEED, STEPS);
    for (let i = 1; i < output.length; i++) {
      expect(output[i]).toBeGreaterThan(output[i - 1]);
    }
  });
});
