import { useEffect, useMemo, useRef, useState } from 'react';
import ArtCanvas, { type ArtCanvasHandle } from '../components/ArtCanvas';
import { canAccessFeature } from '../domain/access';
import { cinematicPresets, effectCatalog, geometryCatalog, materialCatalog } from '../domain/geometry';
import {
  effectNames,
  engineNames,
  geometryNames,
  gridNames,
  materialNames,
  paletteNames,
} from '../domain/labels';
import type { EffectMode, GeometryMode, MaterialMode } from '../domain/types';
import {
  buildArtwork,
  getPaletteDefinition,
  type GeneratorEngine,
  type PaletteKey,
  type SpatialGrid,
} from '../lib/math';
import { useStore } from '../store/useStore';

type PremiumFeature = 'engine' | 'grid' | 'mode' | 'palette' | 'geometry' | 'material' | 'effect';

const freePaletteKeys: PaletteKey[] = ['void', 'aurora', 'nebula'];

const paletteGlow: Record<PaletteKey, string> = {
  void: 'from-cyan-400/25 via-sky-500/10 to-violet-500/10',
  aurora: 'from-emerald-400/25 via-cyan-500/10 to-violet-500/10',
  nebula: 'from-fuchsia-400/25 via-violet-500/10 to-pink-500/10',
  solar: 'from-amber-400/25 via-orange-500/10 to-rose-500/10',
  ice: 'from-sky-300/25 via-cyan-500/10 to-indigo-500/10',
  inferno: 'from-orange-500/25 via-red-500/10 to-amber-500/10',
};

const paywallLabels: Record<PremiumFeature, string> = {
  engine: 'motore',
  grid: 'griglia',
  mode: 'modalità 3D',
  palette: 'palette premium',
  geometry: 'geometria avanzata',
  material: 'materiale premium',
  effect: 'effetto cinematografico',
};

