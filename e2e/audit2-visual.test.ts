import { test, expect, type Page } from '@playwright/test';
import {
  navigateToGenerator,
  setStoredMode,
  setStoredValue,
  snap,
} from './utils/helpers';

const DIR = 'e2e/screenshots/audit2';

// ─── HELPERS ──────────────────────────────────────

async function setStore(page: Page, field: string, value: unknown) {
  await setStoredValue(page, field, value);
}

async function waitRender(page: Page, ms = 4000) {
  await page.waitForTimeout(ms);
}

async function goToSeed(page: Page, seed: number, mode: '2d' | '3d') {
  await page.goto(`/generator?seed=${seed}`, { waitUntil: 'networkidle' });
  await page.evaluate(([m, s]) => {
    localStorage.setItem('i18nextLng', 'it');
    const key = 'mathematic-engine-artwork';
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state.mode = m;
    parsed.state.seed = s;
    localStorage.setItem(key, JSON.stringify(parsed));
  }, [mode, seed] as const);
  await page.reload({ waitUntil: 'networkidle' });
  await waitRender(page, 5000);
}

// ─── REAL FPS MEASUREMENT (requestAnimationFrame delta) ─────────

async function measureFrameTimes(page: Page, durationMs = 8000): Promise<{
  avg: number; min: number; max: number;
  p50: number; p95: number; p99: number;
  frames: number; spikes: number;
  avgFrameTime: number;
}> {
  return page.evaluate((dur) => {
    return new Promise<{
      avg: number; min: number; max: number;
      p50: number; p95: number; p99: number;
      frames: number; spikes: number;
      avgFrameTime: number;
    }>((resolve) => {
      const deltas: number[] = [];
      let raf: number;
      let prev = 0;
      let start = 0;
      const loop = (t: number) => {
        if (start === 0) { start = t; prev = t; }
        if (t - start > dur) {
          cancelAnimationFrame(raf);
          if (deltas.length < 2) return resolve({ avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, frames: 0, spikes: 0, avgFrameTime: 0 });
          const sorted = [...deltas].sort((a, b) => a - b);
          const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          const p = (pct: number) => sorted[Math.floor(sorted.length * pct)] || 0;
          const spikes = deltas.filter(d => d > 33.33).length;
          return resolve({
            avg: Math.round(1000 / (avg || 1)),
            min: Math.round(1000 / (sorted[sorted.length - 1] || 1)),
            max: Math.round(1000 / (sorted[0] || 1)),
            p50: Math.round(1000 / (p(0.5) || 1)),
            p95: Math.round(1000 / (p(0.95) || 1)),
            p99: Math.round(1000 / (p(0.99) || 1)),
            frames: deltas.length,
            spikes,
            avgFrameTime: Math.round(avg * 100) / 100,
          });
        }
        const dt = t - prev;
        if (prev !== 0 && dt > 0 && dt < 200) deltas.push(dt);
        prev = t;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
  }, durationMs);
}

// ─── RENDERER.INFO ────────────────────────────────

async function getRendererInfo(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const fiber = (canvas as any).__reactFiber$;
    if (!fiber) return null;
    // Try to walk up to find the Three.js renderer
    let node = fiber;
    for (let i = 0; i < 20; i++) {
      if (node?.memoizedProps?.renderer) return node.memoizedProps.renderer.info;
      node = node?.return;
    }
    return null;
  });
}

// ─── WEBGL INFO ───────────────────────────────────

async function getWebGLInfo(page: Page): Promise<Record<string, string | number> | null> {
  return page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'unknown',
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        glVersion: gl.getParameter(gl.VERSION),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
        maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
        maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      };
    } catch { return null; }
  });
}

// ═══════════════════════════════════════════════════
// SECTION 2: BASELINE REALE
// ═══════════════════════════════════════════════════

