import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import ArtCanvas, { type ArtCanvasHandle } from '../components/ArtCanvas';
import { SlidePanel } from '../components/SlidePanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FpsCounter } from '../components/FpsCounter';
import { useArtworkStore } from '../store/useArtworkStore';

function GeneratorPage() {
  const { t } = useTranslation();
  const {
    seed, steps, mode, engine, grid, palette, geometry, material, effect,
    lightPreset, motionPreset, cameraPreset, isAnimating,
    customColors, lineWidth, pointSize, shadowIntensity, shadowDirection, shadowSoftness, lightAngle, animationDuration, backgroundMode,
    fogDensity, dispersion, stardustDensity, stardustReactivity, shockwaveIntensity, dofStrength,
    setSeed, setMode, setIsAnimating, randomize,
  } = useArtworkStore(useShallow((s) => ({
    seed: s.seed, steps: s.steps, mode: s.mode, engine: s.engine, grid: s.grid,
    palette: s.palette, geometry: s.geometry, material: s.material, effect: s.effect,
    lightPreset: s.lightPreset, motionPreset: s.motionPreset, cameraPreset: s.cameraPreset,
    customColors: s.customColors, lineWidth: s.lineWidth, pointSize: s.pointSize,
    shadowIntensity: s.shadowIntensity, shadowDirection: s.shadowDirection, shadowSoftness: s.shadowSoftness,
    lightAngle: s.lightAngle, animationDuration: s.animationDuration, isAnimating: s.isAnimating,
    backgroundMode: s.backgroundMode,
    fogDensity: s.fogDensity, dispersion: s.dispersion,
    stardustDensity: s.stardustDensity, stardustReactivity: s.stardustReactivity,
    shockwaveIntensity: s.shockwaveIntensity, dofStrength: s.dofStrength,
    setSeed: s.setSeed, setMode: s.setMode, setIsAnimating: s.setIsAnimating, randomize: s.randomize,
  })));

  const artCanvasRef = useRef<ArtCanvasHandle | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const webglFallbackHandled = useRef(false);
  const [webglToast, setWebglToast] = useState(false);

  const handleWebGLFallback = useCallback(() => {
    if (webglFallbackHandled.current) return;
    webglFallbackHandled.current = true;
    setMode('2d');
    setWebglToast(true);
    setTimeout(() => setWebglToast(false), 4000);
  }, [setMode]);

  const handleToggleMode = useCallback(() => {
    webglFallbackHandled.current = false;
    setMode(mode === '2d' ? '3d' : '2d');
  }, [mode, setMode]);

  const handleSeedChange = useCallback((delta: number) => {
    setSeed(seed + delta);
  }, [seed, setSeed]);

  return (
    <div className="fixed inset-0 z-0 flex flex-col bg-[#02060e]">
      {/* Full-screen canvas */}
      <div className="relative flex-1">
        <ErrorBoundary>
          <ArtCanvas
            ref={artCanvasRef}
            seed={seed}
            steps={steps}
            mode={mode}
            palette={palette}
            engine={engine}
            grid={grid}
            geometry={geometry}
            material={material}
            effect={effect}
            lightPreset={lightPreset}
            motionPreset={motionPreset}
            cameraPreset={cameraPreset}
            animationSpeed={animationDuration}
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
            onWebGLFallback={handleWebGLFallback}
          />
        </ErrorBoundary>

        {/* Top-left: Mode toggle + back */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <Link
            to="/"
            aria-label={t('back_home')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            ←
          </Link>
          <button
            type="button"
            onClick={handleToggleMode}
            aria-label={t('mode')}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-medium text-zinc-300 backdrop-blur-md transition hover:border-cyan-400/30 hover:text-cyan-200"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/20 text-[10px] font-bold text-cyan-300">
              {mode === '2d' ? '2D' : '3D'}
            </span>
            {t('mode')}
          </button>
          <button
            type="button"
            onClick={() => setIsAnimating(!isAnimating)}
            aria-label={isAnimating ? t('pause') : t('play')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            {isAnimating ? '⏸' : '▶'}
          </button>
          {mode === '3d' && !isAnimating && (
          <button
            type="button"
            onClick={() => artCanvasRef.current?.resetCamera()}
            aria-label={t('reset_camera')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            🎯
          </button>
          )}
        </div>

        {/* Top-right: Hamburger */}
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label={t('settings')}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H17M1 7H17M1 13H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Bottom-center: Seed input */}
        <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 md:bottom-6">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => handleSeedChange(-1)}
              aria-label="Decrease seed"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
            >
              −
            </button>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              aria-label={t('seed')}
              className="h-10 w-28 rounded-xl border border-cyan-400/20 bg-[#07131f] text-center text-2xl font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.08)] outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => handleSeedChange(1)}
              aria-label="Increase seed"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
            >
              +
            </button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              type="button"
              onClick={randomize}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-400 transition hover:border-amber-300/30 hover:text-amber-200"
              title={t('randomize')}
            >
              🎲
            </button>
          </div>
        </div>

        {/* Bottom-left: subtle info */}
        <div className="absolute bottom-20 left-4 z-10 text-[10px] text-zinc-600 md:bottom-6">
          {engine} · {grid} · {geometry}
        </div>
      </div>

      {/* Slide-out panel */}
      <ErrorBoundary>
        <SlidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} artCanvasRef={artCanvasRef} />
      </ErrorBoundary>

      {/* WebGL fallback toast */}
      {webglToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-amber-400/30 bg-amber-500/15 px-4 py-2.5 text-xs font-medium text-amber-200 backdrop-blur-md">
          {t('webgl_fallback')}
        </div>
      )}

      {/* FPS Counter */}
      <FpsCounter />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/8 bg-[#050a12]/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Link to="/" className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-zinc-400 transition hover:text-cyan-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          {t('home')}
        </Link>
        <Link to="/gallery" className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-zinc-400 transition hover:text-cyan-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
          {t('gallery')}
        </Link>
        <div className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-cyan-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
          {t('studio')}
        </div>
        <Link to="/settings" className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-zinc-400 transition hover:text-cyan-200">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {t('settings')}
        </Link>
      </nav>
    </div>
  );
}

export default GeneratorPage;
