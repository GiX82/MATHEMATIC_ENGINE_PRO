import { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId } from '../domain/types';
import { isWebGLAvailable } from '../lib/webgl-check';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';

const Renderer2D = lazy(() => import('./Renderer2D').then(m => ({ default: m.Renderer2D })));
const Renderer3D = lazy(() => import('./Renderer3D').then(m => ({ default: m.Renderer3D })));

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
  shadowIntensity?: number;
  shadowDirection?: number;
  shadowSoftness?: number;
  lightAngle?: number;
  onWebGLFallback?: () => void;
}

export type ArtCanvasHandle = {
  getCanvas: () => HTMLCanvasElement | null;
};

const ArtCanvasComponent = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas({ seed, steps, mode, palette, engine = 'collatz', grid = 'ulam', geometry = 'lines', material = 'basic', effect = 'glow', lightPreset = 'standard', motionPreset = 'ease-in-out', cameraPreset = 'orbit', animationSpeed = 1, isAnimating = false, customColors, lineWidth, pointSize, shadowIntensity = 4, shadowDirection = 135, shadowSoftness = 2, lightAngle = 45, onWebGLFallback }, ref) {
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
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">Loading 3D…</div>}>
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
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">Loading 2D…</div>}>
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
        shadowIntensity={shadowIntensity}
        shadowDirection={shadowDirection}
        shadowSoftness={shadowSoftness}
        lightAngle={lightAngle}
        onCanvasReady={handleCanvasReady}
      />
    </Suspense>
  );
});

export const ArtCanvas = ArtCanvasComponent;
export default ArtCanvasComponent;
