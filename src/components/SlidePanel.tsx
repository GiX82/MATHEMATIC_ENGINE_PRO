import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { canAccessFeature, type AccessFeature } from '../domain/access';
import { geometryCatalog, materialCatalog, effectCatalog, cinematicPresets } from '../domain/geometry';
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
    premium, lightPreset, motionPreset, cameraPreset,
    setSteps, setMode, setEngine, setGrid, setPalette, setGeometry,
    setMaterial, setEffect, setLightPreset, setMotionPreset, setCameraPreset,
    randomize, togglePremium,
  } = useStore();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
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

          {/* Presets */}
          <PanelSection title={t('presets')}>
            <div className="grid gap-1.5">
              {Object.entries(cinematicPresets).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setEngine(preset.config.engine as GeneratorEngine);
                    setGrid(preset.config.grid as SpatialGrid);
                    setPalette(preset.config.palette as PaletteKey);
                    setGeometry(preset.config.geometry as GeometryMode);
                    setMaterial(preset.config.material as MaterialMode);
                    setEffect(preset.config.effect as EffectMode);
                  }}
                  className="rounded-lg border border-white/5 bg-white/3 p-2.5 text-left transition hover:border-cyan-400/20 hover:bg-cyan-500/5"
                >
                  <div className="text-xs font-medium text-white">{preset.label}</div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </PanelSection>

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
              items={Object.entries(geometryCatalog).map(([key, value]) => ({
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
            />
            <div className="mt-1 text-right text-[10px] text-zinc-500">{steps} {t('iterations')}</div>
          </PanelSection>

          <PanelSection title={t('animation')}>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={randomize}
                className="rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5"
              >
                🎲 {t('randomize')}
              </button>
              <button
                type="button"
                onClick={handleNextMode}
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
                onClick={() => { /* export video */ onClose(); }}
                className="w-full rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100 transition hover:bg-violet-500/15"
              >
                🎬 {t('export_video')}
              </button>
              <button
                type="button"
                onClick={() => { /* export cert */ onClose(); }}
                className="w-full rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 transition hover:bg-amber-500/15"
              >
                📜 {t('export_cert')}
              </button>
              <button
                type="button"
                onClick={() => { /* save */ onClose(); }}
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
    const canvas = artCanvasRef?.current?.getCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `math-engine-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    onClose();
  }

  function handleNextMode() {
    if (mode === '2d' && !premium) return;
    setMode(mode === '2d' ? '3d' : '2d');
  }
}
