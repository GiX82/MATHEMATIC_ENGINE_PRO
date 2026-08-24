export type PluginCategory = 'math' | 'grid' | 'geometry' | 'color' | 'material' | 'light' | 'motion' | 'camera' | 'audio';

export interface ParamDefinition {
  id: string;
  label: string;
  type: 'number' | 'select' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  default: number | string | boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface IPlugin {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  premium: boolean;
  tags?: string[];
}

export interface IMathEngine extends IPlugin {
  category: 'math';
  mathType: 'sequence' | 'dynamics' | 'fractal' | 'geometric';
  params: ParamDefinition[];
  generate(seed: number, params: Record<string, number | string | boolean>): number[];
}

export interface IGridEngine extends IPlugin {
  category: 'grid';
  params: ParamDefinition[];
  map(value: number, params: Record<string, number | string | boolean>): { x: number; y: number; z?: number };
}

export interface IGeometryEngine extends IPlugin {
  category: 'geometry';
  geometryType: 'primitive' | 'three-d' | 'particle' | 'procedural';
  params: ParamDefinition[];
}

export interface IColorEngine extends IPlugin {
  category: 'color';
  colorType: 'palette' | 'gradient' | 'mapping';
  params: ParamDefinition[];
  colors: Record<string, string>;
  map?(value: number, min: number, max: number, params: Record<string, number | string | boolean>): string;
}

export interface IMaterialEngine extends IPlugin {
  category: 'material';
  params: ParamDefinition[];
  threeMaterialProps: Record<string, unknown>;
}

export interface ILightEngine extends IPlugin {
  category: 'light';
  params: ParamDefinition[];
  lights: Array<{
    type: 'ambient' | 'directional' | 'point' | 'spot';
    color: string;
    intensity: number;
    position?: [number, number, number];
  }>;
}

export interface IMotionEngine extends IPlugin {
  category: 'motion';
  motionType: 'easing' | 'interpolation' | 'procedural' | 'physics';
  params: ParamDefinition[];
  evaluate(t: number, params: Record<string, number | string | boolean>): number;
}

export interface ICameraEngine extends IPlugin {
  category: 'camera';
  cameraType: 'orbit' | 'follow' | 'path' | 'cinematic';
  params: ParamDefinition[];
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

export interface IAudioEngine extends IPlugin {
  category: 'audio';
  audioType: 'generative' | 'ambient' | 'rhythmic' | 'melodic';
  params: ParamDefinition[];
  notes: string[];
  scales: string[];
  tempo: number;
}

export type AnyPlugin = IMathEngine | IGridEngine | IGeometryEngine | IColorEngine | IMaterialEngine | ILightEngine | IMotionEngine | ICameraEngine | IAudioEngine;
