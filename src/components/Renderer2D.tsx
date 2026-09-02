import { useEffect, useRef } from 'react';
import type { GeometryMode, EffectMode } from '../domain/types';
import { buildArtwork, getPalette, normalizeArtwork, type GeneratorEngine, type PaletteKey, type SpatialGrid } from '../lib/math';
import { createMosaicState, updateMosaicInfluence, drawMosaic, disposeMosaic, type MosaicState } from '../core/mosaic-background';

interface Renderer2DProps {
  seed: number;
  steps: number;
  palette: PaletteKey;
  engine: GeneratorEngine;
  grid: SpatialGrid;
  geometry: GeometryMode;
  effect: EffectMode;
  animationSpeed: number;
  isAnimating: boolean;
  customColors?: [string, string, string];
  lineWidth?: number;
  pointSize?: number;
  shadowIntensity?: number;
  shadowDirection?: number;
  shadowSoftness?: number;
  lightAngle?: number;
  backgroundMode?: 'none' | 'mosaic' | 'tunnel';
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

type CachedArtwork = {
  normalized: Array<{ x: number; y: number; value: number }>;
  stats: { maxValue: number };
  paletteColors: Record<string, string>;
};

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function Renderer2D({ seed, steps, palette, engine, grid, geometry, effect, animationSpeed, isAnimating, customColors, lineWidth = 1.5, pointSize = 3, shadowIntensity = 4, shadowDirection = 135, shadowSoftness = 2, lightAngle = 45, backgroundMode = 'none', onCanvasReady }: Renderer2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artworkCacheRef = useRef<CachedArtwork | null>(null);
  const mosaicRef = useRef<MosaicState | null>(null);

  // Ref for animation params that change frequently (no rebuild needed)
  const animParamsRef = useRef({
    speed: animationSpeed,
    animating: isAnimating,
    shIntensity: shadowIntensity,
    shSoftness: shadowSoftness,
    shDirection: shadowDirection,
    lightAngle,
    lineWidth,
    pointSize,
    effect,
    backgroundMode,
  });

  // Ref for colors — updated cheaply, read in animation loop
  const colorsRef = useRef({
    bg: '#02060e',
    start: '#00f5d4',
    glow: '#7b2ff7',
    end: '#f72585',
    accent: '#00f5d4',
  });

  // ── EFFECT 1: Sync animation params (no rebuild) ────────────────────────
  useEffect(() => {
    animParamsRef.current.speed = animationSpeed;
    animParamsRef.current.animating = isAnimating;
    animParamsRef.current.shIntensity = shadowIntensity;
    animParamsRef.current.shSoftness = shadowSoftness;
    animParamsRef.current.shDirection = shadowDirection;
    animParamsRef.current.lightAngle = lightAngle;
    animParamsRef.current.lineWidth = lineWidth;
    animParamsRef.current.pointSize = pointSize;
    animParamsRef.current.effect = effect;
    animParamsRef.current.backgroundMode = backgroundMode;
  }, [animationSpeed, isAnimating, shadowIntensity, shadowSoftness, shadowDirection, lightAngle, lineWidth, pointSize, effect, backgroundMode]);

  // ── EFFECT 2: Sync colors (no rebuild) ──────────────────────────────────
  useEffect(() => {
    const pal = getPalette(palette);
    colorsRef.current = customColors
      ? { ...pal, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : pal;
  }, [palette, customColors]);

  // ── EFFECT 3: Expensive setup — canvas, artwork math, animation loop ────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousCanvas = container.querySelector('canvas');
    if (previousCanvas) previousCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvasRef.current = canvas;
    container.appendChild(canvas);
    onCanvasReady?.(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    let viewWidth = 1;
    let viewHeight = 1;

    const syncSize = () => {
      const nextRect = container.getBoundingClientRect();
      viewWidth = nextRect.width || 1;
      viewHeight = nextRect.height || 1;
      canvas.width = Math.floor(viewWidth * ratio);
      canvas.height = Math.floor(viewHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    syncSize();

    // Offscreen canvas for noise (reused every frame)
    const noiseCanvas = document.createElement('canvas');
    const noiseCtx = noiseCanvas.getContext('2d');
    let noiseImgData: ImageData | null = null;
    let noiseCachedW = 0;
    let noiseCachedH = 0;

    let disposed = false;

    // ── Expensive math — computed once per seed/steps/engine/grid ──
    const { points, stats } = buildArtwork(seed, steps, engine, grid);
    const normalized = normalizeArtwork(points);

    // Cache artwork data for the animation loop
    artworkCacheRef.current = { normalized, stats, paletteColors: getPalette(palette) };

    // Create mosaic background if enabled
    const bm = animParamsRef.current.backgroundMode;
    if (bm === 'mosaic') {
      const cols = Math.max(8, Math.min(24, Math.floor(viewWidth / 60)));
      const rows = Math.max(6, Math.min(18, Math.floor(viewHeight / 60)));
      mosaicRef.current = createMosaicState(viewWidth, viewHeight, cols, rows);
    }

    let drawStart = -1;

    const rgbStr = (c: [number, number, number], a = 1) =>
      `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

    // ── 3-stop color map — terzile distribution (33/33/34) ──
    const mapValueToColor = (t: number, c1: [number, number, number], c2: [number, number, number], c3: [number, number, number]): readonly [number, number, number] => {
      if (t < 0.33) {
        const u = t / 0.33;
        return [
          c1[0] + (c2[0] - c1[0]) * u,
          c1[1] + (c2[1] - c1[1]) * u,
          c1[2] + (c2[2] - c1[2]) * u,
        ];
      }
      if (t < 0.66) {
        const u = (t - 0.33) / 0.33;
        return [
          c2[0] + (c3[0] - c2[0]) * u,
          c2[1] + (c3[1] - c2[1]) * u,
          c2[2] + (c3[2] - c2[2]) * u,
        ];
      }
      const u = (t - 0.66) / 0.34;
      return [
        c3[0] + (c1[0] - c3[0]) * u,
        c3[1] + (c1[1] - c3[1]) * u,
        c3[2] + (c1[2] - c3[2]) * u,
      ];
    };

    // ── Darken a color for shadow ──
    const darkenColor = (c: readonly [number, number, number], factor: number): readonly [number, number, number] => [
      c[0] * factor, c[1] * factor, c[2] * factor,
    ];

    const drawFrame = (time: number) => {
      const { speed, animating, shIntensity, shSoftness, shDirection, lightAngle: _la, lineWidth: lw, pointSize: ps, effect: eff } = animParamsRef.current;
      const colors = colorsRef.current;

      // Parse colors once per frame (cheap — 3 hex parses)
      const c1 = parseHex(colors.start);
      const c2 = parseHex(colors.glow);
      const c3 = parseHex(colors.end);

      if (drawStart < 0) drawStart = time;
      const drawDuration = animParamsRef.current.speed * 1000;
      const drawProgress = Math.min(1, (time - drawStart) / drawDuration);
      const easedDraw = drawProgress < 0.5
        ? 2 * drawProgress * drawProgress
        : -1 + (4 - 2 * drawProgress) * drawProgress;
      const visibleCount = Math.floor(easedDraw * normalized.length);
      const isRevealing = drawProgress < 1;
      const pulse = (animating && isRevealing) ? Math.sin(time * 0.0005 * speed + seed) * (1 - easedDraw) : 0;

      ctx.clearRect(0, 0, viewWidth, viewHeight);

      // ── Center point ──
      const focalX = viewWidth * 0.5;
      const focalY = viewHeight * 0.5;

      // ── Background gradient — all 3 colors ──
      const bg = ctx.createRadialGradient(focalX, focalY, 15, focalX, focalY, Math.max(viewWidth, viewHeight));
      bg.addColorStop(0, colors.bg);
      bg.addColorStop(0.2, colors.start);
      bg.addColorStop(0.5, colors.glow);
      bg.addColorStop(0.8, colors.end);
      bg.addColorStop(1, colors.bg);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // ── Mosaic background (if enabled) ──
      const mosaic = mosaicRef.current;
      if (mosaic && animParamsRef.current.backgroundMode === 'mosaic') {
        const scale = (Math.min(viewWidth, viewHeight) * 0.44) / Math.max(1, (() => { let m = 0; for (const p of normalized) { if (Math.abs(p.x) > m) m = Math.abs(p.x); if (Math.abs(p.y) > m) m = Math.abs(p.y); } return m; })());
        updateMosaicInfluence(mosaic, normalized, viewWidth, viewHeight, focalX, focalY, scale);
        drawMosaic(mosaic, colors, time, 1.0);
        ctx.drawImage(mosaic.canvas, 0, 0, viewWidth, viewHeight);
      }

      // ── Tunnel vortex background (if enabled) ──
      if (animParamsRef.current.backgroundMode === 'tunnel') {
        const t = time * 0.0003;
        const cx = focalX;
        const cy = focalY;
        const maxR = Math.hypot(viewWidth, viewHeight) * 0.6;
        const rings = 24;
        for (let i = rings; i >= 0; i--) {
          const frac = i / rings;
          const r = maxR * frac;
          const angle = t + frac * Math.PI * 6;
          const c1 = parseHex(colors.start);
          const c2 = parseHex(colors.glow);
          const blend = (Math.sin(angle) + 1) * 0.5;
          const cr = c1[0] + (c2[0] - c1[0]) * blend;
          const cg = c1[1] + (c2[1] - c1[1]) * blend;
          const cb = c1[2] + (c2[2] - c1[2]) * blend;
          const alpha = 0.03 + (1 - frac) * 0.06;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha})`;
          ctx.lineWidth = Math.max(2, maxR / rings * 1.5);
          ctx.stroke();
        }
      }

      // ── Central glow — bright light at focal point ──
      const glow = ctx.createRadialGradient(focalX, focalY, 0, focalX, focalY, viewWidth * 0.35);
      glow.addColorStop(0, 'rgba(200, 230, 255, 0.18)');
      glow.addColorStop(0.3, 'rgba(140, 180, 255, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // ── Natural vignette — subtle edge darkening ──
      const vig = ctx.createRadialGradient(focalX, focalY, viewWidth * 0.25, focalX, focalY, viewWidth * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // ── Effect overlays ──
      if (eff === 'fog') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }
      if (eff === 'depth') {
        const vig2 = ctx.createRadialGradient(focalX, focalY, viewWidth * 0.2, focalX, focalY, viewWidth * 0.7);
        vig2.addColorStop(0, 'rgba(0,0,0,0)');
        vig2.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig2;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }
      if (eff === 'cinematic-lighting') {
        const cin = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
        cin.addColorStop(0, 'rgba(0,0,0,0.3)');
        cin.addColorStop(0.5, 'rgba(0,0,0,0)');
        cin.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = cin;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      // ── Ambient particles (palette-driven, value-mapped) ──
      const particleAlpha =
        eff === 'glow' ? 0.7 :
        eff === 'bloom' ? 0.5 :
        eff === 'fog' ? 0.25 :
        eff === 'depth' ? 0.35 :
        eff === 'cinematic-lighting' ? 0.6 :
        0.45;
      const particleT =
        eff === 'glow' ? 0.8 :
        eff === 'bloom' ? 0.3 :
        eff === 'fog' ? 0.5 :
        eff === 'depth' ? 0.4 :
        eff === 'cinematic-lighting' ? 0.2 :
        0.5;
      const pCol = mapValueToColor(particleT, c1, c2, c3);
      for (let index = 0; index < 160; index += 1) {
        const x = ((Math.sin(index * 19.17 + seed) * 0.5 + 0.5) * viewWidth);
        const y = ((Math.cos(index * 13.71 + seed) * 0.5 + 0.5) * viewHeight);
        const radius = 0.8 + ((index % 5) / 6) + (pulse * 0.2);
        ctx.beginPath();
        ctx.fillStyle = rgbStr(pCol, particleAlpha);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const centerX = focalX + Math.sin(pulse + seed) * 6;
      const centerY = focalY + Math.cos(pulse * 0.7 + seed * 0.3) * 5;

      // ── Compute max coordinate extent to guarantee artwork fits in viewport ──
      let maxCoord = 0;
      for (const p of normalized) {
        if (Math.abs(p.x) > maxCoord) maxCoord = Math.abs(p.x);
        if (Math.abs(p.y) > maxCoord) maxCoord = Math.abs(p.y);
      }
      const scale = (Math.min(viewWidth, viewHeight) * 0.44) / Math.max(1, maxCoord);

      // ── Density scale: fewer points → smaller elements ──
      const densityScale = Math.min(1, Math.sqrt(normalized.length / 50));

      // ── Shadow params: directional from lightAngle ──
      const shadowOn = shIntensity > 0;
      const shBlur = 25 + (shSoftness / 3) * 10; // 25–35px range
      const shRad = (shDirection * Math.PI) / 180;
      const shDist = 3 + shIntensity * 0.4;
      const shOffX = -Math.cos(shRad) * shDist;
      const shOffY = Math.sin(shRad) * shDist;
      const shAlpha = 0.50 + (shIntensity / 10) * 0.40;
      const isGlowEffect = eff === 'glow' || eff === 'bloom' || eff === 'cinematic-lighting';

      const refract = (px: number, py: number): { x: number; y: number } => {
        if (eff === 'refraction') {
          return {
            x: px + Math.sin(py * 0.02 + seed) * 8,
            y: py + Math.cos(px * 0.02 + seed) * 8,
          };
        }
        return { x: px, y: py };
      };

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const visiblePoints = normalized.slice(0, visibleCount);
      const segStep = Math.max(1, Math.floor(visiblePoints.length / 200));

      // ── Geometry-specific rendering parameters ──
      const isThinLines = geometry === 'lines';
      const isWideRibbon = geometry === 'ribbon' || geometry === 'mobius';
      const isDoubleHelix = geometry === 'helix' || geometry === 'torus-knot';
      const isNetwork = geometry === 'network';
      const isPolygons = geometry === 'polygons';
      const thicknessMul = isThinLines ? 0.35 : isWideRibbon ? 2.2 : isNetwork ? 0.6 : 1.0;

        // ════════════════════════════════════════════════════════════
        // INTERLEAVED: shadow + main line per segment
        // Each segment's shadow falls on previous segments → depth at crossings
        // ════════════════════════════════════════════════════════════
        for (let i = 0; i < visiblePoints.length - 1; i += segStep) {
          const p0 = refract(centerX + visiblePoints[i].x * scale, centerY + visiblePoints[i].y * scale);
          const p1 = refract(centerX + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].x * scale, centerY + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].y * scale);

          // ── Value-based color (log scale for spread) ──
          const maxVal = Math.max(1, stats.maxValue);
          const rawT = visiblePoints[i].value / maxVal;
          const valT = Math.min(1, Math.log(1 + rawT * 9) / Math.log(10)); // log scale 0→1
          const lineCol = mapValueToColor(valT, c1, c2, c3);

          // ── Distance-based brightness fade (center → edges) ──
          const midX = (p0.x + p1.x) * 0.5;
          const midY = (p0.y + p1.y) * 0.5;
          const distFromCenter = Math.hypot(midX - focalX, midY - focalY);
          const maxDist = Math.hypot(viewWidth, viewHeight) * 0.5;
          const distFade = 1 - Math.min(1, distFromCenter / maxDist) * 0.4;

          // ── Energy fade: peaks bright, valleys dim ──
          const energyFade = 0.5 + valT * 0.5;

          // ── Variable thickness: thick peaks, thin valleys ──
          const thickMul = (0.8 + valT * 0.7) * thicknessMul;

          // ── Shadow of this segment ──
          if (shadowOn) {
            const shCol = darkenColor(lineCol, 0.3);
            ctx.save();
            ctx.shadowBlur = shBlur;
            ctx.shadowColor = rgbStr(shCol, shAlpha);
            ctx.shadowOffsetX = shOffX;
            ctx.shadowOffsetY = shOffY;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = rgbStr(shCol, shAlpha);
            ctx.lineWidth = lw * thickMul * 1.8 * densityScale;
            ctx.stroke();
            ctx.restore();
          }

          // ── Main metallic line segment ──
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const angle = Math.atan2(dy, dx);

          const highlight = (Math.sin(angle * 2 + time * 0.0003) * 0.5 + 0.5);
          const specCol: [number, number, number] = [
            Math.min(255, lineCol[0] + highlight * 80),
            Math.min(255, lineCol[1] + highlight * 60),
            Math.min(255, lineCol[2] + highlight * 40),
          ];

          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);
          const halfW = lw * 0.7;

          const grad = ctx.createLinearGradient(
            p0.x + perpX * halfW, p0.y + perpY * halfW,
            p0.x - perpX * halfW, p0.y - perpY * halfW,
          );
          grad.addColorStop(0, rgbStr(specCol, 0.5 * distFade * energyFade));
          grad.addColorStop(0.35, rgbStr(specCol, 0.9 * distFade * energyFade));
          grad.addColorStop(0.5, rgbStr(lineCol, 1 * distFade * energyFade));
          grad.addColorStop(0.65, rgbStr(specCol, 0.9 * distFade * energyFade));
          grad.addColorStop(1, rgbStr(specCol, 0.5 * distFade * energyFade));

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = lw * thickMul * 1.2 * densityScale;

          // ── Soft glow on every line (subtle emission) ──
          ctx.shadowBlur = isGlowEffect
            ? (eff === 'glow' ? 24 : eff === 'bloom' ? 16 : 14)
            : 6;
          ctx.shadowColor = isGlowEffect ? colors.glow : rgbStr(lineCol, 0.4);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // ── GEOMETRY-SPECIFIC: Double helix / twisted line overlay ──
        if (isDoubleHelix) {
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.lineCap = 'round';
          const maxDist2 = Math.hypot(viewWidth, viewHeight) * 0.5;
          for (let i = 0; i < visiblePoints.length - 1; i += segStep) {
            const p0 = refract(centerX + visiblePoints[i].x * scale, centerY + visiblePoints[i].y * scale);
            const p1 = refract(centerX + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].x * scale, centerY + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].y * scale);
            const maxVal = Math.max(1, stats.maxValue);
            const rawT = visiblePoints[i].value / maxVal;
            const valT = Math.min(1, Math.log(1 + rawT * 9) / Math.log(10));
            const lineCol = mapValueToColor(valT, c1, c2, c3);
            const midX2 = (p0.x + p1.x) * 0.5;
            const midY2 = (p0.y + p1.y) * 0.5;
            const distFade2 = 1 - Math.min(1, Math.hypot(midX2 - focalX, midY2 - focalY) / maxDist2) * 0.4;
            const wave = Math.sin(i * 0.15 + time * 0.001) * 6;
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            const perpX = -Math.sin(Math.atan2(dy, dx));
            const perpY = Math.cos(Math.atan2(dy, dx));
            ctx.beginPath();
            ctx.moveTo(p0.x + perpX * wave, p0.y + perpY * wave);
            ctx.lineTo(p1.x + perpX * wave, p1.y + perpY * wave);
            ctx.strokeStyle = rgbStr(lineCol, 0.6 * distFade2);
            ctx.lineWidth = lw * 0.4 * densityScale;
            ctx.shadowBlur = 8;
            ctx.shadowColor = rgbStr(lineCol, 0.3);
            ctx.stroke();
          }
          ctx.restore();
        }

        // ── GEOMETRY-SPECIFIC: Network dots at crossings ──
        if (isNetwork) {
          ctx.save();
          for (let i = 0; i < visiblePoints.length; i += Math.max(1, Math.floor(visiblePoints.length / 60))) {
            const point = visiblePoints[i];
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            const maxVal = Math.max(1, stats.maxValue);
            const rawT = point.value / maxVal;
            const valT = Math.min(1, Math.log(1 + rawT * 9) / Math.log(10));
            const ptCol = mapValueToColor(valT, c1, c2, c3);
            const radius = 2.5 + valT * 3;
            ctx.beginPath();
            ctx.arc(r.x, r.y, radius * densityScale, 0, Math.PI * 2);
            ctx.fillStyle = rgbStr(ptCol, 0.8);
            ctx.shadowBlur = 10;
            ctx.shadowColor = rgbStr(ptCol, 0.5);
            ctx.fill();
          }
          ctx.restore();
        }

        // ── GEOMETRY-SPECIFIC: Polygon fill between segments ──
        if (isPolygons && visiblePoints.length > 2) {
          ctx.save();
          ctx.globalAlpha = 0.12;
          for (let i = 0; i < visiblePoints.length - 2; i += Math.max(1, Math.floor(segStep * 2))) {
            const pA = refract(centerX + visiblePoints[i].x * scale, centerY + visiblePoints[i].y * scale);
            const pB = refract(centerX + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].x * scale, centerY + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].y * scale);
            const pC = refract(centerX + visiblePoints[Math.min(i + segStep * 2, visiblePoints.length - 1)].x * scale, centerY + visiblePoints[Math.min(i + segStep * 2, visiblePoints.length - 1)].y * scale);
            const maxVal = Math.max(1, stats.maxValue);
            const rawT = visiblePoints[i].value / maxVal;
            const valT = Math.min(1, Math.log(1 + rawT * 9) / Math.log(10));
            const triCol = mapValueToColor(valT, c1, c2, c3);
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.lineTo(pC.x, pC.y);
            ctx.closePath();
            ctx.fillStyle = rgbStr(triCol, 0.5);
            ctx.fill();
          }
          ctx.restore();
        }

