import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from '../domain/types';
import { isWebGLAvailable } from '../lib/webgl-check';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';
import { Renderer2D } from './Renderer2D';
import { Renderer3D } from './Renderer3D';

interface ArtCanvasProps {
  seed: number;
  steps: number;
  mode: '2d' | '3d';
  palette: PaletteKey;
  engine?: GeneratorEngine;
  grid?: SpatialGrid;
  geometry?: GeometryMode;
  material?: MaterialMode;
  effect?: EffectMode;
  lightPreset?: LightPresetId;
  motionPreset?: MotionPresetId;
  cameraPreset?: CameraPresetId;
  animationSpeed?: number;
  isAnimating?: boolean;
  customColors?: [string, string, string];
  lineWidth?: number;
  pointSize?: number;
  onWebGLFallback?: () => void;
}

export type ArtCanvasHandle = {
  getCanvas: () => HTMLCanvasElement | null;
};

const ArtCanvasComponent = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas({ seed, steps, mode, palette, engine = 'collatz', grid = 'ulam', geometry = 'lines', material = 'basic', effect = 'glow', lightPreset = 'standard', motionPreset = 'ease-in-out', cameraPreset = 'orbit', animationSpeed = 1, isAnimating = false, customColors, lineWidth, pointSize, onWebGLFallback }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webglOk = useMemo(() => isWebGLAvailable(), []);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  };

  const use3D = mode === '3d' && webglOk;

  useEffect(() => {
    if (mode === '3d' && !webglOk && onWebGLFallback) {
      onWebGLFallback();
    }
  }, [mode, webglOk, onWebGLFallback]);

  if (use3D) {
    return (
      <Renderer3D
        seed={seed}
        steps={steps}
        palette={palette}
        engine={engine}
        grid={grid}
        geometry={geometry}
        material={material}
        effect={effect}
        lightPreset={lightPreset}
        motionPreset={motionPreset}
        cameraPreset={cameraPreset}
        animationSpeed={animationSpeed}
        isAnimating={isAnimating}
        customColors={customColors}
        onCanvasReady={handleCanvasReady}
      />
    );
  }

  return (
    <Renderer2D
      seed={seed}
      steps={steps}
      palette={palette}
      engine={engine}
      grid={grid}
      geometry={geometry}
      effect={effect}
      animationSpeed={animationSpeed}
      isAnimating={isAnimating}
      customColors={customColors}
      lineWidth={lineWidth}
      pointSize={pointSize}
      onCanvasReady={handleCanvasReady}
    />
  );
});

export const ArtCanvas = ArtCanvasComponent;
export default ArtCanvasComponent;
