import type { IColorEngine, ParamDefinition } from '../../core/plugin';
import { registry } from '../../core/registry';
import { paletteDefinitions } from '../../domain/palettes';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
}

function easeIn(t: number): number { return t * t; }
function easeOut(t: number): number { return t * (2 - t); }
function easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function stepped(t: number, steps: number): number { return Math.floor(t * steps) / Math.max(1, steps); }

function applyEasing(t: number, mode: string, steps: number): number {
  switch (mode) {
    case 'ease-in': return easeIn(t);
    case 'ease-out': return easeOut(t);
    case 'ease-in-out': return easeInOut(t);
    case 'stepped': return stepped(t, steps);
    default: return t;
  }
}

function multiStopGradient(colors: string[], t: number): string {
  if (colors.length === 0) return '#000000';
  if (colors.length === 1) return colors[0];
  const segment = t * (colors.length - 1);
  const i = Math.min(Math.floor(segment), colors.length - 2);
  const localT = segment - i;
  return lerpColor(colors[i], colors[i + 1], localT);
}

const colorParams: ParamDefinition[] = [
  { id: 'interpolation', label: 'Interpolazione', type: 'select', default: 'linear',
    options: [
      { value: 'linear', label: 'Lineare' },
      { value: 'ease-in', label: 'Ease In' },
      { value: 'ease-out', label: 'Ease Out' },
      { value: 'ease-in-out', label: 'Ease In-Out' },
      { value: 'stepped', label: 'Stepped' },
    ] },
  { id: 'steps', label: 'Passi', type: 'number', min: 2, max: 20, step: 1, default: 6 },
];

const colorEngines: IColorEngine[] = Object.values(paletteDefinitions).map((palette) => ({
  id: palette.id,
  name: palette.name,
  description: `Palette ${palette.name}`,
  category: 'color' as const,
  colorType: 'palette' as const,
  premium: palette.id === 'void' || palette.id === 'aurora' || palette.id === 'nebula' ? false : true,
  tags: [palette.id],
  params: colorParams,
  colors: { start: palette.start, end: palette.end, glow: palette.glow, bg: palette.bg, accent: palette.accent },
  map: (value, min, max, params = {}) => {
    const t = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
    const mode = (params.interpolation as string) ?? 'linear';
    const steps = (params.steps as number) ?? 6;
    const eased = applyEasing(t, mode, steps);
    return lerpColor(palette.start, palette.end, eased);
  },
}));

const gradientStops = {
  aurora: ['#79f2d0', '#7c7cff', '#ff7bd5'],
  nebula: ['#ff8ae2', '#7d6bff', '#ffd700'],
  solar: ['#ffd166', '#ff6b6b', '#ff3366'],
  ice: ['#bae6fd', '#38bdf8', '#0284c7'],
  void: ['#edf6ff', '#7dd3fc', '#8b5cf6'],
  inferno: ['#f97316', '#ef4444', '#dc2626'],
};

for (const engine of colorEngines) {
  registry.register(engine);
}

const gradientParams: ParamDefinition[] = [
  { id: 'interpolation', label: 'Interpolazione', type: 'select', default: 'linear',
    options: [
      { value: 'linear', label: 'Lineare' },
      { value: 'ease-in', label: 'Ease In' },
      { value: 'ease-out', label: 'Ease Out' },
      { value: 'stepped', label: 'Stepped' },
    ] },
  { id: 'steps', label: 'Passi', type: 'number', min: 2, max: 20, step: 1, default: 8 },
];

const gradientEngines: IColorEngine[] = (Object.keys(gradientStops) as Array<keyof typeof gradientStops>).map((id) => ({
  id: `gradient-${id}`,
  name: `Gradiente ${paletteDefinitions[id].name}`,
  description: `Gradiente multi-stop ${paletteDefinitions[id].name}`,
  category: 'color' as const,
  colorType: 'gradient' as const,
  premium: true,
  tags: [id, 'gradient'],
  params: gradientParams,
  colors: { start: gradientStops[id][0], end: gradientStops[id][2], glow: gradientStops[id][1], bg: paletteDefinitions[id].bg, accent: paletteDefinitions[id].accent },
  map: (value, min, max, params = {}) => {
    const t = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
    const mode = (params.interpolation as string) ?? 'linear';
    const steps = (params.steps as number) ?? 8;
    const eased = applyEasing(t, mode, steps);
    return multiStopGradient(gradientStops[id], eased);
  },
}));

for (const engine of gradientEngines) {
  registry.register(engine);
}