test.describe('2. BASELINE REALE', () => {
  test('WebGL + viewport info', async ({ page }) => {
    await goToSeed(page, 42, '2d');
    const webgl = await getWebGLInfo(page);
    const vp = await page.evaluate(() => ({
      dpr: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenW: screen.width,
      screenH: screen.height,
      canvasW: document.querySelector('canvas')?.width || 0,
      canvasH: document.querySelector('canvas')?.height || 0,
      ua: navigator.userAgent,
    }));
    console.log('═══════════════════════════════════════');
    console.log('BASELINE — WEBGL');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(webgl, null, 2));
    console.log('═══════════════════════════════════════');
    console.log('BASELINE — VIEWPORT');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(vp, null, 2));
    console.log('═══════════════════════════════════════');
    expect(vp.canvasW).toBeGreaterThan(0);
  });

  test('2D FPS measurement', async ({ page }) => {
    await goToSeed(page, 42, '2d');
    await page.evaluate(() => {
      const key = 'mathematic-engine-artwork';
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      parsed.state.engine = 'collatz';
      parsed.state.effect = 'neutral';
      localStorage.setItem(key, JSON.stringify(parsed));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await waitRender(page, 5000);
    const fps = await measureFrameTimes(page, 8000);
    console.log('═══════════════════════════════════════');
    console.log('2D FPS — collatz × neutral × lines');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(fps, null, 2));
    console.log('═══════════════════════════════════════');
    await snap(page, `${DIR}/02-baseline-2d-collatz-neutral`);
  });

  test('3D FPS measurement — tubes × basic × neutral', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await page.evaluate(() => {
      const key = 'mathematic-engine-artwork';
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      parsed.state.engine = 'collatz';
      parsed.state.geometry = 'tubes';
      parsed.state.material = 'basic';
      parsed.state.effect = 'neutral';
      parsed.state.backgroundMode = 'none';
      localStorage.setItem(key, JSON.stringify(parsed));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await waitRender(page, 5000);
    const fps = await measureFrameTimes(page, 8000);
    console.log('═══════════════════════════════════════');
    console.log('3D FPS — collatz × tubes × basic × neutral');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(fps, null, 2));
    console.log('═══════════════════════════════════════');
    await snap(page, `${DIR}/02-baseline-3d-collatz-tubes-basic`);
  });

  test('3D FPS — lorenz × mesh × metallic × bloom', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await page.evaluate(() => {
      const key = 'mathematic-engine-artwork';
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      parsed.state.engine = 'lorenz';
      parsed.state.geometry = 'mesh';
      parsed.state.material = 'metallic';
      parsed.state.effect = 'bloom';
      parsed.state.backgroundMode = 'mosaic';
      localStorage.setItem(key, JSON.stringify(parsed));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await waitRender(page, 5000);
    const fps = await measureFrameTimes(page, 8000);
    console.log('═══════════════════════════════════════');
    console.log('3D FPS — lorenz × mesh × metallic × bloom × mosaic');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(fps, null, 2));
    console.log('═══════════════════════════════════════');
    await snap(page, `${DIR}/02-baseline-3d-lorenz-mesh-metallic-bloom`);
  });

  test('3D FPS — ALL effects ON', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await page.evaluate(() => {
      const key = 'mathematic-engine-artwork';
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      parsed.state.engine = 'collatz';
      parsed.state.geometry = 'tubes';
      parsed.state.material = 'metallic';
      parsed.state.effect = 'cinematic-lighting';
      parsed.state.backgroundMode = 'tunnel';
      parsed.state.fogDensity = 0.5;
      parsed.state.dispersion = 0.5;
      parsed.state.shockwaveIntensity = 0.5;
      parsed.state.dofStrength = 0.5;
      localStorage.setItem(key, JSON.stringify(parsed));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await waitRender(page, 5000);
    const fps = await measureFrameTimes(page, 8000);
    console.log('═══════════════════════════════════════');
    console.log('3D FPS — ALL EFFECTS ON');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(fps, null, 2));
    console.log('═══════════════════════════════════════');
    await snap(page, `${DIR}/02-baseline-3d-all-effects`);
  });
});

// ═══════════════════════════════════════════════════
// SECTION 3: CUSTOM COLOR DEEP TEST
// ═══════════════════════════════════════════════════

