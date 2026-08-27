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
  shadowIntensity?: number;
  shadowDirection?: number;
  shadowSoftness?: number;
  lightAngle?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function Renderer2D({ seed, steps, palette, engine, grid, geometry, effect, animationSpeed, isAnimating, customColors, lineWidth = 2.5, pointSize = 3, shadowIntensity = 4, shadowDirection = 135, shadowSoftness = 2, lightAngle = 45, onCanvasReady }: Renderer2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationStateRef = useRef({ speed: animationSpeed, animating: isAnimating, shIntensity: shadowIntensity, shDirection: shadowDirection, shSoftness: shadowSoftness, lightAngle });

  useEffect(() => {
    animationStateRef.current.speed = animationSpeed;
    animationStateRef.current.animating = isAnimating;
    animationStateRef.current.shIntensity = shadowIntensity;
    animationStateRef.current.shDirection = shadowDirection;
    animationStateRef.current.shSoftness = shadowSoftness;
    animationStateRef.current.lightAngle = lightAngle;
  }, [animationSpeed, isAnimating, shadowIntensity, shadowDirection, shadowSoftness, lightAngle]);

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

    let disposed = false;

    const { points, stats } = buildArtwork(seed, steps, engine, grid);
    const normalized = normalizeArtwork(points);
    const paletteColors = getPalette(palette);
    const colors = customColors
      ? { ...paletteColors, start: customColors[0], glow: customColors[1], end: customColors[2] }
      : paletteColors;

    let drawStart = -1;
    const drawDuration = 8000;

    const parseHex = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
    };

    const lerpColor3 = (
      c1: readonly [number, number, number],
      c2: readonly [number, number, number],
      c3: readonly [number, number, number],
      t: number,
    ): [number, number, number] => {
      if (t < 0.5) {
        const u = t * 2;
        return [
          c1[0] + (c2[0] - c1[0]) * u,
          c1[1] + (c2[1] - c1[1]) * u,
          c1[2] + (c2[2] - c1[2]) * u,
        ];
      }
      const u = (t - 0.5) * 2;
      return [
        c2[0] + (c3[0] - c2[0]) * u,
        c2[1] + (c3[1] - c2[1]) * u,
        c2[2] + (c3[2] - c2[2]) * u,
      ];
    };

    const rgbStr = (c: [number, number, number], a = 1) =>
      `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

    const cStart = parseHex(colors.start);
    const cGlow = parseHex(colors.glow);
    const cEnd = parseHex(colors.end);

    const drawFrame = (time: number) => {
      const { speed, animating, shIntensity, shDirection, shSoftness, lightAngle: lAngle } = animationStateRef.current;

      if (drawStart < 0) drawStart = time;
      const drawProgress = Math.min(1, (time - drawStart) / drawDuration);
      const easedDraw = drawProgress < 0.5
        ? 2 * drawProgress * drawProgress
        : -1 + (4 - 2 * drawProgress) * drawProgress;
      const visibleCount = Math.floor(easedDraw * normalized.length);
      const isRevealing = drawProgress < 1;
      const pulse = (animating && isRevealing) ? Math.sin(time * 0.0005 * speed + seed) * (1 - easedDraw) : 0;

      ctx.clearRect(0, 0, viewWidth, viewHeight);

      // ── Background gradient ──
      const bg = ctx.createRadialGradient(viewWidth * 0.5, viewHeight * 0.5, 15, viewWidth * 0.5, viewHeight * 0.5, Math.max(viewWidth, viewHeight));
      bg.addColorStop(0, colors.bg);
      bg.addColorStop(0.38, colors.start);
      bg.addColorStop(1, colors.bg);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      // ── Effect overlays ──
      if (effect === 'fog') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }
      if (effect === 'depth') {
        const vig = ctx.createRadialGradient(viewWidth * 0.5, viewHeight * 0.5, viewWidth * 0.2, viewWidth * 0.5, viewHeight * 0.5, viewWidth * 0.7);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }
      if (effect === 'cinematic-lighting') {
        const cin = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
        cin.addColorStop(0, 'rgba(0,0,0,0.3)');
        cin.addColorStop(0.5, 'rgba(0,0,0,0)');
        cin.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = cin;
        ctx.fillRect(0, 0, viewWidth, viewHeight);
      }

      // ── Ambient particles (palette-driven) ──
      const particleAlpha =
        effect === 'glow' ? 0.7 :
        effect === 'bloom' ? 0.5 :
        effect === 'fog' ? 0.25 :
        effect === 'depth' ? 0.35 :
        effect === 'cinematic-lighting' ? 0.6 :
        0.45;
      const particleT =
        effect === 'glow' ? 0.8 :
        effect === 'bloom' ? 0.3 :
        effect === 'fog' ? 0.5 :
        effect === 'depth' ? 0.4 :
        effect === 'cinematic-lighting' ? 0.2 :
        0.5;
      const pCol = lerpColor3(cStart, cGlow, cEnd, particleT);
      for (let index = 0; index < 160; index += 1) {
        const x = ((Math.sin(index * 19.17 + seed) * 0.5 + 0.5) * viewWidth);
        const y = ((Math.cos(index * 13.71 + seed) * 0.5 + 0.5) * viewHeight);
        const radius = 0.8 + ((index % 5) / 6) + (pulse * 0.2);
        ctx.beginPath();
        ctx.fillStyle = rgbStr(pCol, particleAlpha);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const centerX = viewWidth / 2 + Math.sin(pulse + seed) * 6;
      const centerY = viewHeight / 2 + Math.cos(pulse * 0.7 + seed * 0.3) * 5;
      const scale = Math.min(viewWidth, viewHeight) * 0.44;

      // ── Shadow params ──
      const shadowOn = shIntensity > 0;
      const shRad = (shDirection * Math.PI) / 180;
      const shDist = shIntensity * 0.6;
      const shOffX = Math.cos(shRad) * shDist;
      const shOffY = Math.sin(shRad) * shDist;
      const shAlpha = 0.3 + (shIntensity / 10) * 0.5;
      // Fix 4: inverted shadow — dark version of palette glow color
      const glowRgb = parseHex(colors.glow);
      const shColor = `rgba(${Math.round(glowRgb[0] * 0.12)},${Math.round(glowRgb[1] * 0.12)},${Math.round(glowRgb[2] * 0.12)},${shAlpha.toFixed(2)})`;
      // Fix 3: shadow width varies with light angle
      const lAngleRad = (lAngle * Math.PI) / 180;
      const shWidthMul = 1.2 + 1.3 * Math.sin(lAngleRad);
      const isGlowEffect = effect === 'glow' || effect === 'bloom' || effect === 'cinematic-lighting';

      const refract = (px: number, py: number): { x: number; y: number } => {
        if (effect === 'refraction') {
          return {
            x: px + Math.sin(py * 0.02 + seed) * 8,
            y: py + Math.cos(px * 0.02 + seed) * 8,
          };
        }
        return { x: px, y: py };
      };

      if (geometry !== 'trail') {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const visiblePoints = normalized.slice(0, visibleCount);
        const segStep = Math.max(1, Math.floor(visiblePoints.length / 200));

        // ════════════════════════════════════════════════════════════
        // INTERLEAVED: shadow + main line per segment
        // Each segment's shadow falls on previous segments → depth at crossings
        // ════════════════════════════════════════════════════════════
        for (let i = 0; i < visiblePoints.length - 1; i += segStep) {
          const p0 = refract(centerX + visiblePoints[i].x * scale, centerY + visiblePoints[i].y * scale);
          const p1 = refract(centerX + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].x * scale, centerY + visiblePoints[Math.min(i + segStep, visiblePoints.length - 1)].y * scale);

          // ── Shadow of this segment (falls on previously drawn content) ──
          if (shadowOn) {
            ctx.save();
            ctx.shadowBlur = shSoftness;
            ctx.shadowColor = shColor;
            ctx.shadowOffsetX = shOffX;
            ctx.shadowOffsetY = shOffY;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = shColor;
            ctx.lineWidth = lineWidth * shWidthMul;
            ctx.stroke();
            ctx.restore();
          }

          // ── Main metallic line segment ──
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const angle = Math.atan2(dy, dx);

          const highlight = (Math.sin(angle * 2 + time * 0.0003) * 0.5 + 0.5);
          const tVal = Math.min(1, i / Math.max(1, visiblePoints.length));
          const baseCol = lerpColor3(cStart, cGlow, cEnd, tVal);
          const specCol: [number, number, number] = [
            Math.min(255, baseCol[0] + highlight * 100),
            Math.min(255, baseCol[1] + highlight * 80),
            Math.min(255, baseCol[2] + highlight * 60),
          ];

          const perpX = -Math.sin(angle);
          const perpY = Math.cos(angle);
          const halfW = lineWidth * 0.7;

          const grad = ctx.createLinearGradient(
            p0.x + perpX * halfW, p0.y + perpY * halfW,
            p0.x - perpX * halfW, p0.y - perpY * halfW,
          );
          grad.addColorStop(0, rgbStr(specCol, 0.6));
          grad.addColorStop(0.35, rgbStr(specCol, 1));
          grad.addColorStop(0.5, rgbStr(baseCol, 1));
          grad.addColorStop(0.65, rgbStr(specCol, 1));
          grad.addColorStop(1, rgbStr(specCol, 0.6));

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = lineWidth * 1.2;

          if (isGlowEffect) {
            ctx.shadowBlur = effect === 'glow' ? 24 : effect === 'bloom' ? 16 : 14;
            ctx.shadowColor = colors.glow;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // ── Point shadows (interleaved, every 3rd point) ──
        if (shadowOn) {
          ctx.save();
          ctx.shadowBlur = shSoftness;
          ctx.shadowColor = shColor;
          ctx.shadowOffsetX = shOffX;
          ctx.shadowOffsetY = shOffY;
          for (let i = 0; i < visiblePoints.length; i += 3) {
            const point = visiblePoints[i];
            const r = refract(centerX + point.x * scale, centerY + point.y * scale);
            const maxVal = Math.max(1, stats.maxValue);
            const t = Math.min(1, point.value / maxVal);
            const baseR = pointSize * 0.53 + t * pointSize * 1.33 + (animating ? pulse * 0.3 : 0);
            ctx.beginPath();
            ctx.arc(r.x, r.y, Math.max(0.1, baseR * 1.6), 0, Math.PI * 2);
            ctx.fillStyle = shColor;
            ctx.fill();
          }
          ctx.restore();
        }

        // ── BLOOM OUTER GLOW ──
        if (effect === 'bloom') {
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
          ctx.lineWidth = lineWidth * 3.2;
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
          ctx.lineWidth = lineWidth * 0.6;
          ctx.stroke();
          ctx.restore();
        }

        // ── REFLECTION: mirror below ──
        if (effect === 'reflection') {
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
          ctx.lineWidth = lineWidth * 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // ── POINTS PASS 2: metallic dots on top ──
      normalized.slice(0, visibleCount).forEach((point, index) => {
        const r = refract(centerX + point.x * scale, centerY + point.y * scale);
        const maxVal = Math.max(1, stats.maxValue);
        const t = Math.min(1, point.value / maxVal);
        const baseRadius = pointSize * 0.53 + t * pointSize * 1.33;
        const finalRadius = Math.max(0.1, baseRadius + (animating ? pulse * 0.3 : 0));

        const col = lerpColor3(cStart, cGlow, cEnd, t);
        const spec = (Math.sin(index * 0.7 + time * 0.0004) * 0.5 + 0.5);
        const ptGrad = ctx.createRadialGradient(
          r.x - finalRadius * 0.3, r.y - finalRadius * 0.3, 0,
          r.x, r.y, finalRadius,
        );
        ptGrad.addColorStop(0, rgbStr([
          Math.min(255, col[0] + spec * 120),
          Math.min(255, col[1] + spec * 100),
          Math.min(255, col[2] + spec * 80),
        ], 1));
        ptGrad.addColorStop(0.5, rgbStr(col, 1));
        ptGrad.addColorStop(1, rgbStr(col, 0.6));

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
        }
        const noiseAmount = effect === 'fog' ? 8 : 4;
        const imgData = noiseCtx.createImageData(noiseW, noiseH);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const v = (Math.random() - 0.5) * noiseAmount;
          data[i] = 128 + v;
          data[i + 1] = 128 + v;
          data[i + 2] = 128 + v;
          data[i + 3] = 255;
        }
        noiseCtx.putImageData(imgData, 0, 0);
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
      canvas.remove();
      if (canvasRef.current === canvas) canvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, seed, steps, engine, grid, geometry, effect, customColors?.[0], customColors?.[1], customColors?.[2], lineWidth, pointSize, shadowIntensity, shadowDirection, shadowSoftness, lightAngle]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
