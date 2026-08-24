import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ArtCanvas, { type ArtCanvasHandle } from '../components/ArtCanvas';
import { SlidePanel } from '../components/SlidePanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useStore } from '../store/useStore';

function GeneratorPage() {
  const { t } = useTranslation();
  const {
    seed, steps, mode, engine, grid, palette, geometry, material, effect,
    lightPreset, motionPreset, cameraPreset,
    setSeed, setMode, randomize,
  } = useStore();

  const artCanvasRef = useRef<ArtCanvasHandle | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isAnimating] = useState(true);

  const handleToggleMode = useCallback(() => {
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
            animationSpeed={1.2}
            isAnimating={isAnimating}
          />
        </ErrorBoundary>

        {/* Top-left: Mode toggle + back */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <a
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
          >
            ←
          </a>
          <button
            type="button"
            onClick={handleToggleMode}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-medium text-zinc-300 backdrop-blur-md transition hover:border-cyan-400/30 hover:text-cyan-200"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/20 text-[10px] font-bold text-cyan-300">
              {mode === '2d' ? '2D' : '3D'}
            </span>
            {t('mode')}
          </button>
        </div>

        {/* Top-right: Hamburger */}
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-400 backdrop-blur-md transition hover:border-white/20 hover:text-white"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H17M1 7H17M1 13H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Bottom-center: Seed input */}
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => handleSeedChange(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-zinc-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
            >
              −
            </button>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="h-10 w-28 rounded-xl border border-cyan-400/20 bg-[#07131f] text-center text-2xl font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.08)] outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => handleSeedChange(1)}
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
        <div className="absolute bottom-6 left-4 z-10 text-[10px] text-zinc-600">
          {engine} · {grid} · {geometry}
        </div>
      </div>

      {/* Slide-out panel */}
      <SlidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} artCanvasRef={artCanvasRef} />
    </div>
  );
}

export default GeneratorPage;
