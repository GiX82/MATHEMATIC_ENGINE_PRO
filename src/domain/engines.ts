import type { EngineDefinition, EngineId, SequenceGenerator } from './types';

/** Limite superiore del seed: previene freeze della UI con motori O(n) o O(√n). */
export const MAX_SEED = 1_000_000;

export function clampSeed(input: number): number {
  if (!Number.isFinite(input)) return 1;
  const next = Math.trunc(input);
  return Math.min(MAX_SEED, Math.max(1, next));
}

export function collatzSequence(seed: number, maxIterations = 1200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence = [safeSeed];
  let current = safeSeed;
  let count = 0;

  while (current !== 1 && count < maxIterations) {
    if (current > Number.MAX_SAFE_INTEGER / 3 && current % 2 !== 0) {
      break;
    }

    current = current % 2 === 0 ? current / 2 : current * 3 + 1;
    sequence.push(current);
    count += 1;
  }

  if (sequence[sequence.length - 1] !== 1) {
    sequence.push(1);
  }

  return sequence;
}

export function recamanSequence(seed: number, maxIterations = 1200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence = [safeSeed];
  const seen = new Set<number>([safeSeed]);
  let previous = safeSeed;

  for (let index = 1; index < maxIterations; index += 1) {
    const nextTerm = previous - index;
    const candidate = nextTerm > 0 && !seen.has(nextTerm) ? nextTerm : previous + index;
    sequence.push(candidate);
    previous = candidate;
    seen.add(candidate);

    if (candidate === 1) break;
  }

  return sequence;
}

export function fibonacciSequence(seed: number, maxIterations = 1200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence = [safeSeed];
  let previous = 0;
  let current = safeSeed;

  for (let index = 0; index < maxIterations; index += 1) {
    const next = previous + current;
    sequence.push(next);
    previous = current;
    current = next;

    if (next > Number.MAX_SAFE_INTEGER / 2) break;
  }

  return sequence;
}

export function primeSequence(seed: number, maxIterations = 500): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  let candidate = Math.max(2, safeSeed);

  while (sequence.length < maxIterations) {
    let isPrime = true;
    const limit = Math.floor(Math.sqrt(candidate));

    for (let value = 2; value <= limit; value += 1) {
      if (candidate % value === 0) {
        isPrime = false;
        break;
      }
    }

    if (isPrime) {
      sequence.push(candidate);
    }

    candidate += 1;
  }

  return sequence;
}

export function primeGapSequence(seed: number, maxIterations = 300): number[] {
  const primes = primeSequence(seed, maxIterations + 10);
  const gaps = [0];

  for (let index = 1; index < primes.length; index += 1) {
    gaps.push(primes[index] - primes[index - 1]);
  }

  return gaps.slice(0, maxIterations);
}

export function divisorSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  let current = Math.max(1, safeSeed);

  while (sequence.length < maxIterations) {
    let divisorCount = 0;
    const limit = Math.floor(Math.sqrt(current));

    for (let value = 1; value <= limit; value += 1) {
      if (current % value === 0) {
        divisorCount += value * value === current ? 1 : 2;
      }
    }

    sequence.push(divisorCount);
    current += 1;
  }

  return sequence;
}

export function eulerPhiSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  for (let index = 1; index <= maxIterations; index += 1) {
    let value = safeSeed + index;
    let count = value;
    for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
      if (value % divisor === 0) {
        while (value % divisor === 0) value /= divisor;
        count -= count / divisor;
      }
    }
    if (value > 1) count -= count / value;
    sequence.push(count);
  }
  return sequence;
}

export function mobiusSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];

  for (let index = 0; index < maxIterations; index += 1) {
    const value = safeSeed + index;
    let current = value;
    let mu = 1;

    for (let divisor = 2; divisor * divisor <= current; divisor += 1) {
      if (current % divisor === 0) {
        current /= divisor;
        if (current % divisor === 0) {
          mu = 0;
          break;
        }
        mu *= -1;
      }
    }

    // Fattore primo residuo maggiore di sqrt(value): flip del segno.
    if (mu !== 0 && current > 1) {
      mu *= -1;
    }

    sequence.push(mu);
  }

  return sequence;
}

export function happySequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];

  for (let value = safeSeed; sequence.length < maxIterations; value += 1) {
    let current = value;
    const seen = new Set<number>();
    while (current !== 1 && !seen.has(current)) {
      seen.add(current);
      current = String(current).split('').reduce((sum, digit) => sum + Number(digit) ** 2, 0);
    }
    sequence.push(current === 1 ? value : 0);
  }

  return sequence;
}

export function digitalRootSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];

  for (let index = 0; index < maxIterations; index += 1) {
    let current = safeSeed + index;
    while (current >= 10) {
      current = String(current).split('').reduce((sum, char) => sum + Number(char), 0);
    }
    sequence.push(current);
  }

  return sequence;
}

export function polygonalSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  const k = 6;

  for (let index = 0; index < maxIterations; index += 1) {
    const value = safeSeed + index;
    sequence.push((k * value * (value - 1)) / 2 + value);
  }

  return sequence;
}

export function catalanSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  let previous = safeSeed || 1;

  for (let index = 0; index < maxIterations; index += 1) {
    const value = previous * (4 * index + 2) / (index + 2);
    // I numeri di Catalan crescono esponenzialmente: stop prima dell'overflow.
    if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) break;
    sequence.push(Math.floor(value));
    previous = value;
  }

  return sequence;
}

