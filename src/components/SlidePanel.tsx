import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
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

// ── Constants ───────────────────────────────────────────────────────────────
const freePaletteKeys: PaletteKey[] = ['none', 'void', 'aurora', 'nebula'];
const languages = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
];

type SectionId =
  | 'scene' | 'aspect' | 'animation' | 'effects' | 'controls' | 'system'
  | 'scene-engine' | 'scene-grid' | 'scene-geometry'
  | 'aspect-colors' | 'aspect-palette' | 'aspect-material' | 'aspect-light' | 'aspect-background'
  | 'anim-duration' | 'anim-motion' | 'anim-camera'
  | 'fx-effect' | 'fx-advanced'
  | 'ctrl-3d'
  | 'sys-language' | 'sys-export';

// ── Helper: get display label for any option ────────────────────────────────
function getOptionLabel(type: string, key: string): string {
  switch (type) {
    case 'engine': return engineNames[key as GeneratorEngine] ?? key;
    case 'grid': return gridNames[key as SpatialGrid] ?? key;
    case 'geometry': return geometryCatalog[key as GeometryMode]?.label ?? key;
    case 'material': return materialCatalog[key as MaterialMode]?.label ?? key;
    case 'effect': return effectCatalog[key as EffectMode]?.label ?? key;
    case 'light': return lightPresetNames[key as LightPresetId] ?? key;
    case 'motion': return motionPresetNames[key as MotionPresetId] ?? key;
    case 'camera': return cameraPresetNames[key as CameraPresetId] ?? key;
    case 'palette': return paletteNames[key as PaletteKey] ?? key;
    default: return key;
  }
}

