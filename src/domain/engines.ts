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

export function triangularSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];

  for (let index = 0; index < maxIterations; index += 1) {
    const n = safeSeed + index;
    sequence.push((n * (n + 1)) / 2);
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

export function lucasSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence = [safeSeed];
  let a = safeSeed;
  let b = safeSeed + 1;
  for (let i = 1; i < maxIterations; i++) {
    const next = a + b;
    sequence.push(next);
    a = b;
    b = next;
    if (next > Number.MAX_SAFE_INTEGER / 2) break;
  }
  return sequence;
}

export function pellSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence = [safeSeed];
  let a = 0;
  let b = safeSeed || 1;
  for (let i = 1; i < maxIterations; i++) {
    const next = 2 * b + a;
    sequence.push(next);
    a = b;
    b = next;
    if (next > Number.MAX_SAFE_INTEGER / 2) break;
  }
  return sequence;
}

export function perfectNumberSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  let candidate = Math.max(2, safeSeed);
  while (sequence.length < maxIterations) {
    let sum = 1;
    const limit = Math.floor(Math.sqrt(candidate));
    for (let d = 2; d <= limit; d++) {
      if (candidate % d === 0) {
        sum += d;
        if (d !== candidate / d) sum += candidate / d;
      }
    }
    if (sum === candidate && candidate > 1) sequence.push(candidate);
    candidate++;
    if (candidate > 100000) break;
  }
  return sequence;
}

export function squareNumberSequence(seed: number, maxIterations = 200): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  for (let i = 0; i < maxIterations; i++) {
    const n = safeSeed + i;
    sequence.push(n * n);
  }
  return sequence;
}

export function logisticMapSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const r = 3.5 + (safeSeed % 40) * 0.01;
  const sequence: number[] = [];
  let x = (safeSeed % 1000) / 1000 || 0.5;
  for (let i = 0; i < maxIterations; i++) {
    x = r * x * (1 - x);
    sequence.push(x * 10000);
  }
  return sequence;
}

export function lorenzSequence(seed: number, maxIterations = 500): number[] {
  const safeSeed = clampSeed(seed);
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const dt = 0.005;
  let x = (safeSeed % 1000) / 100 || 1;
  let y = (safeSeed % 500) / 100 || 1;
  let z = (safeSeed % 300) / 100 || 1;
  const sequence: number[] = [];
  for (let i = 0; i < maxIterations; i++) {
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    x += dx;
    y += dy;
    z += dz;
    sequence.push(Math.sqrt(x * x + y * y + z * z) * 100);
  }
  return sequence;
}

export function henonMapSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const a = 1.4;
  const b = 0.3;
  let x = (safeSeed % 1000) / 1000 || 0.1;
  let y = 0;
  const sequence: number[] = [];
  for (let i = 0; i < maxIterations; i++) {
    const newX = 1 - a * x * x + y;
    y = b * x;
    x = newX;
    sequence.push(x * 1000 + 1500);
  }
  return sequence;
}

export function rosslerSequence(seed: number, maxIterations = 500): number[] {
  const safeSeed = clampSeed(seed);
  const a = 0.2;
  const b = 0.2;
  const c = 5.7;
  const dt = 0.005;
  let x = (safeSeed % 1000) / 100 || 1;
  let y = 0;
  let z = 0;
  const sequence: number[] = [];
  for (let i = 0; i < maxIterations; i++) {
    const dx = -(y + z) * dt;
    const dy = (x + a * y) * dt;
    const dz = (b + z * (x - c)) * dt;
    x += dx;
    y += dy;
    z += dz;
    sequence.push(Math.sqrt(x * x + y * y + z * z) * 100);
  }
  return sequence;
}

