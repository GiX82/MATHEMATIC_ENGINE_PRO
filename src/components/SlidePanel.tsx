import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useArtworkStore } from '../store/useArtworkStore';
import { useUserStore } from '../store/useUserStore';
import { useGalleryStore } from '../store/useGalleryStore';
import { canAccessFeature, type AccessFeature } from '../domain/access';
import { geometryCatalog, materialCatalog, effectCatalog } from '../domain/geometry';
import {
  engineNames,
  gridNames,
  paletteNames,
  lightPresetNames,
  motionPresetNames,
  cameraPresetNames,
} from '../domain/labels';
import type { CameraPresetId, EffectMode, GeometryMode, LightPresetId, MaterialMode, MotionPresetId, PaletteId } from '../domain/types';
import { paletteDefinitions } from '../domain/palettes';
import type { GeneratorEngine, PaletteKey, SpatialGrid } from '../lib/math';
import type { ArtCanvasHandle } from './ArtCanvas';

const freePaletteKeys: PaletteKey[] = ['void', 'aurora', 'nebula'];
const languages = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
];

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/5 py-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

function OptionGrid({ items, value, onChange, feature, premium }: {
  items: Array<{ key: string; label: string; locked?: boolean }>;
  value: string;
  onChange: (key: string) => void;
  feature: AccessFeature;
  premium?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => {
        const locked = !canAccessFeature(feature, item.key, premium ?? false) && item.locked !== false;
        return (
          <button
            key={item.key}
            type="button"
            disabled={locked}
            onClick={() => onChange(item.key)}
            className={`rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
              value === item.key
                ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                : locked
                  ? 'border border-white/5 bg-white/3 text-zinc-600 cursor-not-allowed'
                  : 'border border-white/5 bg-white/3 text-zinc-300 hover:border-white/15 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center justify-between">
              {item.label}
              {locked && <span className="text-[9px] text-zinc-600">🔒</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  artCanvasRef?: RefObject<ArtCanvasHandle | null>;
}

export function SlidePanel({ isOpen, onClose, artCanvasRef }: SlidePanelProps) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    steps, mode, engine, grid, palette, geometry, material, effect,
    lightPreset, motionPreset, cameraPreset,
    customColors, lineWidth, pointSize, shadowIntensity, shadowDirection, shadowSoftness, lightAngle, animationDuration,
    setSteps, setMode, setEngine, setGrid, setPalette, setGeometry,
    setMaterial, setEffect, setLightPreset, setMotionPreset, setCameraPreset,
    setCustomColor, setLineWidth, setPointSize,
    setShadowIntensity, setShadowDirection, setShadowSoftness, setLightAngle,
    setAnimationDuration,
    randomize,
  } = useArtworkStore(useShallow((s) => ({
    steps: s.steps, mode: s.mode, engine: s.engine, grid: s.grid,
    palette: s.palette, geometry: s.geometry, material: s.material, effect: s.effect,
    lightPreset: s.lightPreset, motionPreset: s.motionPreset, cameraPreset: s.cameraPreset,
    customColors: s.customColors, lineWidth: s.lineWidth, pointSize: s.pointSize,
    shadowIntensity: s.shadowIntensity, shadowDirection: s.shadowDirection, shadowSoftness: s.shadowSoftness,
    lightAngle: s.lightAngle, animationDuration: s.animationDuration,
    setSteps: s.setSteps, setMode: s.setMode, setEngine: s.setEngine, setGrid: s.setGrid,
    setPalette: s.setPalette, setGeometry: s.setGeometry, setMaterial: s.setMaterial,
    setEffect: s.setEffect, setLightPreset: s.setLightPreset, setMotionPreset: s.setMotionPreset,
    setCameraPreset: s.setCameraPreset, setCustomColor: s.setCustomColor,
    setLineWidth: s.setLineWidth, setPointSize: s.setPointSize,
    setShadowIntensity: s.setShadowIntensity, setShadowDirection: s.setShadowDirection,
    setShadowSoftness: s.setShadowSoftness, setLightAngle: s.setLightAngle,
    setAnimationDuration: s.setAnimationDuration,
    randomize: s.randomize,
  })));
  const { premium, togglePremium } = useUserStore(useShallow((s) => ({
    premium: s.premium, togglePremium: s.togglePremium,
  })));

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusable = panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    const firstFocusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={t('studio')}
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 h-full w-[340px] max-w-[85vw] transform bg-[#0a0f1a]/95 backdrop-blur-xl border-l border-white/8 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-semibold tracking-wide text-white">{t('studio')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="h-[calc(100%-60px)] overflow-y-auto px-5 py-2 scrollbar-thin">
          {/* Language */}
          <PanelSection title={t('language')}>
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    i18n.language === lang.code
                      ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                      : 'border border-white/5 bg-white/3 text-zinc-400 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </PanelSection>

          {/* Colors */}
          <PanelSection title={t('colors')}>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-12">{t('color_1')}</label>
                <input
                  type="color"
                  value={customColors[0]}
                  onChange={(e) => setCustomColor(0, e.target.value)}
                  className="h-7 w-full cursor-pointer rounded border border-white/10 bg-transparent"
                  aria-label={t('color_1')}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-12">{t('color_2')}</label>
                <input
                  type="color"
                  value={customColors[1]}
                  onChange={(e) => setCustomColor(1, e.target.value)}
                  className="h-7 w-full cursor-pointer rounded border border-white/10 bg-transparent"
                  aria-label={t('color_2')}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-12">{t('color_3')}</label>
                <input
                  type="color"
                  value={customColors[2]}
                  onChange={(e) => setCustomColor(2, e.target.value)}
                  className="h-7 w-full cursor-pointer rounded border border-white/10 bg-transparent"
                  aria-label={t('color_3')}
                />
              </div>
            </div>
          </PanelSection>

          {/* Animation Duration */}
          <PanelSection title={t('animation_duration')}>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={animationDuration}
                onChange={(e) => setAnimationDuration(parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-400"
                aria-label={t('animation_duration')}
              />
              <span className="text-[10px] text-zinc-400 w-10 text-right">{animationDuration}s</span>
            </div>
          </PanelSection>

          {/* 2D Controls */}
          {mode === '2d' && (
          <PanelSection title={t('controls_2d')}>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-20">{t('thickness')}</label>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400"
                  aria-label={t('thickness')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{lineWidth}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-20">{t('points')}</label>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={pointSize}
                  onChange={(e) => setPointSize(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400"
                  aria-label={t('points')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{pointSize}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-20">{t('shadow')}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={shadowIntensity}
                  onChange={(e) => setShadowIntensity(parseInt(e.target.value, 10))}
                  className="flex-1 accent-cyan-400"
                  aria-label={t('shadow')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{shadowIntensity}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-20">{t('direction')}</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={shadowDirection}
                  onChange={(e) => setShadowDirection(parseInt(e.target.value, 10))}
                  className="flex-1 accent-cyan-400"
                  aria-label={t('direction')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{shadowDirection}°</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-20">{t('softness')}</label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={shadowSoftness}
                  onChange={(e) => setShadowSoftness(parseInt(e.target.value, 10))}
                  className="flex-1 accent-cyan-400"
                  aria-label={t('softness')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{shadowSoftness}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-zinc-500 w-20">{t('light_angle')}</label>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={lightAngle}
                  onChange={(e) => setLightAngle(parseInt(e.target.value, 10))}
                  className="flex-1 accent-cyan-400"
                  aria-label={t('light_angle')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{lightAngle}°</span>
              </div>
            </div>
          </PanelSection>
          )}

          {/* Engine */}
          <PanelSection title={t('engine')}>
            <OptionGrid
              items={Object.entries(engineNames).map(([key, label]) => ({
                key,
                label,
                locked: key !== 'collatz',
              }))}
              value={engine}
              onChange={(k) => setEngine(k as GeneratorEngine)}
              feature="engine"
              premium={premium}
            />
          </PanelSection>

          {/* Grid */}
          <PanelSection title={t('grid')}>
            <OptionGrid
              items={Object.entries(gridNames).map(([key, label]) => ({
                key,
                label,
                locked: key !== 'ulam',
              }))}
              value={grid}
              onChange={(k) => setGrid(k as SpatialGrid)}
              feature="grid"
              premium={premium}
            />
          </PanelSection>

          {/* Palette */}
          <PanelSection title={t('palette')}>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(paletteNames).map(([key, label]) => {
                const locked = !premium && !freePaletteKeys.includes(key as PaletteKey);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={locked}
                    onClick={() => setPalette(key as PaletteKey)}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                      palette === key
                        ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                        : locked
                          ? 'border border-white/5 bg-white/3 text-zinc-600 cursor-not-allowed'
                          : 'border border-white/5 bg-white/3 text-zinc-300 hover:border-white/15'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-white/20"
                      style={{ background: paletteDefinitions[key as PaletteId].accent }}
                    />
                  </button>
                );
              })}
            </div>
          </PanelSection>

          {/* Geometry */}
          <PanelSection title={t('geometry')}>
            <OptionGrid
              items={Object.entries(geometryCatalog)
                .filter(([key]) => mode === '3d' || ['lines', 'polygons'].includes(key))
                .map(([key, value]) => ({
                  key,
                  label: value.label,
                  locked: value.premium,
                }))}
              value={geometry}
              onChange={(k) => setGeometry(k as GeometryMode)}
              feature="geometry"
              premium={premium}
            />
          </PanelSection>

          {/* Material */}
          {mode === '3d' && (
          <PanelSection title={t('material')}>
            <OptionGrid
              items={Object.entries(materialCatalog).map(([key, value]) => ({
                key,
                label: value.label,
                locked: value.premium,
              }))}
              value={material}
              onChange={(k) => setMaterial(k as MaterialMode)}
              feature="material"
              premium={premium}
            />
          </PanelSection>
          )}

          {/* Effect */}
          <PanelSection title={t('effect')}>
            <OptionGrid
              items={Object.entries(effectCatalog).map(([key, value]) => ({
                key,
                label: value.label,
                locked: value.premium,
              }))}
              value={effect}
              onChange={(k) => setEffect(k as EffectMode)}
              feature="effect"
              premium={premium}
            />
          </PanelSection>

          {/* Lighting */}
          <PanelSection title={t('light')}>
            <OptionGrid
              items={Object.entries(lightPresetNames).map(([key, label]) => ({
                key,
                label,
                locked: key !== 'standard',
              }))}
              value={lightPreset}
              onChange={(k) => setLightPreset(k as LightPresetId)}
              feature="lightPreset"
              premium={premium}
            />
          </PanelSection>

          {/* Motion */}
          <PanelSection title={t('motion')}>
            <OptionGrid
              items={Object.entries(motionPresetNames).map(([key, label]) => ({
                key,
                label,
                locked: !['ease-in-out', 'ease-in', 'ease-out'].includes(key),
              }))}
              value={motionPreset}
              onChange={(k) => setMotionPreset(k as MotionPresetId)}
              feature="motionPreset"
              premium={premium}
            />
          </PanelSection>

          {/* Camera */}
          <PanelSection title={t('camera')}>
            <OptionGrid
              items={Object.entries(cameraPresetNames).map(([key, label]) => ({
                key,
                label,
                locked: key !== 'orbit',
              }))}
              value={cameraPreset}
              onChange={(k) => setCameraPreset(k as CameraPresetId)}
              feature="cameraPreset"
              premium={premium}
            />
          </PanelSection>

          {/* Steps & Animation */}
          <PanelSection title={t('steps')}>
            <input
              type="range"
              min={25}
              max={1200}
              step={25}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="w-full accent-cyan-400"
              aria-label={t('steps')}
            />
            <div className="mt-1 text-right text-[10px] text-zinc-500">{steps} {t('iterations')}</div>
          </PanelSection>

          <PanelSection title={t('animation')}>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={randomize}
                aria-label={t('randomize')}
                className="rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5"
              >
                🎲 {t('randomize')}
              </button>
              <button
                type="button"
                onClick={handleNextMode}
                aria-label={mode === '2d' ? '3D' : '2D'}
                className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/15"
              >
                {mode === '2d' ? '🔄 3D' : '🔄 2D'}
              </button>
            </div>
          </PanelSection>

          {/* Export */}
          <PanelSection title={t('export')}>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleExportPNG}
                className="w-full rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-500/15"
              >
                📸 {t('export_png')}
              </button>
              <button
                type="button"
                disabled
                className="w-full rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-600 cursor-not-allowed"
              >
                🎬 {t('export_video')} — {t('coming_soon')}
              </button>
              <button
                type="button"
                disabled
                className="w-full rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-600 cursor-not-allowed"
              >
                📜 {t('export_cert')} — {t('coming_soon')}
              </button>
              <button
                type="button"
                onClick={handleSaveToGallery}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/8"
              >
                💾 {t('save_gallery')}
              </button>
            </div>
          </PanelSection>

          {/* Premium */}
          <div className="py-4">
            <button
              type="button"
              onClick={togglePremium}
              aria-label={premium ? t('premium_active') : t('enable_premium')}
              className={`w-full rounded-xl border px-4 py-3 text-xs font-medium transition ${
                premium
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/15'
              }`}
            >
              {premium ? `✓ ${t('premium_active')}` : `⭐ ${t('enable_premium')}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  function handleExportPNG() {
    try {
      const canvas = artCanvasRef?.current?.getCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `math-engine-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onClose();
    } catch {
      // canvas.toDataURL can throw if WebGL context lost or tainted
    }
  }

  function captureThumbnail(): string {
    const canvas = artCanvasRef?.current?.getCanvas();
    if (!canvas) return '';
    try {
      const maxSide = 200;
      const scale = maxSide / Math.max(canvas.width, canvas.height);
      const w = Math.round(canvas.width * scale);
      const h = Math.round(canvas.height * scale);
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return canvas.toDataURL('image/png');
      ctx.drawImage(canvas, 0, 0, w, h);
      return offscreen.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  function handleSaveToGallery() {
    const preview = captureThumbnail();
    if (!preview) return;
    const saveArtwork = useGalleryStore.getState().saveArtwork;
    saveArtwork({
      seed: useArtworkStore.getState().seed,
      steps: useArtworkStore.getState().steps,
      mode: useArtworkStore.getState().mode,
      engine: useArtworkStore.getState().engine,
      grid: useArtworkStore.getState().grid,
      palette: useArtworkStore.getState().palette,
      geometry: useArtworkStore.getState().geometry,
      material: useArtworkStore.getState().material,
      effect: useArtworkStore.getState().effect,
      preview,
    });
    onClose();
  }

  function handleNextMode() {
    if (mode === '2d' && !premium) return;
    setMode(mode === '2d' ? '3d' : '2d');
  }
}
