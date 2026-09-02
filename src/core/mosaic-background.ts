// ─────────────────────────────────────────────────────────────────────────────
// Mosaic Background — Animated grid cells colored by proximity to artwork points
// Lightweight Canvas 2D implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface MosaicConfig {
  cols: number;
  rows: number;
  pulseSpeed: number;
  colorMix: number;
}

export interface MosaicState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  grid: Float32Array;
  pointInfluence: Float32Array;
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function createMosaicState(w: number, h: number, cols: number, rows: number): MosaicState {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return {
    canvas,
    ctx,
    cols,
    rows,
    cellW: w / cols,
    cellH: h / rows,
    grid: new Float32Array(cols * rows),
    pointInfluence: new Float32Array(cols * rows),
  };
}

export function updateMosaicInfluence(
  state: MosaicState,
  points: Array<{ x: number; y: number }>,
  viewW: number,
  viewH: number,
  focalX: number,
  focalY: number,
  scale: number,
): void {
  const { cols, rows, cellW, cellH, pointInfluence } = state;
  pointInfluence.fill(0);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cellW;
      const cy = (r + 0.5) * cellH;
      let maxInfluence = 0;
      for (const p of points) {
        const px = focalX + p.x * scale;
        const py = focalY + p.y * scale;
        const dist = Math.hypot(cx - px, cy - py);
        const inf = Math.max(0, 1 - dist / (Math.min(viewW, viewH) * 0.25));
        if (inf > maxInfluence) maxInfluence = inf;
      }
      pointInfluence[r * cols + c] = maxInfluence;
    }
  }
}

export function drawMosaic(
  state: MosaicState,
  colors: { start: string; glow: string; end: string; bg: string },
  time: number,
  pulseSpeed: number,
): void {
  const { ctx, cols, rows, cellW, cellH, pointInfluence } = state;
  const w = state.canvas.width;
  const h = state.canvas.height;

  const c1 = parseHex(colors.start);
  const c2 = parseHex(colors.glow);
  const c3 = parseHex(colors.end);
  const bg = parseHex(colors.bg);

  ctx.clearRect(0, 0, w, h);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const inf = pointInfluence[idx];
      const pulse = Math.sin(time * 0.001 * pulseSpeed + c * 0.3 + r * 0.2) * 0.5 + 0.5;

      const t = (c / cols + r / rows) * 0.5;
      let cellColor: [number, number, number];
      if (t < 0.33) {
        cellColor = lerpColor(c1, c2, t / 0.33);
      } else if (t < 0.66) {
        cellColor = lerpColor(c2, c3, (t - 0.33) / 0.33);
      } else {
        cellColor = lerpColor(c3, c1, (t - 0.66) / 0.34);
      }

      const alpha = 0.03 + inf * 0.15 + pulse * 0.02;
      const finalColor = lerpColor(bg, cellColor, alpha);

      ctx.fillStyle = `rgba(${Math.round(finalColor[0])},${Math.round(finalColor[1])},${Math.round(finalColor[2])},${0.6 + inf * 0.4})`;
      ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
    }
  }
}

export function disposeMosaic(state: MosaicState): void {
  state.canvas.remove();
}
