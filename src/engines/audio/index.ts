import type { IAudioEngine, ParamDefinition } from '../../core/plugin';
import { registry } from '../../core/registry';

const audioParams: ParamDefinition[] = [
  { id: 'tempo', label: 'Tempo (BPM)', type: 'number', min: 40, max: 200, step: 5, default: 80 },
  { id: 'octave', label: 'Ottava', type: 'number', min: 2, max: 6, step: 1, default: 4 },
  { id: 'density', label: 'Densità', type: 'number', min: 1, max: 8, step: 1, default: 3 },
];

const scales = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const audioEngines: IAudioEngine[] = [
  {
    id: 'generative-melody',
    name: 'Melodia Generativa',
    description: 'Melodia casuale basata sulla sequenza matematica.',
    category: 'audio',
    audioType: 'generative',
    premium: false,
    tags: ['melody', 'generative'],
    params: [...audioParams],
    notes: ['C', 'E', 'G', 'B', 'D', 'F', 'A'],
    scales: scales,
    tempo: 80,
  },
  {
    id: 'ambient-drone',
    name: 'Drone Ambient',
    description: 'Drone continuo con variazioni armoniche.',
    category: 'audio',
    audioType: 'ambient',
    premium: true,
    tags: ['ambient', 'drone'],
    params: [...audioParams],
    notes: ['C', 'E', 'G', 'C2'],
    scales: scales,
    tempo: 40,
  },
  {
    id: 'rhythmic-pulse',
    name: 'Pulse Ritmico',
    description: 'Ritmo pulsato con pattern matematico.',
    category: 'audio',
    audioType: 'rhythmic',
    premium: true,
    tags: ['rhythm', 'pulse'],
    params: [...audioParams],
    notes: ['kick', 'hihat', 'snare'],
    scales: scales,
    tempo: 120,
  },
  {
    id: 'melodic-arpeggio',
    name: 'Arpeggio Melodico',
    description: 'Arpeggi basati sulla sequenza.',
    category: 'audio',
    audioType: 'melodic',
    premium: true,
    tags: ['arpeggio', 'melodic'],
    params: [...audioParams],
    notes: ['C', 'E', 'G', 'B', 'D'],
    scales: scales,
    tempo: 100,
  },
];

for (const engine of audioEngines) {
  registry.register(engine);
}