const CUSTOM_COLORS_9: Array<[string, string, string, string]> = [
  ['#FF0000', '#00FF00', '#0000FF', 'RGB'],
  ['#FF6600', '#FF00FF', '#00FFFF', 'Secondary'],
  ['#FFFF00', '#FFFFFF', '#111111', 'Extreme'],
  ['#FF1493', '#00CED1', '#FFD700', 'Jewel'],
  ['#8B0000', '#006400', '#00008B', 'Dark'],
  ['#FFA07A', '#98FB98', '#87CEEB', 'Pastel'],
  ['#FF4500', '#FF8C00', '#FFD700', 'Fire'],
  ['#4B0082', '#8B00FF', '#FF1493', 'Purple'],
  ['#2F4F4F', '#708090', '#C0C5CE', 'Slate'],
];

const GEOMS_3D = ['lines', 'polygons', 'tubes', 'surface', 'mesh', 'ribbon', 'network', 'torus-knot', 'mobius', 'helix'];

test.describe('3. CUSTOM COLOR DEEP — 9 colors × key geometries (3D)', () => {
  for (let ci = 0; ci < CUSTOM_COLORS_9.length; ci++) {
    const [c1, c2, c3, name] = CUSTOM_COLORS_9[ci];
    for (const geom of ['tubes', 'mesh', 'torus-knot', 'mobius', 'helix', 'network']) {
      test(`color:${name} × geom:${geom}`, async ({ page }) => {
        test.setTimeout(90000);
        await goToSeed(page, 42, '3d');
        await page.evaluate(([g, c1, c2, c3]) => {
          const key = 'mathematic-engine-artwork';
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
          parsed.state.engine = 'collatz';
          parsed.state.geometry = g;
          parsed.state.customColors = [c1, c2, c3];
          parsed.state.customColorsPreset = true;
          parsed.state.material = 'basic';
          parsed.state.effect = 'neutral';
          parsed.state.backgroundMode = 'none';
          localStorage.setItem(key, JSON.stringify(parsed));
        }, [geom, c1, c2, c3] as const);
        await page.reload({ waitUntil: 'networkidle' });
        await waitRender(page, 5000);
        await snap(page, `${DIR}/03-custom-${name.replace(/\s/g, '')}-${geom}`);
      });
    }
  }
});

test.describe('3b. CUSTOM COLOR DEEP — 9 colors × key geometries (2D)', () => {
  for (let ci = 0; ci < CUSTOM_COLORS_9.length; ci++) {
    const [c1, c2, c3, name] = CUSTOM_COLORS_9[ci];
    for (const geom of ['lines', 'polygons', 'network']) {
      test(`2D color:${name} × geom:${geom}`, async ({ page }) => {
        test.setTimeout(90000);
        await goToSeed(page, 42, '2d');
        await page.evaluate(([g, c1, c2, c3]) => {
          const key = 'mathematic-engine-artwork';
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
          parsed.state.engine = 'collatz';
          parsed.state.geometry = g;
          parsed.state.customColors = [c1, c2, c3];
          parsed.state.customColorsPreset = true;
          parsed.state.effect = 'neutral';
          parsed.state.backgroundMode = 'none';
          localStorage.setItem(key, JSON.stringify(parsed));
        }, [geom, c1, c2, c3] as const);
        await page.reload({ waitUntil: 'networkidle' });
        await waitRender(page, 5000);
        await snap(page, `${DIR}/03b-2d-custom-${name.replace(/\s/g, '')}-${geom}`);
      });
    }
  }
});

// ═══════════════════════════════════════════════════
// SECTION 4: COLOR SCIENCE — custom color + material
// ═══════════════════════════════════════════════════

const MATERIALS = ['basic', 'metallic', 'glass', 'crystal', 'gem', 'holographic'];
const SCIENCE_COLORS: Array<[string, string, string, string]> = [
  ['#FF0000', '#00FF00', '#0000FF', 'RGB'],
  ['#FFFFFF', '#FFFFFF', '#FFFFFF', 'White'],
  ['#000000', '#000000', '#000000', 'Black'],
  ['#FF6600', '#FF6600', '#FF6600', 'Orange'],
];

