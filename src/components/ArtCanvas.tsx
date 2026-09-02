import { Suspense, forwardRef, lazy, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
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
  backgroundMode?: 'none' | 'mosaic' | 'tunnel';
  fogDensity?: number;
  dispersion?: number;
  stardustDensity?: number;
  stardustReactivity?: number;
  shockwaveIntensity?: number;
  dofStrength?: number;
  onWebGLFallback?: () => void;
}

export type ArtCanvasHandle = {
  getCanvas: () => HTMLCanvasElement | null;
  resetCamera: () => void;
  exportHiRes: (scale?: number) => void;
};

const ArtCanvasComponent = forwardRef<ArtCanvasHandle, ArtCanvasProps>(function ArtCanvas({ seed, steps, mode, palette, engine = 'collatz', grid = 'ulam', geometry = 'lines', material = 'basic', effect = 'glow', lightPreset = 'standard', motionPreset = 'ease-in-out', cameraPreset = 'orbit', animationSpeed = 1, isAnimating = false, customColors, lineWidth, pointSize, shadowIntensity = 4, shadowDirection = 135, shadowSoftness = 2, lightAngle = 45, backgroundMode = 'none', fogDensity = 0, dispersion = 0, stardustDensity = 0, stardustReactivity = 0, shockwaveIntensity = 0, dofStrength = 0, onWebGLFallback }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const exportHiResRef = useRef<((scale?: number) => void) | null>(null);
  const webglOk = useMemo(() => isWebGLAvailable(), []);

  const handleResetCameraReady = useCallback((resetFn: () => void) => {
    resetCameraRef.current = resetFn;
  }, []);

  const handleExportHiResReady = useCallback((fn: (scale?: number) => void) => {
    exportHiResRef.current = fn;
  }, []);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    resetCamera: () => resetCameraRef.current?.(),
    exportHiRes: (scale?: number) => exportHiResRef.current?.(scale),
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
        <div role="img" aria-label="Mathematical generative art canvas 3D" className="h-full w-full">
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
          lineWidth={lineWidth}
          pointSize={pointSize}
          shadowIntensity={shadowIntensity}
          shadowDirection={shadowDirection}
          shadowSoftness={shadowSoftness}
          lightAngle={lightAngle}
          backgroundMode={backgroundMode}
          fogDensity={fogDensity}
          dispersion={dispersion}
          stardustDensity={stardustDensity}
          stardustReactivity={stardustReactivity}
          shockwaveIntensity={shockwaveIntensity}
          dofStrength={dofStrength}
          onResetCamera={handleResetCameraReady}
          onExportHiRes={handleExportHiResReady}
          onCanvasReady={handleCanvasReady}
        />
        </div>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">Loading 2D…</div>}>
      <div role="img" aria-label="Mathematical generative art canvas" className="h-full w-full">
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
        backgroundMode={backgroundMode}
        onCanvasReady={handleCanvasReady}
      />
      </div>
    </Suspense>
  );
});

export const ArtCanvas = ArtCanvasComponent;
export default ArtCanvasComponent;
