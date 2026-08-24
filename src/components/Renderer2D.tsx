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
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function Renderer2D({ seed, steps, palette, engine, grid, geometry, effect, animationSpeed, isAnimating, onCanvasReady }: Renderer2DProps) {
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
    canvas.className = 'h-full w-full';
    canvas.style.display = 'block';
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

    const { points, stats } = buildArtwork(seed, steps, engine, grid);
    const normalized = normalizeArtwork(points);
    const colors = getPalette(palette);

    let drawStart = -1;
    const drawDuration = 8000;

    const drawFrame = (time: number) => {
      const { speed, animating } = animationStateRef.current;
      const pulse = animating ? Math.sin(time * 0.001 * speed + seed) : 0;

      if (drawStart < 0) drawStart = time;
      const drawProgress = Math.min(1, (time - drawStart) / drawDuration);
      const easedDraw = drawProgress < 0.5
        ? 2 * drawProgress * drawProgress
        : -1 + (4 - 2 * drawProgress) * drawProgress;
      const visibleCount = Math.floor(easedDraw * normalized.length);

      ctx.clearRect(0, 0, viewWidth, viewHeight);
      const bg = ctx.createRadialGradient(viewWidth * 0.5, viewHeight * 0.5, 15, viewWidth * 0.5, viewHeight * 0.5, Math.max(viewWidth, viewHeight));
      bg.addColorStop(0, colors.bg);
      bg.addColorStop(0.38, colors.start);
      bg.addColorStop(1, '#02050b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      for (let index = 0; index < 160; index += 1) {
        const x = ((Math.sin(index * 19.17 + seed) * 0.5 + 0.5) * viewWidth);
        const y = ((Math.cos(index * 13.71 + seed) * 0.5 + 0.5) * viewHeight);
        const radius = 0.8 + ((index % 5) / 6) + (pulse * 0.6);
        ctx.beginPath();
        ctx.fillStyle = effect === 'glow' ? 'rgba(200, 240, 255, 0.7)' : 'rgba(120, 160, 220, 0.45)';
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const centerX = viewWidth / 2 + Math.sin(pulse + seed) * 14;
      const centerY = viewHeight / 2 + Math.cos(pulse * 1.7 + seed * 0.3) * 12;
      const scale = Math.min(viewWidth, viewHeight) * 0.34;
      const gradient = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
      gradient.addColorStop(0, colors.start);
      gradient.addColorStop(0.5, colors.glow);
      gradient.addColorStop(1, colors.end);

      if (geometry !== 'particles') {
        ctx.beginPath();
        const visiblePoints = normalized.slice(0, visibleCount);
        visiblePoints.forEach((point, index) => {
          const x = centerX + point.x * scale * (1 + pulse * 0.1);
          const y = centerY + point.y * scale * (1 + pulse * 0.1);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = gradient;
        ctx.lineWidth = geometry === 'lines' ? 3.4 : 2.5;
        ctx.shadowBlur = effect === 'glow' ? 28 : 14;
        ctx.shadowColor = colors.glow;
        ctx.stroke();
      }

      normalized.slice(0, visibleCount).forEach((point, index) => {
        const x = centerX + point.x * scale * (1 + pulse * 0.2);
        const y = centerY + point.y * scale * (1 + pulse * 0.2);
        const radius = geometry === 'particles' ? 1.8 + (point.value / Math.max(1, stats.maxValue)) * 3.4 : 1.6 + (point.value / Math.max(1, stats.maxValue)) * 4.0;
        ctx.fillStyle = index === 0 ? '#ffd166' : effect === 'glow' ? '#e8faff' : '#c9dcff';
        ctx.beginPath();
        ctx.arc(x, y, radius + (animating ? pulse * 2 : 0), 0, Math.PI * 2);
        ctx.fill();
      });

      if (visibleCount > 0 && visibleCount < normalized.length) {
        const tracerPoint = normalized[visibleCount - 1];
        const tx = centerX + tracerPoint.x * scale * (1 + pulse * 0.2);
        const ty = centerY + tracerPoint.y * scale * (1 + pulse * 0.2);
        ctx.beginPath();
        ctx.arc(tx, ty, 5 + pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = colors.accent;
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.glow;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    let animFrame = 0;
    const animate = (time: number) => {
      drawFrame(time);
      animFrame = window.requestAnimationFrame(animate);
    };
    animFrame = window.requestAnimationFrame(animate);

    const handleResize = () => { syncSize(); drawFrame(performance.now()); };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => { syncSize(); drawFrame(performance.now()); });
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(animFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, seed, steps, engine, grid, geometry, effect]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