test.describe('4. COLOR SCIENCE — color × material', () => {
  for (const [c1, c2, c3, cname] of SCIENCE_COLORS) {
    for (const material of MATERIALS) {
      test(`color:${cname} × material:${material}`, async ({ page }) => {
        test.setTimeout(90000);
        await goToSeed(page, 42, '3d');
        await page.evaluate(([m, c1, c2, c3]) => {
          const key = 'mathematic-engine-artwork';
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
          parsed.state.engine = 'collatz';
          parsed.state.geometry = 'tubes';
          parsed.state.material = m;
          parsed.state.customColors = [c1, c2, c3];
          parsed.state.customColorsPreset = true;
          parsed.state.effect = 'neutral';
          parsed.state.backgroundMode = 'none';
          localStorage.setItem(key, JSON.stringify(parsed));
        }, [material, c1, c2, c3] as const);
        await page.reload({ waitUntil: 'networkidle' });
        await waitRender(page, 5000);
        await snap(page, `${DIR}/04-science-${cname}-${material}`);
      });
    }
  }
});

// ═══════════════════════════════════════════════════
// SECTION 5: BACKGROUND DEEP AUDIT
// ═══════════════════════════════════════════════════

const BG_MODES = ['none', 'mosaic', 'tunnel'];
const BG_PALETTES = ['aurora', 'nebula', 'solar', 'inferno'];

test.describe('5. BACKGROUND DEEP — 3D', () => {
  for (const bg of BG_MODES) {
    for (const palette of BG_PALETTES) {
      test(`3D bg:${bg} × palette:${palette}`, async ({ page }) => {
        test.setTimeout(90000);
        await goToSeed(page, 42, '3d');
        await page.evaluate(([bg, pal]) => {
          const key = 'mathematic-engine-artwork';
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
          parsed.state.engine = 'collatz';
          parsed.state.geometry = 'tubes';
          parsed.state.backgroundMode = bg;
          parsed.state.palette = pal;
          parsed.state.effect = 'neutral';
          localStorage.setItem(key, JSON.stringify(parsed));
        }, [bg, palette] as const);
        await page.reload({ waitUntil: 'networkidle' });
        await waitRender(page, 5000);
        await snap(page, `${DIR}/05-bg3d-${bg}-${palette}`);
      });
    }
  }
});