export function mandelbrotSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  const cx = (safeSeed % 400) / 100 - 2;
  const cy = (safeSeed % 200) / 100 - 1;
  for (let i = 0; i < maxIterations; i++) {
    const px = (i % 20 - 10) / 5;
    const py = (Math.floor(i / 20) - 15) / 5;
    let zx = 0, zy = 0;
    let iteration = 0;
    while (zx * zx + zy * zy < 4 && iteration < 50) {
      const tmp = zx * zx - zy * zy + cx + px * 0.1;
      zy = 2 * zx * zy + cy + py * 0.1;
      zx = tmp;
      iteration++;
    }
    sequence.push(iteration);
  }
  return sequence;
}

export function juliaSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  const cr = (safeSeed % 400) / 200 - 1;
  const ci = (safeSeed % 200) / 200 - 0.5;
  for (let i = 0; i < maxIterations; i++) {
    let zx = (i % 20 - 10) / 5;
    let zy = (Math.floor(i / 20) - 15) / 5;
    let iteration = 0;
    while (zx * zx + zy * zy < 4 && iteration < 50) {
      const tmp = zx * zx - zy * zy + cr;
      zy = 2 * zx * zy + ci;
      zx = tmp;
      iteration++;
    }
    sequence.push(iteration);
  }
  return sequence;
}

export function burningShipSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  const cx = (safeSeed % 400) / 100 - 2;
  const cy = (safeSeed % 200) / 100 - 2;
  for (let i = 0; i < maxIterations; i++) {
    let zx = 0, zy = 0;
    const px = (i % 20 - 10) / 5;
    const py = (Math.floor(i / 20) - 15) / 5;
    let iteration = 0;
    while (zx * zx + zy * zy < 4 && iteration < 50) {
      const tmp = zx * zx - zy * zy + cx + px * 0.1;
      zy = Math.abs(2 * zx * zy) + cy + py * 0.1;
      zx = Math.abs(tmp);
      iteration++;
    }
    sequence.push(iteration);
  }
  return sequence;
}

export function lSystemSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const sequence: number[] = [];
  let axiom = 'F';
  const rules: Record<string, string> = { F: 'F+F-F-F+F' };
  const iterations = Math.min(4, Math.floor(safeSeed / 250) + 1);
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] ?? ch;
    }
    current = next;
  }
  let angle = 0;
  let x = 0, y = 0;
  const stack: Array<{ x: number; y: number; angle: number }> = [];
  const step = 2;
  for (const ch of current) {
    if (ch === 'F') {
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
      sequence.push(x * 10 + 500);
      sequence.push(y * 10 + 500);
    } else if (ch === '+') {
      angle += Math.PI / 2;
    } else if (ch === '-') {
      angle -= Math.PI / 2;
    } else if (ch === '[') {
      stack.push({ x, y, angle });
    } else if (ch === ']') {
      const state = stack.pop();
      if (state) { x = state.x; y = state.y; angle = state.angle; }
    }
    if (sequence.length >= maxIterations) break;
  }
  return sequence.slice(0, maxIterations);
}

export function phyllotaxisSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const sequence: number[] = [];
  for (let i = 0; i < maxIterations; i++) {
    const angle = i * goldenAngle + safeSeed * 0.001;
    const radius = Math.sqrt(i) * 10;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    sequence.push(Math.sqrt(x * x + y * y) * 10);
  }
  return sequence;
}

export function cellularAutomataSequence(seed: number, maxIterations = 300): number[] {
  const safeSeed = clampSeed(seed);
  const width = 64;
  const rule = safeSeed % 256;
  let cells = new Array(width).fill(0);
  cells[Math.floor(width / 2)] = 1;
  const sequence: number[] = [];
  const rows = Math.floor(maxIterations / width) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < width; c++) {
      sequence.push(cells[c] ? 1 : 0);
    }
    const next = new Array(width).fill(0);
    for (let c = 0; c < width; c++) {
      const left = cells[(c - 1 + width) % width];
      const center = cells[c];
      const right = cells[(c + 1) % width];
      const pattern = (left << 2) | (center << 1) | right;
      next[c] = (rule >> pattern) & 1;
    }
    cells = next;
  }
  return sequence.slice(0, maxIterations);
}

