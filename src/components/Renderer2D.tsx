import { useEffect, useRef } from 'react';
import type { GeometryMode, EffectMode } from '../domain/types';
import { buildArtwork, getPalette, normalizeArtwork, type GeneratorEngine, type PaletteKey, type SpatialGrid } from '../lib/math';

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
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function Renderer2D({ seed, steps, palette, engine, grid, geometry, effect, animationSpeed, isAnimating, customColors, lineWidth = 2.5, pointSize = 3, onCanvasReady }: Renderer2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationStateRef = useRef({ speed: animationSpeed, animating: isAnimating });

  useEffect(() => {
    animationStateRef.current.speed = animationSpeed;
    animationStateRef.current.animating = isAnimating;
  }, [animationSpeed, isAnimating]);

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

    let disposed = false;

    const { points, stats } = buildArtwork(seed, steps, engine, grid);
    const normalized = normalizeArtwork(points);
    const paletteColors = getPalette(palette);
    const colors = customColors
      ? { ...paletteColors, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : paletteColors;

    let drawStart = -1;
    const drawDuration = 8000;

    const drawFrame = (time: number) => {
      const { speed, animating } = animationStateRef.current;

      if (drawStart < 0) drawStart = time;
      const drawProgress = Math.min(1, (time - drawStart) / drawDuration);
      const easedDraw = drawProgress < 0.5
        ? 2 * drawProgress * drawProgress
        : -1 + (4 - 2 * drawProgress) * drawProgress;
      const visibleCount = Math.floor(easedDraw * normalized.length);
      const isRevealing = drawProgress < 1;
      const pulse = (animating && isRevealing) ? Math.sin(time * 0.0005 * speed + seed) * (1 - easedDraw) : 0;

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      const bg = ctx.createRadialGradient(viewWidth * 0.5, viewHeight * 0.5, 15, viewWidth * 0.5, viewHeight * 0.5, Math.max(viewWidth, viewHeight));
      bg.addColorStop(0, colors.bg);
      bg.addColorStop(0.38, colors.start);
      bg.addColorStop(1, '#02050b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // ── Effect-specific: fog overlay ──
      if (effect === 'fog') {
        ctx.fillStyle = `rgba(0, 0, 0, 0.15)`;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      // ── Effect-specific: depth vignette ──
      if (effect === 'depth') {
        const vig = ctx.createRadialGradient(viewWidth * 0.5, viewHeight * 0.5, viewWidth * 0.2, viewWidth * 0.5, viewHeight * 0.5, viewWidth * 0.7);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      // ── Effect-specific: cinematic strong gradient overlay ──
      if (effect === 'cinematic-lighting') {
        const cin = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
        cin.addColorStop(0, 'rgba(0,0,0,0.3)');
        cin.addColorStop(0.5, 'rgba(0,0,0,0)');
        cin.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = cin;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      for (let index = 0; index < 160; index += 1) {
        const x = ((Math.sin(index * 19.17 + seed) * 0.5 + 0.5) * viewWidth);
        const y = ((Math.cos(index * 13.71 + seed) * 0.5 + 0.5) * viewHeight);
        const radius = 0.8 + ((index % 5) / 6) + (pulse * 0.2);
        ctx.beginPath();
        ctx.fillStyle =
          effect === 'glow' ? 'rgba(200, 240, 255, 0.7)' :
          effect === 'bloom' ? 'rgba(255, 220, 180, 0.5)' :
          effect === 'fog' ? 'rgba(100, 120, 160, 0.25)' :
          effect === 'depth' ? 'rgba(140, 160, 200, 0.35)' :
          effect === 'cinematic-lighting' ? 'rgba(255, 200, 150, 0.6)' :
          'rgba(120, 160, 220, 0.45)';
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const centerX = viewWidth / 2 + Math.sin(pulse + seed) * 6;
      const centerY = viewHeight / 2 + Math.cos(pulse * 0.7 + seed * 0.3) * 5;
      const scale = Math.min(viewWidth, viewHeight) * 0.44;

      // ── Effect-specific: refraction distortion ──
      const refract = (px: number, py: number): { x: number; y: number } => {
        if (effect === 'refraction') {
          return {
            x: px + Math.sin(py * 0.02 + seed) * 8,
            y: py + Math.cos(px * 0.02 + seed) * 8,
          };
        }
        return { x: px, y: py };
      };

      const gradient = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
      gradient.addColorStop(0, colors.start);
      gradient.addColorStop(0.5, colors.glow);
      gradient.addColorStop(1, colors.end);

      if (geometry !== 'trail') {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const visiblePoints = normalized.slice(0, visibleCount);

        // ── Effect: bloom — draw line twice (outer glow + core) ──
        if (effect === 'bloom') {
          ctx.beginPath();
          visiblePoints.forEach((point, index) => {
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            if (index === 0) ctx.moveTo(r.x, r.y);
            else ctx.lineTo(r.x, r.y);
          });
          ctx.strokeStyle = gradient;
          ctx.lineWidth = lineWidth * 3.2;
          ctx.globalAlpha = 0.15;
          ctx.shadowBlur = 40;
          ctx.shadowColor = colors.glow;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        // ── Main line ──
        ctx.beginPath();
        visiblePoints.forEach((point, index) => {
          const r = refract(centerX + point.x * scale, centerY + point.y * scale);
          if (index === 0) ctx.moveTo(r.x, r.y);
          else ctx.lineTo(r.x, r.y);
        });
        ctx.strokeStyle = gradient;
        ctx.lineWidth = geometry === 'lines' ? lineWidth * 1.36 : lineWidth;
        ctx.shadowBlur =
          effect === 'glow' ? 28 :
          effect === 'bloom' ? 20 :
          effect === 'cinematic-lighting' ? 18 :
          effect === 'fog' ? 6 : 14;
        ctx.shadowColor = colors.glow;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // ── Effect: reflection — mirror below ──
        if (effect === 'reflection') {
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
          ctx.strokeStyle = gradient;
          ctx.lineWidth = lineWidth * 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      normalized.slice(0, visibleCount).forEach((point, index) => {
        const r = refract(centerX + point.x * scale, centerY + point.y * scale);
        const baseRadius = pointSize * 0.53 + (point.value / Math.max(1, stats.maxValue)) * pointSize * 1.33;
        const finalRadius = Math.max(0.1, baseRadius + (animating ? pulse * 0.3 : 0));
        const t = Math.min(1, point.value / Math.max(1, stats.maxValue));
        if (index === 0) {
          ctx.fillStyle = '#ffd166';
        } else {
          const parseHex = (hex: string) => {
            const n = parseInt(hex.replace('#', ''), 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
          };
          const [r1, g1, b1] = parseHex(colors.start);
          const [r2, g2, b2] = parseHex(colors.glow);
          const [r3, g3, b3] = parseHex(colors.end);
          const lr = t < 0.5 ? r1 + (r2 - r1) * t * 2 : r2 + (r3 - r2) * (t - 0.5) * 2;
          const lg = t < 0.5 ? g1 + (g2 - g1) * t * 2 : g2 + (g3 - g2) * (t - 0.5) * 2;
          const lb = t < 0.5 ? b1 + (b2 - b1) * t * 2 : b2 + (b3 - b2) * (t - 0.5) * 2;
          ctx.fillStyle = `rgb(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)})`;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, finalRadius, 0, Math.PI * 2);
        ctx.fill();
      });

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
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, seed, steps, engine, grid, geometry, effect, customColors?.[0], customColors?.[1], customColors?.[2], lineWidth, pointSize]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