function GeneratorPage() {
  const {
    seed,
    steps,
    mode,
    engine,
    grid,
    palette,
    geometry,
    material,
    effect,
    premium,
    creatorName,
    setSeed,
    setSteps,
    setMode,
    setEngine,
    setGrid,
    setPalette,
    setGeometry,
    setMaterial,
    setEffect,
    randomize,
    togglePremium,
    saveArtwork,
  } = useStore();

  const artCanvasRef = useRef<ArtCanvasHandle | null>(null);
  const activeRecordingRef = useRef<{ recorder: MediaRecorder; timeoutId: number } | null>(null);

  const [paywallTarget, setPaywallTarget] = useState<string | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState(1.2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    geometry: true,
    preset: true,
    engine: false,
    grid: false,
    palette: false,
    material: false,
    effect: false,
  });

  // Interrompe la registrazione video pendente se la pagina viene smontata.
  useEffect(
    () => () => {
      const active = activeRecordingRef.current;
      if (!active) return;
      window.clearTimeout(active.timeoutId);
      if (active.recorder.state !== 'inactive') active.recorder.stop();
      activeRecordingRef.current = null;
    },
    [],
  );

  const canAccess = (feature: PremiumFeature, value?: string) =>
    canAccessFeature(feature, value, premium);

  const handlePremiumGate = (feature: PremiumFeature, action: () => void) => {
    const targetValue =
      feature === 'engine' ? engine :
      feature === 'grid' ? grid :
      feature === 'mode' ? mode :
      feature === 'palette' ? palette :
      feature === 'geometry' ? geometry :
      feature === 'material' ? material :
      effect;

    if (!canAccess(feature, targetValue)) {
      setPaywallTarget(paywallLabels[feature]);
      return;
    }

    action();
  };

  const { stats } = useMemo(() => buildArtwork(seed, steps, engine, grid), [seed, steps, engine, grid]);

  const certificate = useMemo(
    () => ({
      title: 'MATHEMATIC_ENGINE — Certificato di autenticità',
      creator: creatorName,
      seed,
      steps,
      mode,
      engine: engineNames[engine],
      grid: gridNames[grid],
      palette: paletteNames[palette],
      geometry: geometryNames[geometry],
      material: materialNames[material],
      effect: effectNames[effect],
      generatedAt: new Date().toISOString(),
      hash: stats.hash,
      version: '1.0.0',
      signature: 'GiX Engineering / generative-authenticity',
    }),
    [creatorName, seed, steps, mode, engine, grid, palette, geometry, material, effect, stats.hash],
  );

  const exportArtwork = () => {
    const canvas = artCanvasRef.current?.getCanvas();
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    const scale = 3;
    exportCanvas.width = Math.max(1800, Math.floor(canvas.width * scale));
    exportCanvas.height = Math.max(1200, Math.floor(canvas.height * scale));

    const context = exportCanvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#02060e';
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    context.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `mathematic-engine-${seed}-4k.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const exportCertificate = () => {
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mathematic-engine-cert-${seed}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const create10SecondVideo = async () => {
    const canvas = artCanvasRef.current?.getCanvas();
    if (!canvas) return;

    if (!('MediaRecorder' in window)) {
      alert('Il browser non supporta la registrazione video in tempo reale.');
      return;
    }

    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) ?? 'video/webm';
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      activeRecordingRef.current = null;
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mathematic-engine-clip-${seed}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      setIsRenderingVideo(false);
    };

    setIsRenderingVideo(true);
    setIsAnimating(true);
    recorder.start(250);

    const timeoutId = window.setTimeout(() => {
      recorder.stop();
      setIsAnimating(false);
    }, 10000);

    activeRecordingRef.current = { recorder, timeoutId };
  };

  const saveCurrentArtwork = () => {
    const canvas = artCanvasRef.current?.getCanvas();
    if (!canvas) return;

    saveArtwork({
      seed,
      steps,
      mode,
      engine,
      grid,
      palette,
      geometry,
      material,
      effect,
      preview: canvas.toDataURL('image/png'),
    });
  };

  const handleNextMode = () => {
    if (mode === '2d' && !premium) {
      setPaywallTarget('modalità 3D');
      return;
    }

    setMode(mode === '2d' ? '3d' : '2d');
  };

  const applyPreset = (config: Record<string, string>) => {
    const checks: Array<[PremiumFeature, string]> = [
      ['engine', config.engine],
      ['grid', config.grid],
      ['palette', config.palette],
      ['geometry', config.geometry],
      ['material', config.material],
      ['effect', config.effect],
    ];

    const lockedFeature = checks.find(([feature, value]) => !canAccess(feature, value));
    if (lockedFeature) {
      setPaywallTarget(paywallLabels[lockedFeature[0]]);
      return;
    }

    setEngine(config.engine as GeneratorEngine);
    setGrid(config.grid as SpatialGrid);
    setPalette(config.palette as PaletteKey);
    setGeometry(config.geometry as GeometryMode);
    setMaterial(config.material as MaterialMode);
    setEffect(config.effect as EffectMode);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      {paywallTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-fuchsia-500/30 bg-[#0b1220] p-6 shadow-2xl shadow-fuchsia-950/30">
            <div className="mb-3 text-xs uppercase tracking-[0.3em] text-fuchsia-300">Premium</div>
            <h3 className="text-2xl font-bold text-white">Sblocca {paywallTarget}</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Questa funzione è riservata alla versione premium. Attiva il piano per accedere ai motori avanzati, alle griglie complete, ai colori premium e alla modalità 3D cinematica.
            </p>
            <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              <div className="flex justify-between"><span>Motori</span><span className="text-cyan-300">Collatz + avanzati</span></div>
              <div className="flex justify-between"><span>Griglie</span><span className="text-cyan-300">Tutte</span></div>
              <div className="flex justify-between"><span>Rendering</span><span className="text-cyan-300">2D + 3D</span></div>
              <div className="flex justify-between"><span>Esportazione</span><span className="text-cyan-300">Completa</span></div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => { togglePremium(); setPaywallTarget(null); }} className="flex-1 rounded-xl bg-fuchsia-500 px-4 py-3 font-medium text-white transition hover:bg-fuchsia-400">
                Abilita Premium
              </button>
              <button type="button" onClick={() => setPaywallTarget(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-zinc-200 transition hover:bg-white/10">
                Chiudi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_310px]">
        <aside className="ui-panel rounded-[28px] p-4">
          <div className={`sticky top-4 z-10 mb-4 rounded-[24px] border border-cyan-400/20 bg-gradient-to-br p-3 shadow-[0_0_35px_rgba(34,211,238,0.10)] ${paletteGlow[palette]}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/90">Creazione geometrica</p>
              <span className="rounded-full border border-cyan-300/30 bg-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-cyan-100">
                {mode === '2d' ? '2D' : '3D'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/90">
              <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1">{engineNames[engine]}</span>
              <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1">{gridNames[grid]}</span>
              <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1">{geometryNames[geometry]}</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full border border-white/30" style={{ background: getPaletteDefinition(palette).accent }} />
              <div className="text-xs font-medium text-white">Live render</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="mb-5 rounded-[22px] border border-cyan-400/20 bg-cyan-500/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200">Numero iniziale</p>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" aria-label="Riduci seed" onClick={() => setSeed(seed - 1)} className="h-12 w-12 rounded-xl border border-white/10 bg-black/20 text-xl text-zinc-200 transition hover:border-cyan-300/40 hover:text-cyan-100">−</button>
                <input
                  type="number"
                  aria-label="Seed"
                  min={1}
                  max={1000000}
                  value={seed}
                  onChange={(event) => setSeed(Number(event.target.value))}
                  className="h-14 flex-1 rounded-xl border border-cyan-400/25 bg-[#07131f] px-3 text-center text-3xl font-bold text-white shadow-[0_0_25px_rgba(34,211,238,0.10)] outline-none ring-0"
                />
                <button type="button" aria-label="Aumenta seed" onClick={() => setSeed(seed + 1)} className="h-12 w-12 rounded-xl border border-white/10 bg-black/20 text-xl text-zinc-200 transition hover:border-cyan-300/40 hover:text-cyan-100">+</button>
              </div>
            </div>

            <div className="mb-5 rounded-[18px] border border-white/10 bg-black/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="animation-speed" className="block text-[10px] uppercase tracking-[0.35em] text-zinc-500">Animazione</label>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] uppercase tracking-[0.25em] text-cyan-100">
                  {animationSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                id="animation-speed"
                type="range"
                min={0.2}
                max={3}
                step={0.1}
                value={animationSpeed}
                onChange={(event) => setAnimationSpeed(Number(event.target.value))}
                className="mt-3 w-full accent-cyan-400"
              />
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span>Lento</span>
                <button type="button" onClick={() => setIsAnimating((current) => !current)} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-cyan-100">
                  {isAnimating ? 'Pausa' : 'Avvia'}
                </button>
                <span>Veloce</span>
              </div>
            </div>

            <div className="mb-5">
              <label htmlFor="steps-range" className="mb-2 block text-xs uppercase tracking-[0.35em] text-zinc-500">Passi</label>
              <input
                id="steps-range"
                type="range"
                min={25}
                max={1200}
                step={25}
                value={steps}
                onChange={(event) => setSteps(Number(event.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="mt-2 text-sm text-zinc-400">{steps} iterazioni</div>
            </div>

            <div className="space-y-2">
              {[
                { key: 'geometry', title: 'Geometria', content: (
                  <div className="space-y-2 pt-2">
                    {Object.entries(geometryCatalog).map(([key, value]) => {
                      const isLocked = !premium && value.premium;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePremiumGate('geometry', () => setGeometry(key as GeometryMode))}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                            geometry === key ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-black/10 text-zinc-300'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          <span>{value.label}</span>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{isLocked ? 'pro' : 'base'}</span>
                        </button>
                      );
                    })}
                  </div>
                )},
                { key: 'preset', title: 'Preset', content: (
                  <div className="grid gap-2 pt-2 sm:grid-cols-2">
                    {Object.entries(cinematicPresets).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(preset.config)}
                        className="rounded-xl border border-white/10 bg-black/10 p-3 text-left text-sm transition hover:border-cyan-400/30 hover:bg-cyan-500/5"
                      >
                        <div className="font-medium text-white">{preset.label}</div>
                        <div className="mt-1 text-[11px] leading-5 text-zinc-400">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                )},
                { key: 'engine', title: 'Motore', content: (
                  <div className="space-y-2 pt-2">
                    {Object.entries(engineNames).map(([key, label]) => {
                      const isLocked = !premium && key !== 'collatz';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePremiumGate('engine', () => setEngine(key as GeneratorEngine))}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                            engine === key ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-black/10 text-zinc-300'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          <span>{label}</span>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{key === 'collatz' ? 'base' : isLocked ? 'pro' : 'alt'}</span>
                        </button>
                      );
                    })}
                  </div>
                )},
                { key: 'grid', title: 'Griglia', content: (
                  <div className="space-y-2 pt-2">
                    {Object.entries(gridNames).map(([key, label]) => {
                      const isLocked = !premium && key !== 'ulam';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePremiumGate('grid', () => setGrid(key as SpatialGrid))}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                            grid === key ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-black/10 text-zinc-300'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          <span>{label}</span>
                          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{isLocked ? 'pro' : 'map'}</span>
                        </button>
                      );
                    })}
                  </div>
                )},
                { key: 'palette', title: 'Palette', content: (
                  <div className="space-y-2 pt-2">
                    {Object.entries(paletteNames).map(([key, label]) => {
                      const isLocked = !premium && !freePaletteKeys.includes(key as PaletteKey);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePremiumGate('palette', () => setPalette(key as PaletteKey))}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left capitalize transition ${
                            palette === key ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-black/10 text-zinc-300'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          <span>{label}</span>
                          <span className="h-3 w-3 rounded-full border border-white/30" style={{ background: key === 'aurora' ? '#7c7cff' : key === 'nebula' ? '#ff8ae2' : key === 'solar' ? '#ffd166' : key === 'ice' ? '#7dd3fc' : '#f97316' }} />
                        </button>
                      );
                    })}
                  </div>
                )},
              ].map((section) => {
                const isOpen = Boolean(openSections[section.key]);
                return (
                  <div key={section.key} className="rounded-2xl border border-white/10 bg-black/10 p-2">
                    <button
                      type="button"
                      onClick={() => setOpenSections((current) => ({ ...current, [section.key]: !current[section.key] }))}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs uppercase tracking-[0.35em] text-zinc-400 transition hover:text-cyan-200"
                    >
                      <span>{section.title}</span>
                      <span>{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen ? section.content : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-2">
                <button
                  type="button"
                  onClick={() => setOpenSections((current) => ({ ...current, material: !current.material }))}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs uppercase tracking-[0.35em] text-zinc-400 transition hover:text-cyan-200"
                >
                  <span>Materiale</span>
                  <span>{openSections.material ? '−' : '+'}</span>
                </button>
                {openSections.material ? (
                  <div className="space-y-2 pt-2">
                    {Object.entries(materialCatalog).map(([key, value]) => {
                      const isLocked = !premium && value.premium;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePremiumGate('material', () => setMaterial(key as MaterialMode))}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                            material === key ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-black/10 text-zinc-300'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-2">
                <button
                  type="button"
                  onClick={() => setOpenSections((current) => ({ ...current, effect: !current.effect }))}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs uppercase tracking-[0.35em] text-zinc-400 transition hover:text-cyan-200"
                >
                  <span>Effetto</span>
                  <span>{openSections.effect ? '−' : '+'}</span>
                </button>
                {openSections.effect ? (
                  <div className="space-y-2 pt-2">
                    {Object.entries(effectCatalog).map(([key, value]) => {
                      const isLocked = !premium && value.premium;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePremiumGate('effect', () => setEffect(key as EffectMode))}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                            effect === key ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-black/10 text-zinc-300'
                          } ${isLocked ? 'opacity-70' : ''}`}
                        >
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={randomize} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10">
                Casuale
              </button>
              <button type="button" onClick={handleNextMode} className="flex-1 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/15">
                {mode === '2d' ? '3D' : '2D'}
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <button type="button" onClick={exportArtwork} className="w-full rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15">
                Esporta PNG 4K
              </button>
              <button type="button" onClick={create10SecondVideo} disabled={isRenderingVideo} className="w-full rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-60">
                {isRenderingVideo ? 'Registrazione 10s…' : 'Crea video 10s'}
              </button>
              <button type="button" onClick={exportCertificate} className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/15">
                Certificato di autenticità
              </button>
              <button type="button" onClick={saveCurrentArtwork} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/5">
                Salva in galleria
              </button>
              <button type="button" onClick={togglePremium} className="w-full rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-200 transition hover:bg-fuchsia-500/15">
                {premium ? 'Premium attivo' : 'Abilita Premium'}
              </button>
            </div>
          </div>
        </aside>

        <section className="ui-panel relative min-h-[620px] overflow-hidden rounded-[30px] p-2">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(34,211,238,0.10),_transparent_24%),_radial-gradient(circle_at_80%_0%,_rgba(168,85,247,0.12),_transparent_22%)]" />
          <div className="relative mb-3 flex items-center justify-between rounded-[22px] border border-white/10 bg-[#06111d]/80 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-zinc-300 shadow-[0_10px_35px_rgba(8,15,28,0.4)] backdrop-blur-sm">
            <span className="truncate pr-3 text-cyan-200">{engineNames[engine]} • {gridNames[grid]} • {geometryNames[geometry]} • {materialNames[material]} • {effectNames[effect]}</span>
            <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[9px] text-cyan-100">{creatorName}</span>
          </div>
          <div className="relative h-[560px] overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),_radial-gradient(circle_at_80%_10%,_rgba(168,85,247,0.18),_transparent_24%),_#02060e] p-2 shadow-[inset_0_30px_60px_rgba(34,211,238,0.04)]">
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
              animationSpeed={animationSpeed}
              isAnimating={isAnimating}
            />
          </div>
        </section>

        <aside className="ui-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Inspector</p>
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-cyan-100">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
              live
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/15 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">Object</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Engine</div>
                <div className="mt-1 font-medium text-white">{engineNames[engine]}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Value</div>
                <div className="mt-1 font-medium text-cyan-200">{seed}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Step</div>
                <div className="mt-1 font-medium text-white">{steps}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Mode</div>
                <div className="mt-1 font-medium text-white">{mode === '2d' ? '2D' : '3D'}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-[9px] uppercase tracking-[0.2em] text-zinc-500">Lunghezza</span><span className="mt-1 block font-mono text-cyan-200">{stats.length}</span></div>
              <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-[9px] uppercase tracking-[0.2em] text-zinc-500">Massimo</span><span className="mt-1 block font-mono text-cyan-200">{stats.peak}</span></div>
              <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-[9px] uppercase tracking-[0.2em] text-zinc-500">Pari</span><span className="mt-1 block font-mono text-cyan-200">{stats.even}</span></div>
              <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-[9px] uppercase tracking-[0.2em] text-zinc-500">Dispari</span><span className="mt-1 block font-mono text-cyan-200">{stats.odd}</span></div>
            </div>

            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs text-cyan-100">
              <div className="mb-2 uppercase tracking-[0.2em] text-cyan-300">Hash</div>
              <div className="font-mono break-all">{stats.hash}</div>
            </div>
          </div>

          <div className="mt-6 rounded-[20px] border border-amber-400/20 bg-amber-500/5 p-4 text-xs text-amber-100">
            <div className="mb-2 uppercase tracking-[0.2em] text-amber-300">Certificato</div>
            <div className="space-y-2 font-mono text-[11px]">
              <div>Autore: {certificate.creator}</div>
              <div>Seed: {certificate.seed}</div>
              <div>Motore: {certificate.engine}</div>
              <div>Timestamp: {certificate.generatedAt.slice(0, 19).replace('T', ' ')}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default GeneratorPage;