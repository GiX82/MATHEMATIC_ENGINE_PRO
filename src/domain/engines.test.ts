import { describe, it, expect } from 'vitest';
import {
  clampSeed,
  collatzSequence,
  recamanSequence,
  fibonacciSequence,
  primeSequence,
  primeGapSequence,
  divisorSequence,
  eulerPhiSequence,
  mobiusSequence,
  happySequence,
  digitalRootSequence,
  polygonalSequence,
  catalanSequence,
  bellSequence,
  triangularSequence,
  customRecurrenceSequence,
  lucasSequence,
  pellSequence,
  perfectNumberSequence,
  squareNumberSequence,
  logisticMapSequence,
  lorenzSequence,
  henonMapSequence,
  rosslerSequence,
  mandelbrotSequence,
  juliaSequence,
  burningShipSequence,
  lSystemSequence,
  phyllotaxisSequence,
  cellularAutomataSequence,
  sierpinskiSequence,
  engineDefinitions,
  generateSequence,
} from './engines';

function allFinite(arr: number[]) {
  return arr.every((n) => Number.isFinite(n));
}

function isNonDecreasing(arr: number[]) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

describe('clampSeed', () => {
  it('clamps to [1, MAX_SEED]', () => {
    expect(clampSeed(0)).toBe(1);
    expect(clampSeed(-5)).toBe(1);
    expect(clampSeed(1_000_001)).toBe(1_000_000);
    expect(clampSeed(42)).toBe(42);
  });

  it('handles NaN/Infinity', () => {
    expect(clampSeed(NaN)).toBe(1);
    expect(clampSeed(Infinity)).toBe(1);
  });
});

describe('Collatz sequence', () => {
  it('starts with seed', () => {
    expect(collatzSequence(6)[0]).toBe(6);
  });

  it('ends with 1', () => {
    const seq = collatzSequence(6);
    expect(seq[seq.length - 1]).toBe(1);
  });

  it('is deterministic', () => {
    const a = collatzSequence(42);
    const b = collatzSequence(42);
    expect(a).toEqual(b);
  });

  it('follows 3n+1 rules', () => {
    const seq = collatzSequence(7);
    for (let i = 0; i < seq.length - 1; i++) {
      const curr = seq[i];
      const next = seq[i + 1];
      if (curr % 2 === 0) {
        expect(next).toBe(curr / 2);
      } else {
        expect(next).toBe(curr * 3 + 1);
      }
    }
  });
});

describe('Recamán sequence', () => {
  it('starts with seed', () => {
    expect(recamanSequence(5)[0]).toBe(5);
  });

  it('contains only positive values', () => {
    const seq = recamanSequence(10, 50);
    expect(seq.every((n) => n >= 0)).toBe(true);
  });
});

describe('Fibonacci sequence', () => {
  it('starts with seed', () => {
    expect(fibonacciSequence(1)[0]).toBe(1);
  });

  it('follows F(n) = F(n-1) + F(n-2) from second element', () => {
    const seq = fibonacciSequence(1, 20);
    for (let i = 2; i < seq.length; i++) {
      expect(seq[i]).toBe(seq[i - 1] + seq[i - 2]);
    }
  });
});

describe('Prime sequence', () => {
  it('returns known primes', () => {
    const seq = primeSequence(1, 10);
    expect(seq).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });

  it('all values are prime', () => {
    const seq = primeSequence(1, 30);
    for (const n of seq) {
      let isPrime = true;
      for (let d = 2; d * d <= n; d++) {
        if (n % d === 0) { isPrime = false; break; }
      }
      expect(isPrime).toBe(true);
    }
  });
});

describe('Prime gap sequence', () => {
  it('first gap is 0', () => {
    expect(primeGapSequence(1, 5)[0]).toBe(0);
  });

  it('gaps are non-negative', () => {
    const gaps = primeGapSequence(1, 20);
    expect(gaps.every((g) => g >= 0)).toBe(true);
  });
});

describe('Divisor sequence', () => {
  it('d(1) = 1', () => {
    expect(divisorSequence(1, 1)[0]).toBe(1);
  });

  it('d(6) = 4', () => {
    const seq = divisorSequence(6, 1);
    expect(seq[0]).toBe(4);
  });
});

describe('Euler phi sequence', () => {
  it('phi values are positive', () => {
    const seq = eulerPhiSequence(1, 20);
    expect(seq.every((n) => n > 0)).toBe(true);
  });

  it('phi(1) = 1', () => {
    expect(eulerPhiSequence(1, 1)[0]).toBe(1);
  });
});

