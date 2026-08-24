import type { IMotionEngine, ParamDefinition } from '../../core/plugin';
import { registry } from '../../core/registry';

const motionParams: ParamDefinition[] = [
  { id: 'intensity', label: 'Intensità', type: 'number', min: 0, max: 2, step: 0.1, default: 1.0 },
];

const motionEngines: IMotionEngine[] = [
  {
    id: 'ease-in-out',
    name: 'Ease In-Out',
    description: 'Curva smooth da fermo a veloce a fermo.',
    category: 'motion',
    motionType: 'easing',
    premium: false,
    tags: ['smooth', 'default'],
    params: [...motionParams],
    evaluate: (t, params) => {
      const intensity = (params.intensity as number) ?? 1.0;
      const x = Math.max(0, Math.min(1, t));
      return (x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x) * intensity;
    },
  },
  {
    id: 'ease-in',
    name: 'Ease In',
    description: ' accelerazione graduale.',
    category: 'motion',
    motionType: 'easing',
    premium: false,
    tags: ['accelerate'],
    params: [...motionParams],
    evaluate: (t, params) => {
      const intensity = (params.intensity as number) ?? 1.0;
      return Math.pow(Math.max(0, Math.min(1, t)), 2) * intensity;
    },
  },
  {
    id: 'ease-out',
    name: 'Ease Out',
    description: 'Decelerazione graduale.',
    category: 'motion',
    motionType: 'easing',
    premium: false,
    tags: ['decelerate'],
    params: [...motionParams],
    evaluate: (t, params) => {
      const intensity = (params.intensity as number) ?? 1.0;
      const x = Math.max(0, Math.min(1, t));
      return x * (2 - x) * intensity;
    },
  },
  {
    id: 'spring',
    name: 'Spring',
    description: 'Oscillazione con spring dynamics.',
    category: 'motion',
    motionType: 'physics',
    premium: true,
    tags: ['spring', 'oscillate'],
    params: [
      ...motionParams,
      { id: 'frequency', label: 'Frequenza', type: 'number', min: 0.5, max: 10, step: 0.5, default: 3 },
      { id: 'damping', label: 'Smorzamento', type: 'number', min: 0, max: 1, step: 0.05, default: 0.3 },
    ],
    evaluate: (t, params) => {
      const intensity = (params.intensity as number) ?? 1.0;
      const freq = (params.frequency as number) ?? 3;
      const damping = (params.damping as number) ?? 0.3;
      return Math.exp(-damping * t * 10) * Math.sin(freq * t * Math.PI * 2) * intensity;
    },
  },
  {
    id: 'bounce',
    name: 'Bounce',
    description: 'Effetto rimbalzo.',
    category: 'motion',
    motionType: 'physics',
    premium: true,
    tags: ['bounce', 'impact'],
    params: [...motionParams],
    evaluate: (t, params) => {
      const intensity = (params.intensity as number) ?? 1.0;
      const x = Math.max(0, Math.min(1, t));
      if (x < 1 / 2.75) return (7.5625 * x * x) * intensity;
      if (x < 2 / 2.75) { const nx = x - 1.5 / 2.75; return (7.5625 * nx * nx + 0.75) * intensity; }
      if (x < 2.5 / 2.75) { const nx = x - 2.25 / 2.75; return (7.5625 * nx * nx + 0.9375) * intensity; }
      const nx = x - 2.625 / 2.75;
      return (7.5625 * nx * nx + 0.984375) * intensity;
    },
  },
  {
    id: 'procedural-wave',
    name: 'Onda Procedurale',
    description: 'Combinazione di onde sinusoidali.',
    category: 'motion',
    motionType: 'procedural',
    premium: true,
    tags: ['wave', 'procedural'],
    params: [
      ...motionParams,
      { id: 'frequency', label: 'Frequenza', type: 'number', min: 1, max: 10, step: 1, default: 3 },
    ],
    evaluate: (t, params) => {
      const intensity = (params.intensity as number) ?? 1.0;
      const freq = (params.frequency as number) ?? 3;
      return (Math.sin(t * freq) * 0.5 + Math.sin(t * freq * 2.3) * 0.3 + Math.sin(t * freq * 0.7) * 0.2) * intensity;
    },
  },
];

for (const engine of motionEngines) {
  registry.register(engine);
}