// ── Accordion Row ───────────────────────────────────────────────────────────
function AccordionRow({
  label,
  value,
  isOpen,
  onToggle,
  dots,
  badge,
  disabled,
}: {
  label: string;
  value?: string;
  isOpen: boolean;
  onToggle: () => void;
  dots?: string[];
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition ${
        isOpen
          ? 'bg-white/5 border border-white/10'
          : 'border border-transparent hover:bg-white/3'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span className="text-[11px] font-medium text-zinc-300">{label}</span>
      <span className="flex items-center gap-2">
        {dots ? (
          <span className="flex gap-1">
            {dots.map((c, i) => (
              <span key={i} className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
            ))}
          </span>
        ) : badge ? (
          <span className="text-[10px] text-zinc-500">{badge}</span>
        ) : value ? (
          <span className="text-[10px] text-zinc-500">{value}</span>
        ) : null}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-zinc-600 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        >
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  );
}

// ── Option List (for engines, grids, etc.) ──────────────────────────────────
function OptionList({
  items,
  value,
  onChange,
  feature,
  premium,
  searchable,
}: {
  items: Array<{ key: string; label: string; locked?: boolean }>;
  value: string;
  onChange: (key: string) => void;
  feature: AccessFeature;
  premium?: boolean;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = searchable && search
    ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-1.5">
      {searchable && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca..."
          className="w-full rounded-lg border border-white/8 bg-white/3 px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-white/20"
        />
      )}
      <div className="max-h-[320px] overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
        {filtered.map((item) => {
          const locked = !canAccessFeature(feature, item.key, premium ?? false) && item.locked !== false;
          return (
            <button
              key={item.key}
              type="button"
              disabled={locked}
              onClick={() => { onChange(item.key); setSearch(''); }}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                value === item.key
                  ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-400/30'
                  : locked
                    ? 'text-zinc-600 cursor-not-allowed border border-transparent'
                    : 'text-zinc-400 hover:bg-white/3 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                value === item.key ? 'bg-cyan-400' : 'bg-zinc-700'
              }`} />
              <span className="flex-1">{item.label}</span>
              {locked && <span className="text-[9px] text-zinc-700">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Slider Row ──────────────────────────────────────────────────────────────
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-zinc-500 w-16 shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-cyan-400 h-1"
        aria-label={label}
      />
      <span className="text-[10px] text-zinc-400 w-8 text-right">{value}{unit ?? ''}</span>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-medium pt-3 pb-1 px-1">
      {title}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  artCanvasRef?: RefObject<ArtCanvasHandle | null>;
}

export function SlidePanel({ isOpen, onClose, artCanvasRef }: SlidePanelProps) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  const {
    steps, mode, engine, grid, palette, geometry, material, effect,
    lightPreset, motionPreset, cameraPreset,
    customColors, customColorsPreset, lineWidth, pointSize,
    shadowIntensity, shadowDirection, shadowSoftness, lightAngle,
    animationDuration, backgroundMode,
    fogDensity, dispersion, stardustDensity, stardustReactivity, shockwaveIntensity, dofStrength,
    setSteps, setMode, setEngine, setGrid, setPalette, setGeometry,
    setMaterial, setEffect, setLightPreset, setMotionPreset, setCameraPreset,
    setCustomColor, setLineWidth, setPointSize,
    setShadowIntensity, setShadowDirection, setShadowSoftness, setLightAngle,
    setAnimationDuration, setBackgroundMode,
    setFogDensity, setDispersion, setStardustDensity, setStardustReactivity, setShockwaveIntensity, setDofStrength,
    showGrid, setShowGrid,
    randomize,
  } = useArtworkStore(useShallow((s) => ({
    steps: s.steps, mode: s.mode, engine: s.engine, grid: s.grid,
    palette: s.palette, geometry: s.geometry, material: s.material, effect: s.effect,
    lightPreset: s.lightPreset, motionPreset: s.motionPreset, cameraPreset: s.cameraPreset,
    customColors: s.customColors, customColorsPreset: s.customColorsPreset,
    lineWidth: s.lineWidth, pointSize: s.pointSize,
    shadowIntensity: s.shadowIntensity, shadowDirection: s.shadowDirection, shadowSoftness: s.shadowSoftness,
    lightAngle: s.lightAngle, animationDuration: s.animationDuration, backgroundMode: s.backgroundMode,
    fogDensity: s.fogDensity, dispersion: s.dispersion,
    stardustDensity: s.stardustDensity, stardustReactivity: s.stardustReactivity,
    shockwaveIntensity: s.shockwaveIntensity, dofStrength: s.dofStrength,
    setSteps: s.setSteps, setMode: s.setMode, setEngine: s.setEngine, setGrid: s.setGrid,
    setPalette: s.setPalette, setGeometry: s.setGeometry, setMaterial: s.setMaterial,
    setEffect: s.setEffect, setLightPreset: s.setLightPreset, setMotionPreset: s.setMotionPreset,
    setCameraPreset: s.setCameraPreset, setCustomColor: s.setCustomColor,
    setLineWidth: s.setLineWidth, setPointSize: s.setPointSize,
    setShadowIntensity: s.setShadowIntensity, setShadowDirection: s.setShadowDirection,
    setShadowSoftness: s.setShadowSoftness, setLightAngle: s.setLightAngle,
    setAnimationDuration: s.setAnimationDuration, setBackgroundMode: s.setBackgroundMode,
    setFogDensity: s.setFogDensity, setDispersion: s.setDispersion,
    setStardustDensity: s.setStardustDensity, setStardustReactivity: s.setStardustReactivity,
    setShockwaveIntensity: s.setShockwaveIntensity, setDofStrength: s.setDofStrength,
    showGrid: s.showGrid, setShowGrid: s.setShowGrid,
    randomize: s.randomize,
  })));

  const { premium, togglePremium } = useUserStore(useShallow((s) => ({
    premium: s.premium, togglePremium: s.togglePremium,
  })));

  // Sync palette → custom colors on palette change
  useEffect(() => {
    if (!customColorsPreset) {
      const pal = paletteDefinitions[palette as PaletteId];
      if (pal) {
        setCustomColor(0, pal.start);
        setCustomColor(1, pal.glow);
        setCustomColor(2, pal.end);
      }
    }
    if (palette === 'clean') setEffect('neutral');
  }, [palette, customColorsPreset, setCustomColor, setEffect]);

  // Keyboard: ESC closes submenu or panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openSection) {
          setOpenSection(null);
        } else {
          onClose();
        }
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, openSection]);

  const toggle = useCallback((id: SectionId) => {
    setOpenSection(prev => prev === id ? null : id);
  }, []);

  // Reset openSection when panel closes
  useEffect(() => {
    if (!isOpen) {
      setOpenSection(null);
    }
  }, [isOpen]);

  // Count active advanced effects
  const activeAdvanced = [fogDensity, dispersion, stardustDensity > 0 ? stardustDensity : 0, shockwaveIntensity, dofStrength].filter(v => v > 0).length;

  // ── Export helpers ──────────────────────────────────────────────────────
  function handleExportPNG() {
    try {
      const hiRes = artCanvasRef?.current?.exportHiRes;
      if (hiRes) { hiRes(2); onClose(); return; }
      const canvas = artCanvasRef?.current?.getCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `math-engine-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onClose();
    } catch { /* ignore */ }
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
      offscreen.width = w; offscreen.height = h;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return canvas.toDataURL('image/png');
      ctx.drawImage(canvas, 0, 0, w, h);
      return offscreen.toDataURL('image/png');
    } catch { return ''; }
  }

  function handleSaveToGallery() {
    const preview = captureThumbnail();
    if (!preview) return;
    useGalleryStore.getState().saveArtwork({
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={t('studio')}
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 h-full w-[340px] max-w-[85vw] transform bg-[#0a0f1a]/95 backdrop-blur-xl border-l border-white/8 transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3 shrink-0">
          <h2 className="text-xs font-semibold tracking-wide text-white uppercase">{t('studio')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition hover:text-white text-xs"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">

          {/* ═══════ SCENA ═══════ */}
          <SectionHeader title="Scena" />
          <div className="space-y-0.5">
            <AccordionRow
              label="Motore"
              value={getOptionLabel('engine', engine)}
              isOpen={openSection === 'scene-engine'}
              onToggle={() => toggle('scene-engine')}
            />
            {openSection === 'scene-engine' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(engineNames).map(([k, l]) => ({ key: k, label: l, locked: k !== 'collatz' }))}
                  value={engine}
                  onChange={(k) => setEngine(k as GeneratorEngine)}
                  feature="engine"
                  premium={premium}
                  searchable
                />
              </div>
            )}

            <AccordionRow
              label="Griglia"
              value={getOptionLabel('grid', grid)}
              isOpen={openSection === 'scene-grid'}
              onToggle={() => toggle('scene-grid')}
            />
            {openSection === 'scene-grid' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(gridNames).map(([k, l]) => ({ key: k, label: l, locked: k !== 'ulam' }))}
                  value={grid}
                  onChange={(k) => setGrid(k as SpatialGrid)}
                  feature="grid"
                  premium={premium}
                />
              </div>
            )}

            <AccordionRow
              label="Geometria"
              value={getOptionLabel('geometry', geometry)}
              isOpen={openSection === 'scene-geometry'}
              onToggle={() => toggle('scene-geometry')}
            />
            {openSection === 'scene-geometry' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(geometryCatalog)
                    .filter(([k]) => mode === '3d' || ['lines', 'polygons'].includes(k))
                    .map(([k, v]) => ({ key: k, label: v.label, locked: v.premium }))}
                  value={geometry}
                  onChange={(k) => setGeometry(k as GeometryMode)}
                  feature="geometry"
                  premium={premium}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/3"
            >
              <span className="text-zinc-400">📐 {t('show_grid')}</span>
              <span className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${showGrid ? 'bg-cyan-500/40 justify-end' : 'bg-white/10 justify-start'}`}>
                <span className={`mx-0.5 h-4 w-4 rounded-full transition-colors ${showGrid ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
              </span>
            </button>
          </div>

          {/* ═══════ ASPETTO ═══════ */}
          <SectionHeader title="Aspetto" />
          <div className="space-y-0.5">
            <AccordionRow
              label="Colori"
              dots={customColors}
              isOpen={openSection === 'aspect-colors'}
              onToggle={() => toggle('aspect-colors')}
            />
            {openSection === 'aspect-colors' && (
              <div className="pl-2 pb-2 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <label className="text-[10px] text-zinc-500 w-12">{t(`color_${i + 1}`)}</label>
                    <input
                      type="color"
                      value={customColors[i]}
                      onChange={(e) => setCustomColor(i as 0 | 1 | 2, e.target.value)}
                      className="h-7 w-full cursor-pointer rounded border border-white/10 bg-transparent"
                      aria-label={t(`color_${i + 1}`)}
                    />
                  </div>
                ))}
              </div>
            )}

            <AccordionRow
              label="Palette"
              value={getOptionLabel('palette', palette)}
              isOpen={openSection === 'aspect-palette'}
              onToggle={() => toggle('aspect-palette')}
            />
            {openSection === 'aspect-palette' && (
              <div className="pl-2 pb-2">
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(paletteNames).map(([key, label]) => {
                    const locked = !premium && !freePaletteKeys.includes(key as PaletteKey);
                    const def = paletteDefinitions[key as PaletteId];
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
                              ? 'border-white/5 bg-white/3 text-zinc-600 cursor-not-allowed'
                              : 'border-white/5 bg-white/3 text-zinc-300 hover:border-white/15'
                        }`}
                      >
                        <span>{label}</span>
                        {def && (
                          <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: def.accent }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <AccordionRow
              label="Materiale"
              value={mode === '3d' ? getOptionLabel('material', material) : '—'}
              isOpen={openSection === 'aspect-material'}
              onToggle={() => mode === '3d' && toggle('aspect-material')}
              disabled={mode !== '3d'}
            />
            {openSection === 'aspect-material' && mode === '3d' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(materialCatalog).map(([k, v]) => ({ key: k, label: v.label, locked: v.premium }))}
                  value={material}
                  onChange={(k) => setMaterial(k as MaterialMode)}
                  feature="material"
                  premium={premium}
                />
              </div>
            )}

            <AccordionRow
              label="Illuminazione"
              value={getOptionLabel('light', lightPreset)}
              isOpen={openSection === 'aspect-light'}
              onToggle={() => toggle('aspect-light')}
            />
            {openSection === 'aspect-light' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(lightPresetNames).map(([k, l]) => ({ key: k, label: l, locked: k !== 'standard' }))}
                  value={lightPreset}
                  onChange={(k) => setLightPreset(k as LightPresetId)}
                  feature="lightPreset"
                  premium={premium}
                />
              </div>
            )}

            <AccordionRow
              label="Sfondo"
              value={getOptionLabel('bg', backgroundMode)}
              isOpen={openSection === 'aspect-background'}
              onToggle={() => toggle('aspect-background')}
            />
            {openSection === 'aspect-background' && (
              <div className="pl-2 pb-2 flex gap-1">
                {(['none', 'mosaic', 'tunnel'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBackgroundMode(m)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition border ${
                      backgroundMode === m
                        ? 'bg-cyan-600/20 border-cyan-400/30 text-cyan-200'
                        : 'border-white/5 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t(`bg_${m}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ═══════ ANIMAZIONE ═══════ */}
          <SectionHeader title="Animazione" />
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] font-medium text-zinc-300">Durata</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1} max={15} step={1}
                  value={animationDuration}
                  onChange={(e) => setAnimationDuration(parseInt(e.target.value, 10))}
                  className="w-20 accent-cyan-400 h-1"
                  aria-label={t('animation_duration')}
                />
                <span className="text-[10px] text-zinc-400 w-6 text-right">{animationDuration}s</span>
              </div>
            </div>

            <AccordionRow
              label="Movimento"
              value={getOptionLabel('motion', motionPreset)}
              isOpen={openSection === 'anim-motion'}
              onToggle={() => toggle('anim-motion')}
            />
            {openSection === 'anim-motion' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(motionPresetNames).map(([k, l]) => ({
                    key: k, label: l, locked: !['ease-in-out', 'ease-in', 'ease-out'].includes(k),
                  }))}
                  value={motionPreset}
                  onChange={(k) => setMotionPreset(k as MotionPresetId)}
                  feature="motionPreset"
                  premium={premium}
                />
              </div>
            )}

            <AccordionRow
              label="Camera"
              value={getOptionLabel('camera', cameraPreset)}
              isOpen={openSection === 'anim-camera'}
              onToggle={() => toggle('anim-camera')}
            />
            {openSection === 'anim-camera' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(cameraPresetNames).map(([k, l]) => ({ key: k, label: l, locked: k !== 'orbit' }))}
                  value={cameraPreset}
                  onChange={(k) => setCameraPreset(k as CameraPresetId)}
                  feature="cameraPreset"
                  premium={premium}
                />
              </div>
            )}
          </div>

          {/* ═══════ EFFETTI ═══════ */}
          <SectionHeader title="Effetti" />
          <div className="space-y-0.5">
            <AccordionRow
              label="Effetto"
              value={getOptionLabel('effect', effect)}
              isOpen={openSection === 'fx-effect'}
              onToggle={() => toggle('fx-effect')}
            />
            {openSection === 'fx-effect' && (
              <div className="pl-2 pb-2">
                <OptionList
                  items={Object.entries(effectCatalog).map(([k, v]) => ({ key: k, label: v.label, locked: v.premium }))}
                  value={effect}
                  onChange={(k) => setEffect(k as EffectMode)}
                  feature="effect"
                  premium={premium}
                />
              </div>
            )}

            <AccordionRow
              label="Effetti avanzati"
              badge={activeAdvanced > 0 ? `${activeAdvanced} attivi` : 'nessuno'}
              isOpen={openSection === 'fx-advanced'}
              onToggle={() => toggle('fx-advanced')}
            />
            {openSection === 'fx-advanced' && (
              <div className="pl-2 pb-2 space-y-2.5">
                <SliderRow label={t('fog')} value={fogDensity} min={0} max={1} step={0.05} onChange={setFogDensity} />
                <SliderRow label={t('dispersion')} value={dispersion} min={0} max={1} step={0.05} onChange={setDispersion} />
                {mode === '3d' && (
                  <SliderRow label={t('stardust')} value={stardustDensity} min={500} max={5000} step={100} onChange={setStardustDensity} />
                )}
                {mode === '3d' && stardustDensity > 0 && (
                  <SliderRow label={t('reactivity')} value={stardustReactivity} min={0} max={1} step={0.05} onChange={setStardustReactivity} />
                )}
                <SliderRow label={t('shockwave')} value={shockwaveIntensity} min={0} max={1} step={0.05} onChange={setShockwaveIntensity} />
                {mode === '3d' && (
                  <SliderRow label={t('dof')} value={dofStrength} min={0} max={1} step={0.05} onChange={setDofStrength} />
                )}
              </div>
            )}
          </div>

          {/* ═══════ CONTROLLI ═══════ */}
          <SectionHeader title="Controlli" />
          <div className="space-y-0.5">
            <AccordionRow
              label="Spessore · Ombra · Luce"
              badge={`${lineWidth} · ${shadowIntensity}`}
              isOpen={openSection === 'ctrl-3d'}
              onToggle={() => toggle('ctrl-3d')}
            />
            {openSection === 'ctrl-3d' && (
              <div className="pl-2 pb-2 space-y-2.5">
                <SliderRow label={t('thickness')} value={lineWidth} min={0.5} max={20} step={0.5} onChange={setLineWidth} />
                <SliderRow label={t('shadow')} value={shadowIntensity} min={0} max={10} step={1} onChange={setShadowIntensity} />
                <SliderRow label={t('direction')} value={shadowDirection} min={0} max={360} step={15} unit="°" onChange={setShadowDirection} />
                <SliderRow label={t('softness')} value={shadowSoftness} min={0} max={3} step={1} onChange={setShadowSoftness} />
                <SliderRow label={t('light_angle')} value={lightAngle} min={15} max={90} step={5} unit="°" onChange={setLightAngle} />
                {mode === '2d' && (
                  <SliderRow label={t('points')} value={pointSize} min={0.5} max={12} step={0.5} onChange={setPointSize} />
                )}
              </div>
            )}
          </div>

          {/* ═══════ SISTEMA ═══════ */}
          <SectionHeader title="Sistema" />
          <div className="space-y-0.5">
            <AccordionRow
              label="Lingua"
              value={languages.find(l => l.code === i18n.language)?.label ?? 'Italiano'}
              isOpen={openSection === 'sys-language'}
              onToggle={() => toggle('sys-language')}
            />
            {openSection === 'sys-language' && (
              <div className="pl-2 pb-2 flex flex-wrap gap-1">
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
            )}

            <AccordionRow
              label="Esporta"
              value="›"
              isOpen={openSection === 'sys-export'}
              onToggle={() => toggle('sys-export')}
            />
            {openSection === 'sys-export' && (
              <div className="pl-2 pb-2 space-y-1.5">
                <button type="button" onClick={handleExportPNG}
                  className="w-full rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-500/15">
                  📸 {t('export_png')}
                </button>
                <button type="button" disabled
                  className="w-full rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-600 cursor-not-allowed">
                  🎬 {t('export_video')} — {t('coming_soon')}
                </button>
                <button type="button" disabled
                  className="w-full rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-600 cursor-not-allowed">
                  📜 {t('export_cert')} — {t('coming_soon')}
                </button>
                <button type="button" onClick={handleSaveToGallery}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/8">
                  💾 {t('save_gallery')}
                </button>
              </div>
            )}
          </div>

          {/* ═══════ BOTTOM ACTIONS ═══════ */}
          <div className="py-3 space-y-2 border-t border-white/5 mt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={randomize}
                className="flex-1 rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5"
              >
                🎲 {t('randomize')}
              </button>
              <button
                type="button"
                onClick={() => { if (mode === '2d' && !premium) return; setMode(mode === '2d' ? '3d' : '2d'); }}
                className="flex-1 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/15"
              >
                {mode === '2d' ? '🔄 3D' : '🔄 2D'}
              </button>
            </div>

            <button
              type="button"
              onClick={togglePremium}
              className={`w-full rounded-xl border px-4 py-2.5 text-xs font-medium transition ${
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
}