describe('Möbius sequence', () => {
  it('returns only -1, 0, or 1', () => {
    const seq = mobiusSequence(1, 50);
    expect(seq.every((n) => [-1, 0, 1].includes(n))).toBe(true);
  });
});

describe('Happy sequence', () => {
  it('returns seed or 0 for each value', () => {
    const seq = happySequence(1, 30);
    expect(seq.every((n) => n === 0 || n >= 1)).toBe(true);
  });
});

describe('Digital root sequence', () => {
  it('all values are single digits', () => {
    const seq = digitalRootSequence(1, 30);
    expect(seq.every((n) => n >= 1 && n <= 9)).toBe(true);
  });
});

describe('Polygonal sequence', () => {
  it('grows monotonically', () => {
    const seq = polygonalSequence(1, 20);
    expect(isNonDecreasing(seq)).toBe(true);
  });
});

describe('Catalan sequence', () => {
  it('starts with log10(2)', () => {
    expect(catalanSequence(1, 10)[0]).toBeCloseTo(Math.log10(2), 10);
  });

  it('grows monotonically', () => {
    const seq = catalanSequence(1, 10);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThanOrEqual(seq[i - 1]);
    }
  });
});

describe('Bell sequence', () => {
  it('starts with 1', () => {
    const seq = bellSequence(0, 10);
    expect(seq[0]).toBe(1);
  });
});

describe('Triangular sequence', () => {
  it('returns known triangular numbers', () => {
    const seq = triangularSequence(1, 5);
    expect(seq[0]).toBe(1);
    expect(seq[1]).toBe(3);
    expect(seq[2]).toBe(6);
    expect(seq[3]).toBe(10);
    expect(seq[4]).toBe(15);
  });
});

describe('Custom recurrence', () => {
  it('starts with clamped seed (0→1)', () => {
    expect(customRecurrenceSequence(0, 3)[0]).toBe(1);
  });

  it('adds n² at each step', () => {
    const seq = customRecurrenceSequence(0, 4);
    expect(seq[1]).toBe(1 + 1 * 1);
    expect(seq[2]).toBe(seq[1] + 2 * 2);
    expect(seq[3]).toBe(seq[2] + 3 * 3);
  });
});

describe('Lucas sequence', () => {
  it('starts with 2, 1 for seed=1 (offset=0)', () => {
    const seq = lucasSequence(1, 10);
    expect(seq[0]).toBe(2);
    expect(seq[1]).toBe(1);
  });

  it('follows L(n) = L(n-1) + L(n-2)', () => {
    const seq = lucasSequence(1, 20);
    for (let i = 2; i < seq.length; i++) {
      expect(seq[i]).toBe(seq[i - 1] + seq[i - 2]);
    }
  });

  it('known values from offset 0: 2, 1, 3, 4, 7, 11', () => {
    const seq = lucasSequence(1, 6);
    expect(seq).toEqual([2, 1, 3, 4, 7, 11]);
  });

  it('different seeds produce different outputs', () => {
    const a = lucasSequence(1, 20);
    const b = lucasSequence(50, 20);
    expect(a).not.toEqual(b);
  });

  it('seed offsets into the Lucas sequence', () => {
    const seq1 = lucasSequence(1, 6);
    const seq5 = lucasSequence(5, 6);
    expect(seq1[0]).toBe(2);
    expect(seq5[0]).not.toBe(2);
  });
});

describe('Pell sequence', () => {
  it('starts with seed', () => {
    expect(pellSequence(2, 3)[0]).toBe(2);
  });

  it('follows P(n) = 2*P(n-1) + P(n-2)', () => {
    const seq = pellSequence(1, 15);
    for (let i = 2; i < seq.length; i++) {
      expect(seq[i]).toBe(2 * seq[i - 1] + seq[i - 2]);
    }
  });
});

describe('Perfect number sequence', () => {
  it('all values are finite ratios between 0 and 3', () => {
    const seq = perfectNumberSequence(1, 10);
    for (const n of seq) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThan(3);
    }
  });
});

describe('Square number sequence', () => {
  it('returns perfect squares starting from clamped seed', () => {
    const seq = squareNumberSequence(0, 5);
    expect(seq).toEqual([1, 4, 9, 16, 25]);
  });

  it('returns perfect squares from seed=2', () => {
    const seq = squareNumberSequence(2, 3);
    expect(seq).toEqual([4, 9, 16]);
  });
});