        // ── Point shadows (interleaved, every 3rd point) ──
        if (shadowOn) {
          ctx.save();
          ctx.shadowBlur = shBlur;
          ctx.shadowOffsetX = shOffX;
          ctx.shadowOffsetY = shOffY;
          for (let i = 0; i < visiblePoints.length; i += 3) {
            const point = visiblePoints[i];
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            const maxVal = Math.max(1, stats.maxValue);
            const rawT = point.value / maxVal;
            const t = Math.min(1, Math.log(1 + rawT * 9) / Math.log(10));
            const baseR = ps * 0.53 + t * ps * 1.33 + (animating ? pulse * 0.3 : 0);
            const ptCol = mapValueToColor(t, c1, c2, c3);
            const shCol = darkenColor(ptCol, 0.3);
            ctx.beginPath();
            ctx.arc(r.x, r.y, Math.max(0.1, baseR * 1.2 * densityScale), 0, Math.PI * 2);
            ctx.fillStyle = rgbStr(shCol, shAlpha);
            ctx.shadowColor = rgbStr(shCol, shAlpha);
            ctx.fill();
          }
          ctx.restore();
        }

        // ── BLOOM OUTER GLOW ──
        if (eff === 'bloom') {
          const bloomGrad = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
          bloomGrad.addColorStop(0, colors.start);
          bloomGrad.addColorStop(0.5, colors.glow);
          bloomGrad.addColorStop(1, colors.end);
          ctx.beginPath();
          visiblePoints.forEach((point, index) => {
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            if (index === 0) ctx.moveTo(r.x, r.y);
            else ctx.lineTo(r.x, r.y);
          });
          ctx.strokeStyle = bloomGrad;
          ctx.lineWidth = lw * 3.2 * densityScale;
          ctx.globalAlpha = 0.15;
          ctx.shadowBlur = 40;
          ctx.shadowColor = colors.glow;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        // ── LINE CROSSING: additive blend ──
        if (visiblePoints.length > 10) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.08;
          ctx.beginPath();
          visiblePoints.forEach((point, index) => {
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            if (index === 0) ctx.moveTo(r.x, r.y);
            else ctx.lineTo(r.x, r.y);
          });
          ctx.strokeStyle = colors.glow;
          ctx.lineWidth = lw * 0.6 * densityScale;
          ctx.stroke();
          ctx.restore();
        }