export function sierpinskiSequence(seed: number, maxIterations = 300): number[] {
  void seed;
  const sequence: number[] = [];
  const size = Math.min(64, Math.ceil(Math.sqrt(maxIterations)));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      sequence.push((x & y) === 0 ? 1 : 0);
    }
  }
  return sequence.slice(0, maxIterations);
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
  triangular: {
    id: 'triangular',
    name: 'Triangular',
    description: 'Numeri triangolari con simmetria crescente.',
    premium: true,
    generate: triangularSequence,
  },
  'custom-recurrence': {
    id: 'custom-recurrence',
    name: 'Ricorrenza personalizzata',
    description: 'Formula definita dall\'utente, pronta ad essere estesa.',
    premium: true,
    generate: customRecurrenceSequence,
  },
  lucas: {
    id: 'lucas',
    name: 'Lucas',
    description: 'Sequenza di Lucas, simile a Fibonacci.',
    premium: true,
    generate: lucasSequence,
  },
  pell: {
    id: 'pell',
    name: 'Pell',
    description: 'Numeri di Pell, equazione diofantea.',
    premium: true,
    generate: pellSequence,
  },
  perfect: {
    id: 'perfect',
    name: 'Perfetti',
    description: 'Numeri perfetti: somma dei divisori uguali al numero.',
    premium: true,
    generate: perfectNumberSequence,
  },
  square: {
    id: 'square',
    name: 'Quadrati',
    description: 'Numeri quadrati: n².',
    premium: true,
    generate: squareNumberSequence,
  },
  'logistic-map': {
    id: 'logistic-map',
    name: 'Logistic Map',
    description: 'Mappa logistica caotica: x_{n+1} = r·x·(1-x).',
    premium: true,
    generate: logisticMapSequence,
  },
  lorenz: {
    id: 'lorenz',
    name: 'Lorenz',
    description: 'Attrattore di Lorenz: sistema dinamico caotico.',
    premium: true,
    generate: lorenzSequence,
  },
  henon: {
    id: 'henon',
    name: 'Hénon',
    description: 'Mappa di Hénon: attrattore strano bidimensionale.',
    premium: true,
    generate: henonMapSequence,
  },
  rossler: {
    id: 'rossler',
    name: 'Rössler',
    description: 'Attrattore di Rössler: oscillazioni caotiche.',
    premium: true,
    generate: rosslerSequence,
  },
  mandelbrot: {
    id: 'mandelbrot',
    name: 'Mandelbrot',
    description: 'Insieme di Mandelbrot: frattale complesso.',
    premium: true,
    generate: mandelbrotSequence,
  },
  julia: {
    id: 'julia',
    name: 'Julia',
    description: 'Insieme di Julia: frattale derivato.',
    premium: true,
    generate: juliaSequence,
  },
  'burning-ship': {
    id: 'burning-ship',
    name: 'Burning Ship',
    description: 'Nave che brucia: variante del Mandelbrot.',
    premium: true,
    generate: burningShipSequence,
  },
  lsystem: {
    id: 'lsystem',
    name: 'L-System',
    description: 'Sistemi di Lindenmayer: crescita vegetale e frattali.',
    premium: true,
    generate: lSystemSequence,
  },
  phyllotaxis: {
    id: 'phyllotaxis',
    name: 'Phyllotaxis',
    description: 'Angolo aureo: disposizione foglie e semi.',
    premium: true,
    generate: phyllotaxisSequence,
  },
  'cellular-automata': {
    id: 'cellular-automata',
    name: 'Cellular Automata',
    description: 'Automi cellulari unidimensionali (Regola 30).',
    premium: true,
    generate: cellularAutomataSequence,
  },
  sierpinski: {
    id: 'sierpinski',
    name: 'Sierpinski',
    description: 'Triangolo di Sierpinski: frattale binario.',
    premium: true,
    generate: sierpinskiSequence,
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