describe('Logistic map sequence', () => {
  it('all values are finite', () => {
    const seq = logisticMapSequence(42, 50);
    expect(allFinite(seq)).toBe(true);
  });

  it('scales output by 10000', () => {
    const seq = logisticMapSequence(1, 5);
    expect(seq.every((n) => n >= 0 && n <= 10000)).toBe(true);
  });
});

describe('Lorenz sequence', () => {
  it('all values are finite', () => {
    const seq = lorenzSequence(42, 50);
    expect(seq.every((n) => Number.isFinite(n))).toBe(true);
  });

  it('returns interleaved x,y,z triplets', () => {
    const seq = lorenzSequence(42, 10);
    expect(seq.length).toBe(30);
  });

  it('is deterministic', () => {
    const a = lorenzSequence(42, 20);
    const b = lorenzSequence(42, 20);
    expect(a).toEqual(b);
  });
});

describe('Hénon map sequence', () => {
  it('all values are finite', () => {
    const seq = henonMapSequence(42, 50);
    expect(allFinite(seq)).toBe(true);
  });
});

describe('Rössler sequence', () => {
  it('all values are finite', () => {
    const seq = rosslerSequence(42, 50);
    expect(seq.every((n) => Number.isFinite(n))).toBe(true);
  });

  it('returns interleaved x,y,z triplets', () => {
    const seq = rosslerSequence(42, 10);
    expect(seq.length).toBe(30);
  });
});

describe('Mandelbrot sequence', () => {
  it('all values are integers in [0, 50]', () => {
    const seq = mandelbrotSequence(42, 50);
    expect(seq.every((n) => Number.isInteger(n) && n >= 0 && n <= 50)).toBe(true);
  });
});

describe('Julia sequence', () => {
  it('all values are integers in [0, 50]', () => {
    const seq = juliaSequence(42, 50);
    expect(seq.every((n) => Number.isInteger(n) && n >= 0 && n <= 50)).toBe(true);
  });
});

describe('Burning ship sequence', () => {
  it('all values are integers in [0, 50]', () => {
    const seq = burningShipSequence(42, 50);
    expect(seq.every((n) => Number.isInteger(n) && n >= 0 && n <= 50)).toBe(true);
  });
});

describe('L-System sequence', () => {
  it('returns coordinate pairs', () => {
    const seq = lSystemSequence(100, 30);
    expect(seq.length % 2).toBe(0);
  });

  it('all values are finite', () => {
    const seq = lSystemSequence(100, 30);
    expect(allFinite(seq)).toBe(true);
  });
});

describe('Phyllotaxis sequence', () => {
  it('all values are non-negative', () => {
    const seq = phyllotaxisSequence(42, 30);
    expect(seq.every((n) => n >= 0)).toBe(true);
  });

  it('grows with index', () => {
    const seq = phyllotaxisSequence(42, 20);
    expect(isNonDecreasing(seq)).toBe(true);
  });
});

describe('Cellular automata sequence', () => {
  it('contains only 0s and 1s', () => {
    const seq = cellularAutomataSequence(30, 100);
    expect(seq.every((n) => n === 0 || n === 1)).toBe(true);
  });
});

describe('Sierpinski sequence', () => {
  it('contains only 0s and 1s', () => {
    const seq = sierpinskiSequence(1, 100);
    expect(seq.every((n) => n === 0 || n === 1)).toBe(true);
  });
});

describe('generateSequence (unified API)', () => {
  it('produces output for all engines', () => {
    const ids = Object.keys(engineDefinitions) as Array<keyof typeof engineDefinitions>;
    for (const id of ids) {
      const seq = generateSequence(42, id, 20);
      expect(seq.length).toBeGreaterThan(0);
      expect(allFinite(seq)).toBe(true);
    }
  });
});

describe('All 30 engines', () => {
  const ids = Object.keys(engineDefinitions) as Array<keyof typeof engineDefinitions>;

  for (const id of ids) {
    it(`${id}: returns non-empty array of finite numbers`, () => {
      const seq = generateSequence(42, id, 20);
      expect(Array.isArray(seq)).toBe(true);
      expect(seq.length).toBeGreaterThan(0);
      expect(allFinite(seq)).toBe(true);
    });

    it(`${id}: deterministic (same seed → same output)`, () => {
      const a = generateSequence(42, id, 20);
      const b = generateSequence(42, id, 20);
      expect(a).toEqual(b);
    });
  }
});
