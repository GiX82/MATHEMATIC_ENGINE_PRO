export type EngineId =
  | 'collatz'
  | 'recaman'
  | 'fibonacci'
  | 'primes'
  | 'prime-gaps'
  | 'divisors'
  | 'euler-phi'
  | 'mobius'
  | 'happy'
  | 'digital-root'
  | 'polygonal'
  | 'catalan'
  | 'bell'
  | 'triangular'
  | 'custom-recurrence'
  | 'lucas'
  | 'pell'
  | 'perfect'
  | 'square'
  | 'logistic-map'
  | 'lorenz'
  | 'henon'
  | 'rossler'
  | 'mandelbrot'
  | 'julia'
  | 'burning-ship'
  | 'lsystem'
  | 'phyllotaxis'
  | 'cellular-automata'
  | 'sierpinski';

export type GridId =
  | 'ulam'
  | 'cartesian'
  | 'square-spiral'
  | 'hexagonal'
  | 'triangular'
  | 'radial'
  | 'concentric'
  | 'polar-spiral'
  | 'golden-spiral'
  | 'hilbert'
  | 'morton'
  | 'random'
  | 'voronoi'
  | 'recursive';

export type PaletteId = 'void' | 'aurora' | 'nebula' | 'solar' | 'ice' | 'inferno';
export type GeometryMode = 'points' | 'lines' | 'polygons' | 'particles' | 'tubes' | 'surface' | 'mesh' | 'ribbon' | 'torus' | 'cylinder' | 'cone' | 'branching' | 'network' | 'trail';
export type MaterialMode = 'basic' | 'metallic' | 'glass' | 'crystal' | 'gem' | 'holographic';
export type EffectMode = 'bloom' | 'glow' | 'depth' | 'reflection' | 'refraction' | 'fog' | 'cinematic-lighting';
export type LightPresetId = 'standard' | 'cinematic' | 'neon' | 'studio' | 'dark';
export type MotionPresetId = 'ease-in-out' | 'ease-in' | 'ease-out' | 'spring' | 'bounce' | 'procedural-wave';
export type CameraPresetId = 'orbit' | 'close-up' | 'wide-angle' | 'cinematic';
export type RenderMode = '2d' | '3d';

export type ArtworkPoint = {
  index: number;
  value: number;
  x: number;
  y: number;
  z?: number;
};

export type ArtworkMetrics = {
  length: number;
  maxValue: number;
  even: number;
  odd: number;
  peak: number;
  hash: string;
};

export type ArtworkSpec = {
  seed: number;
  engine: EngineId;
  grid: GridId;
  palette: PaletteId;
  mode: RenderMode;
  steps: number;
  points: ArtworkPoint[];
  metrics: ArtworkMetrics;
};

export type SequenceGenerator = (seed: number, maxIterations?: number) => number[];
export type GridMapper = (value: number) => { x: number; y: number };

export type EngineDefinition = {
  id: EngineId;
  name: string;
  description: string;
  premium: boolean;
  generate: SequenceGenerator;
};

export type GridDefinition = {
  id: GridId;
  name: string;
  description: string;
  premium: boolean;
  map: GridMapper;
};

export type PaletteDefinition = {
  id: PaletteId;
  name: string;
  start: string;
  end: string;
  glow: string;
  bg: string;
  accent: string;
};