export function bellSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  const startIndex = Math.max(0, safeSeed % 12);

  for (let index = 0; index < maxIterations; index += 1) {
    const n = index + startIndex;
    if (n === 0) {
      sequence.push(1);
      continue;
    }

    // Triangolo di Bell (array di Aitken): B_n è il primo elemento della riga n.
    let row = [1];
    let bell = 1;

    for (let level = 1; level <= n; level += 1) {
      const nextRow = new Array<number>(level + 1);
      nextRow[0] = row[level - 1];
      for (let value = 1; value <= level; value += 1) {
        nextRow[value] = nextRow[value - 1] + row[value - 1];
      }
      row = nextRow;
      bell = row[0];

      // I numeri di Bell esplodono esponenzialmente: stop prima dell'overflow.
      if (!Number.isFinite(bell) || bell > Number.MAX_SAFE_INTEGER) break;
    }

    if (!Number.isFinite(bell) || bell > Number.MAX_SAFE_INTEGER) break;
    sequence.push(bell);
  }

  return sequence;
}

export function stirlingSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];

  for (let index = 0; index < maxIterations; index += 1) {
    sequence.push((safeSeed + index) * (safeSeed + index + 1) / 2);
  }

  return sequence;
}

export function customRecurrenceSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence = [safeSeed];
  let previous = safeSeed;

  for (let index = 1; index < maxIterations; index += 1) {
    const next = previous + index * index;
    sequence.push(next);
    previous = next;
  }

  return sequence;
}

export const engineDefinitions: Record<EngineId, EngineDefinition> = {
  collatz: {
    id: 'collatz',
    name: 'Collatz',
    description: 'Iterazione 3n+1 e divisione per due.',
    premium: false,
    generate: collatzSequence,
  },
  recaman: {
    id: 'recaman',
    name: 'Recamán',
    description: 'Sequenza autointersecante e molto irregolare.',
    premium: true,
    generate: recamanSequence,
  },
  fibonacci: {
    id: 'fibonacci',
    name: 'Fibonacci',
    description: 'Crescita esponenziale e simmetria radiale.',
    premium: true,
    generate: fibonacciSequence,
  },
  primes: {
    id: 'primes',
    name: 'Primi',
    description: 'Numeri primi e loro distribuzione.',
    premium: true,
    generate: primeSequence,
  },
  'prime-gaps': {
    id: 'prime-gaps',
    name: 'Intervalli primi',
    description: 'Differenze tra primi consecutivi.',
    premium: true,
    generate: primeGapSequence,
  },
  divisors: {
    id: 'divisors',
    name: 'Divisori',
    description: 'Conteggio di divisori per ogni intero.',
    premium: true,
    generate: divisorSequence,
  },
  'euler-phi': {
    id: 'euler-phi',
    name: 'Phi di Eulero',
    description: 'Funzione di Eulero e struttura dei coprimi.',
    premium: true,
    generate: eulerPhiSequence,
  },
  mobius: {
    id: 'mobius',
    name: 'Möbius',
    description: 'Valore di Möbius su intervalli numerici.',
    premium: true,
    generate: mobiusSequence,
  },
  happy: {
    id: 'happy',
    name: 'Numeri felici',
    description: 'Iterazioni basate sulla somma dei quadrati delle cifre.',
    premium: true,
    generate: happySequence,
  },
  'digital-root': {
    id: 'digital-root',
    name: 'Radice digitale',
    description: 'Riduzione digitale iterata.',
    premium: true,
    generate: digitalRootSequence,
  },
  polygonal: {
    id: 'polygonal',
    name: 'Numeri poligonali',
    description: 'Numeri poligonali generici.',
    premium: true,
    generate: polygonalSequence,
  },
  catalan: {
    id: 'catalan',
    name: 'Catalan',
    description: 'Numeri di Catalan e strutture combinatorie.',
    premium: true,
    generate: catalanSequence,
  },
  bell: {
    id: 'bell',
    name: 'Bell',
    description: 'Partizioni e numeri di Bell.',
    premium: true,
    generate: bellSequence,
  },
  stirling: {
    id: 'stirling',
    name: 'Stirling',
    description: 'Partizioni con simmetria combinatoria.',
    premium: true,
    generate: stirlingSequence,
  },
  'custom-recurrence': {
    id: 'custom-recurrence',
    name: 'Ricorrenza personalizzata',
    description: 'Formula definita dall’utente, pronta ad essere estesa.',
    premium: true,
    generate: customRecurrenceSequence,
  },
};

export const engineIds = Object.keys(engineDefinitions) as EngineId[];

export function generateSequence(seed: number, engine: EngineId = 'collatz', maxIterations = 200): number[] {
  return engineDefinitions[engine].generate(seed, maxIterations);
}

export function createSequencePreset(seed: number, engine: EngineId = 'collatz', maxIterations = 200): number[] {
  return generateSequence(seed, engine, maxIterations);
}

export const sequenceGenerators: Record<EngineId, SequenceGenerator> = Object.fromEntries(
  Object.values(engineDefinitions).map((engine) => [engine.id, engine.generate]),
) as Record<EngineId, SequenceGenerator>;