test.describe('5b. BACKGROUND DEEP — 2D', () => {
  for (const bg of BG_MODES) {
    test(`2D bg:${bg}`, async ({ page }) => {
      test.setTimeout(90000);
      await goToSeed(page, 42, '2d');
      await page.evaluate(([bg]) => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.engine = 'collatz';
        parsed.state.backgroundMode = bg;
        parsed.state.effect = 'neutral';
        localStorage.setItem(key, JSON.stringify(parsed));
      }, [bg] as const);
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 5000);
      await snap(page, `${DIR}/05b-bg2d-${bg}`);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 6: FX AUDIT — OFF/ON comparison
// ═══════════════════════════════════════════════════

const FX_MODES: Array<[string, string]> = [
  ['neutral', 'none'],
  ['bloom', 'bloom'],
  ['glow', 'glow'],
  ['depth', 'depth'],
  ['reflection', 'reflection'],
  ['refraction', 'refraction'],
  ['fog', 'fog'],
  ['cinematic-lighting', 'cinematic'],
];

test.describe('6. FX AUDIT — OFF/ON (3D)', () => {
  for (const [effect, label] of FX_MODES) {
    test(`3D fx:${label} OFF then ON`, async ({ page }) => {
      test.setTimeout(90000);
      // OFF
      await goToSeed(page, 42, '3d');
      await page.evaluate(() => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.engine = 'collatz';
        parsed.state.geometry = 'tubes';
        parsed.state.material = 'metallic';
        parsed.state.effect = 'neutral';
        parsed.state.backgroundMode = 'none';
        localStorage.setItem(key, JSON.stringify(parsed));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 4000);
      await snap(page, `${DIR}/06-fx3d-${label}-OFF`);
      // ON
      await page.evaluate(([e]) => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.effect = e;
        localStorage.setItem(key, JSON.stringify(parsed));
      }, [effect] as const);
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 4000);
      await snap(page, `${DIR}/06-fx3d-${label}-ON`);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 7: MATERIAL REALISM
// ═══════════════════════════════════════════════════

test.describe('7. MATERIAL REALISM — tubes × each material', () => {
  for (const material of MATERIALS) {
    test(`3D material:${material}`, async ({ page }) => {
      test.setTimeout(90000);
      await goToSeed(page, 42, '3d');
      await page.evaluate(([m]) => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.engine = 'collatz';
        parsed.state.geometry = 'tubes';
        parsed.state.material = m;
        parsed.state.effect = 'neutral';
        parsed.state.backgroundMode = 'none';
        localStorage.setItem(key, JSON.stringify(parsed));
      }, [material] as const);
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 5000);
      await snap(page, `${DIR}/07-material-${material}`);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 8: LIGHTING PRESETS
// ═══════════════════════════════════════════════════

const LIGHT_PRESETS = ['standard', 'cinematic', 'neon', 'studio', 'dark'];

test.describe('8. LIGHTING — 5 presets', () => {
  for (const preset of LIGHT_PRESETS) {
    test(`3D light:${preset}`, async ({ page }) => {
      test.setTimeout(90000);
      await goToSeed(page, 42, '3d');
      await page.evaluate(([p]) => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.engine = 'collatz';
        parsed.state.geometry = 'tubes';
        parsed.state.material = 'metallic';
        parsed.state.lightPreset = p;
        parsed.state.effect = 'neutral';
        parsed.state.backgroundMode = 'none';
        localStorage.setItem(key, JSON.stringify(parsed));
      }, [preset] as const);
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 5000);
      await snap(page, `${DIR}/08-light-${preset}`);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 9: GEOMETRY MATHEMATICAL IDENTITY
// ═══════════════════════════════════════════════════

const ID_ENGINES = ['collatz', 'lorenz', 'mandelbrot', 'phyllotaxis', 'sierpinski', 'henon', 'rossler', 'cellular-automata', 'burning-ship', 'julia'];

test.describe('9. MATH IDENTITY — engine × geometry', () => {
  for (const engine of ID_ENGINES) {
    for (const geom of ['tubes', 'mesh'] as const) {
      test(`${engine} × ${geom}`, async ({ page }) => {
        test.setTimeout(90000);
        await goToSeed(page, 42, '3d');
        await page.evaluate(([e, g]) => {
          const key = 'mathematic-engine-artwork';
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
          parsed.state.engine = e;
          parsed.state.geometry = g;
          parsed.state.material = 'basic';
          parsed.state.effect = 'neutral';
          parsed.state.backgroundMode = 'none';
          localStorage.setItem(key, JSON.stringify(parsed));
        }, [engine, geom] as const);
        await page.reload({ waitUntil: 'networkidle' });
        await waitRender(page, 5000);
        await snap(page, `${DIR}/09-math-${engine}-${geom}`);
      });
    }
  }
});

// ═══════════════════════════════════════════════════
// SECTION 10: EFFECT STACK
// ═══════════════════════════════════════════════════

test.describe('10. EFFECT STACK — progressive addition', () => {
  const stacks = [
    { name: '1fx-bloom', effect: 'bloom', fogDensity: 0, dispersion: 0, shockwaveIntensity: 0, dofStrength: 0 },
    { name: '2fx-bloom+fog', effect: 'bloom', fogDensity: 0.5, dispersion: 0, shockwaveIntensity: 0, dofStrength: 0 },
    { name: '3fx-bloom+fog+dispersion', effect: 'bloom', fogDensity: 0.5, dispersion: 0.5, shockwaveIntensity: 0, dofStrength: 0 },
    { name: '4fx-bloom+fog+dispersion+dof', effect: 'bloom', fogDensity: 0.5, dispersion: 0.5, shockwaveIntensity: 0, dofStrength: 0.5 },
    { name: '5fx-all-on', effect: 'cinematic-lighting', fogDensity: 0.5, dispersion: 0.5, shockwaveIntensity: 0.5, dofStrength: 0.5 },
  ];
  for (const s of stacks) {
    test(`stack: ${s.name}`, async ({ page }) => {
      test.setTimeout(90000);
      await goToSeed(page, 42, '3d');
      await page.evaluate(([s]) => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.engine = 'collatz';
        parsed.state.geometry = 'tubes';
        parsed.state.material = 'metallic';
        parsed.state.effect = s.effect;
        parsed.state.fogDensity = s.fogDensity;
        parsed.state.dispersion = s.dispersion;
        parsed.state.shockwaveIntensity = s.shockwaveIntensity;
        parsed.state.dofStrength = s.dofStrength;
        parsed.state.backgroundMode = 'mosaic';
        localStorage.setItem(key, JSON.stringify(parsed));
      }, [s] as const);
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 5000);
      const fps = await measureFrameTimes(page, 6000);
      console.log(`[EFFECT-STACK] ${s.name}: avg=${fps.avg} frames=${fps.frames} avgFrameTime=${fps.avgFrameTime}ms`);
      await snap(page, `${DIR}/10-stack-${s.name}`);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 11: COMPOSITION — hero shots
// ═══════════════════════════════════════════════════

test.describe('11. COMPOSITION — hero shots', () => {
  const heroes = [
    { name: 'A-lorenz-aurora-tubes-metallic', engine: 'lorenz', geometry: 'tubes', material: 'metallic', palette: 'aurora', effect: 'bloom', bg: 'mosaic', light: 'cinematic' },
    { name: 'B-mandelbrot-ice-torus-knot-crystal', engine: 'mandelbrot', geometry: 'torus-knot', material: 'crystal', palette: 'ice', effect: 'depth', bg: 'none', light: 'standard' },
    { name: 'C-phyllotaxis-solar-helix-gem', engine: 'phyllotaxis', geometry: 'helix', material: 'gem', palette: 'solar', effect: 'glow', bg: 'tunnel', light: 'neon' },
    { name: 'D-sierpinski-void-network-glass', engine: 'sierpinski', geometry: 'network', material: 'glass', palette: 'void', effect: 'cinematic-lighting', bg: 'mosaic', light: 'studio' },
    { name: 'E-cellular-inferno-surface-metallic', engine: 'cellular-automata', geometry: 'surface', material: 'metallic', palette: 'inferno', effect: 'bloom', bg: 'none', light: 'dark' },
    { name: 'F-henon-aurora-ribbon-holographic', engine: 'henon', geometry: 'ribbon', material: 'holographic', palette: 'aurora', effect: 'glow', bg: 'tunnel', light: 'cinematic' },
    { name: 'G-collatz-nebula-mesh-crystal', engine: 'collatz', geometry: 'mesh', material: 'crystal', palette: 'nebula', effect: 'depth', bg: 'mosaic', light: 'standard' },
    { name: 'H-rossler-ice-surface-glass', engine: 'rossler', geometry: 'surface', material: 'glass', palette: 'ice', effect: 'reflection', bg: 'none', light: 'studio' },
    { name: 'I-burning-ship-void-polygons-gem', engine: 'burning-ship', geometry: 'polygons', material: 'gem', palette: 'void', effect: 'cinematic-lighting', bg: 'tunnel', light: 'dark' },
    { name: 'J-julia-solar-lines-basic', engine: 'julia', geometry: 'lines', material: 'basic', palette: 'solar', effect: 'neutral', bg: 'none', light: 'standard' },
    { name: 'K-collatz-aurora-tubes-metallic-bloom', engine: 'collatz', geometry: 'tubes', material: 'metallic', palette: 'aurora', effect: 'bloom', bg: 'mosaic', light: 'cinematic' },
    { name: 'L-mandelbrot-inferno-mesh-holographic', engine: 'mandelbrot', geometry: 'mesh', material: 'holographic', palette: 'inferno', effect: 'cinematic-lighting', bg: 'tunnel', light: 'neon' },
  ];
  for (const h of heroes) {
    test(`hero: ${h.name}`, async ({ page }) => {
      test.setTimeout(120000);
      await goToSeed(page, 42, '3d');
      await page.evaluate(([h]) => {
        const key = 'mathematic-engine-artwork';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
        parsed.state.engine = h.engine;
        parsed.state.geometry = h.geometry;
        parsed.state.material = h.material;
        parsed.state.palette = h.palette;
        parsed.state.effect = h.effect;
        parsed.state.backgroundMode = h.bg;
        parsed.state.lightPreset = h.light;
        parsed.state.customColorsPreset = false;
        localStorage.setItem(key, JSON.stringify(parsed));
      }, [h] as const);
      await page.reload({ waitUntil: 'networkidle' });
      await waitRender(page, 6000);
      await snap(page, `${DIR}/11-hero-${h.name}`);
    });
  }
});