        // ── REFLECTION: mirror below ──
        if (eff === 'reflection') {
          const reflGrad = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
          reflGrad.addColorStop(0, colors.start);
          reflGrad.addColorStop(0.5, colors.glow);
          reflGrad.addColorStop(1, colors.end);
          ctx.save();
          ctx.translate(0, viewHeight);
          ctx.scale(1, -1);
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          visiblePoints.forEach((point, index) => {
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            if (index === 0) ctx.moveTo(r.x, r.y);
            else ctx.lineTo(r.x, r.y);
          });
          ctx.strokeStyle = reflGrad;
          ctx.lineWidth = lw * 0.8 * densityScale;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }

      // ── POINTS PASS 2: metallic dots on top ──
      normalized.slice(0, visibleCount).forEach((point, index) => {
        const r = refract(centerX + point.x * scale, centerY + point.y * scale);
        const maxVal = Math.max(1, stats.maxValue);
        const rawT = point.value / maxVal;
        const t = Math.min(1, Math.log(1 + rawT * 9) / Math.log(10));
        const baseRadius = ps * 0.53 + t * ps * 1.33;
        const finalRadius = Math.max(0.1, (baseRadius + (animating ? pulse * 0.3 : 0)) * densityScale);

        const col = mapValueToColor(t, c1, c2, c3);
        const spec = (Math.sin(index * 0.7 + time * 0.0004) * 0.5 + 0.5);

        // Distance-based brightness fade
        const distFromCenter = Math.hypot(r.x - focalX, r.y - focalY);
        const maxDist = Math.hypot(viewWidth, viewHeight) * 0.5;
        const distFade = 1 - Math.min(1, distFromCenter / maxDist) * 0.4;

        const ptGrad = ctx.createRadialGradient(
          r.x - finalRadius * 0.3, r.y - finalRadius * 0.3, 0,
          r.x, r.y, finalRadius,
        );
        ptGrad.addColorStop(0, rgbStr([
          Math.min(255, col[0] + spec * 100),
          Math.min(255, col[1] + spec * 80),
          Math.min(255, col[2] + spec * 60),
        ], distFade));
        ptGrad.addColorStop(0.5, rgbStr(col, 0.9 * distFade));
        ptGrad.addColorStop(1, rgbStr(col, 0.5 * distFade));

        ctx.beginPath();
        ctx.arc(r.x, r.y, finalRadius, 0, Math.PI * 2);
        ctx.fillStyle = ptGrad;
        if (isGlowEffect) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = colors.glow;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });

      // ── TRACER: glowing leading point ──
      if (visibleCount > 0 && visibleCount < normalized.length) {
        const tracerPoint = normalized[visibleCount - 1];
        const tx = centerX + tracerPoint.x * scale;
        const ty = centerY + tracerPoint.y * scale;
        ctx.beginPath();
        ctx.arc(tx, ty, 5 + pulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.glow;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── NOISE TEXTURE overlay (reuses offscreen canvas) ──
      if (noiseCtx) {
        const noiseW = Math.ceil(canvas.width / 4);
        const noiseH = Math.ceil(canvas.height / 4);
        if (noiseCanvas.width !== noiseW || noiseCanvas.height !== noiseH) {
          noiseCanvas.width = noiseW;
          noiseCanvas.height = noiseH;
          noiseImgData = noiseCtx.createImageData(noiseW, noiseH);
          noiseCachedW = noiseW;
          noiseCachedH = noiseH;
        }
        if (!noiseImgData || noiseCachedW !== noiseW || noiseCachedH !== noiseH) {
          noiseImgData = noiseCtx.createImageData(noiseW, noiseH);
          noiseCachedW = noiseW;
          noiseCachedH = noiseH;
        }
        const noiseAmount = eff === 'fog' ? 8 : 4;
        const data = noiseImgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = (Math.random() - 0.5) * noiseAmount;
          data[i] = 128 + v;
          data[i + 1] = 128 + v;
          data[i + 2] = 128 + v;
          data[i + 3] = 255;
        }
        noiseCtx.putImageData(noiseImgData, 0, 0);
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.06;
        ctx.drawImage(noiseCanvas, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    };

    let animFrame = 0;
    const animate = (time: number) => {
      if (disposed) return;
      drawFrame(time);
      animFrame = window.requestAnimationFrame(animate);
    };
    animFrame = window.requestAnimationFrame(animate);

    const handleResize = () => { syncSize(); drawFrame(performance.now()); };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => { syncSize(); drawFrame(performance.now()); });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (mosaicRef.current) {
        disposeMosaic(mosaicRef.current);
        mosaicRef.current = null;
      }
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, seed, steps, engine, grid, geometry, effect, backgroundMode, customColors]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
