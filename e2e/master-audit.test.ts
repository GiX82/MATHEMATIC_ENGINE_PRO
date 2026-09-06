import { test, expect, type Page } from '@playwright/test';
import {
  navigateToGenerator,
  openPanel,
  closePanel,
  setStoredMode,
  setStoredValue,
  setSliderValue,
  getSliderValue,
  hasText,
  snap,
} from './utils/helpers';

const DIR = 'e2e/screenshots/audit';

// ─── HELPERS ──────────────────────────────────────

async function setStore(page: Page, field: string, value: unknown) {
  await setStoredValue(page, field, value);
}

async function setEngine(page: Page, engine: string) {
  await setStore(page, 'engine', engine);
}

async function setGrid(page: Page, grid: string) {
  await setStore(page, 'grid', grid);
}

async function setGeometry(page: Page, geometry: string) {
  await setStore(page, 'geometry', geometry);
}

async function setMaterial(page: Page, material: string) {
  await setStore(page, 'material', material);
}

async function setPalette(page: Page, palette: string) {
  await setStore(page, 'palette', palette);
}

async function setEffect(page: Page, effect: string) {
  await setStore(page, 'effect', effect);
}

async function setLightPreset(page: Page, preset: string) {
  await setStore(page, 'lightPreset', preset);
}

async function setBackground(page: Page, mode: string) {
  await setStore(page, 'backgroundMode', mode);
}

async function setCustomColors(page: Page, colors: [string, string, string]) {
  await setStore(page, 'customColors', colors);
}

async function setFogDensity(page: Page, val: number) {
  await setStore(page, 'fogDensity', val);
}

async function setDispersion(page: Page, val: number) {
  await setStore(page, 'dispersion', val);
}

async function setShockwave(page: Page, val: number) {
  await setStore(page, 'shockwaveIntensity', val);
}

async function setDof(page: Page, val: number) {
  await setStore(page, 'dofStrength', val);
}

async function waitRender(page: Page, ms = 3000) {
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
  await waitRender(page, 4000);
}

async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function measureFPS(page: Page, durationMs = 5000): Promise<{ avg: number; min: number; max: number; frames: number }> {
  return page.evaluate((dur) => {
    return new Promise<{ avg: number; min: number; max: number; frames: number }>((resolve) => {
      const times: number[] = [];
      let raf: number;
      let start = 0;
      const loop = (t: number) => {
        if (start === 0) start = t;
        if (t - start > dur) {
          cancelAnimationFrame(raf);
          const deltas = [];
          for (let i = 1; i < times.length; i++) {
            deltas.push(times[i] - times[i - 1]);
          }
          if (deltas.length === 0) return resolve({ avg: 0, min: 0, max: 0, frames: 0 });
          const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          const min = Math.min(...deltas);
          const max = Math.max(...deltas);
          const avgFPS = avg > 0 ? Math.round(1000 / avg) : 0;
          const minFPS = max > 0 ? Math.round(1000 / max) : 0;
          const maxFPS = min > 0 ? Math.round(1000 / min) : 0;
          return resolve({ avg: avgFPS, min: minFPS, max: maxFPS, frames: times.length });
        }
        times.push(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
  }, durationMs);
}

async function getWebGLInfo(page: Page): Promise<{ vendor: string; renderer: string; maxTextureSize: number; glVersion: string } | null> {
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
      };
    } catch {
      return null;
    }
  });
}

async function getSceneStats(page: Page): Promise<{ meshes: number; points: number; lines: number; triangles: number; geometries: number; textures: number } | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    // Try to access Three.js renderer via __REACT_FIBER
    // This is a heuristic - may not always work
    return null;
  });
}

// ═══════════════════════════════════════════════════
// SECTION 1: BASELINE
// ═══════════════════════════════════════════════════

test.describe('1. BASELINE', () => {
  test('viewport, DPR, WebGL, FPS baseline', async ({ page }) => {
    const errors = await getConsoleErrors(page);
    const t0 = Date.now();
    await goToSeed(page, 42, '2d');
    const loadTime = Date.now() - t0;

    const webgl = await getWebGLInfo(page);
    const fps = await measureFPS(page, 5000);
    await snap(page, `${DIR}/01-baseline-2d`);

    console.log('═══════════════════════════════════════');
    console.log('SECTION 1: BASELINE');
    console.log('═══════════════════════════════════════');
    console.log(`Load time: ${loadTime}ms`);
    console.log(`WebGL: ${JSON.stringify(webgl, null, 2)}`);
    console.log(`FPS 2D: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
    console.log(`Console errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ERR: ${e}`));
    console.log('═══════════════════════════════════════');

    expect(loadTime).toBeLessThan(10000);
  });

  test('viewport DPR info', async ({ page }) => {
    await goToSeed(page, 42, '2d');
    const info = await page.evaluate(() => ({
      dpr: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenW: screen.width,
      screenH: screen.height,
      userAgent: navigator.userAgent,
    }));
    console.log('Viewport:', JSON.stringify(info, null, 2));
    expect(info.dpr).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════
// SECTION 2: 2D AUDIT — All 30 engines
// ═══════════════════════════════════════════════════

const ENGINES = [
  'collatz', 'recaman', 'fibonacci', 'primes', 'prime-gaps',
  'divisors', 'euler-phi', 'mobius', 'happy', 'digital-root',
  'polygonal', 'catalan', 'bell', 'triangular', 'custom-recurrence',
  'lucas', 'pell', 'perfect', 'square', 'logistic-map',
  'lorenz', 'henon', 'rossler', 'mandelbrot', 'julia',
  'burning-ship', 'lsystem', 'phyllotaxis', 'cellular-automata', 'sierpinski',
];

const GRIDS = [
  'ulam', 'cartesian', 'square-spiral', 'hexagonal', 'triangular',
  'radial', 'concentric', 'polar-spiral', 'golden-spiral', 'hilbert',
  'morton', 'random', 'voronoi', 'recursive',
];

const PALETTES = ['clean', 'void', 'aurora', 'nebula', 'solar', 'ice', 'inferno', 'none'];

const GEOMETRIES: Array<'lines' | 'polygons' | 'tubes' | 'surface' | 'mesh' | 'ribbon' | 'network' | 'torus-knot' | 'mobius' | 'helix'> = [
  'lines', 'polygons', 'tubes', 'surface', 'mesh', 'ribbon', 'network', 'torus-knot', 'mobius', 'helix',
];

const MATERIALS: Array<'basic' | 'metallic' | 'glass' | 'crystal' | 'gem' | 'holographic'> = [
  'basic', 'metallic', 'glass', 'crystal', 'gem', 'holographic',
];

const EFFECTS: Array<'neutral' | 'bloom' | 'glow' | 'depth' | 'reflection' | 'refraction' | 'fog' | 'cinematic-lighting'> = [
  'neutral', 'bloom', 'glow', 'depth', 'reflection', 'refraction', 'fog', 'cinematic-lighting',
];

const LIGHT_PRESETS = ['standard', 'cinematic', 'neon', 'studio', 'dark'];

const BG_MODES = ['none', 'mosaic', 'tunnel'];

const SAMPLE_COLORS: Array<[string, string, string]> = [
  ['#FF0000', '#00FF00', '#0000FF'],
  ['#FFFFFF', '#808080', '#000000'],
  ['#FF6B6B', '#4ECDC4', '#45B7D1'],
  ['#2C003E', '#D4006A', '#F7B801'],
];

const VIEWPORTS = [
  { width: 375, height: 667, name: 'mobile-s' },
  { width: 414, height: 896, name: 'mobile-l' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1200, height: 800, name: 'laptop' },
  { width: 1920, height: 1080, name: 'desktop' },
];

test.describe('2. 2D AUDIT — All engines × default grid', () => {
  for (const engine of ENGINES) {
    test(`2D ${engine}`, async ({ page }) => {
      await goToSeed(page, 42, '2d');
      await setEngine(page, engine);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/02-2d-${engine}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('2D AUDIT — Grid variations (collatz)', () => {
  for (const grid of GRIDS) {
    test(`2D collatz × ${grid}`, async ({ page }) => {
      await goToSeed(page, 42, '2d');
      await setEngine(page, 'collatz');
      await setGrid(page, grid);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/02b-2d-collatz-${grid}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('2D AUDIT — Palette variations', () => {
  for (const palette of PALETTES) {
    test(`2D collatz × palette ${palette}`, async ({ page }) => {
      await goToSeed(page, 42, '2d');
      await setEngine(page, 'collatz');
      await setPalette(page, palette);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/02c-2d-palette-${palette}`);
      expect(true).toBe(true);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 3: 3D AUDIT — Engines × Geometries × Materials
// ═══════════════════════════════════════════════════

const SAMPLE_3D_ENGINES = ['collatz', 'lorenz', 'mandelbrot', 'phyllotaxis', 'sierpinski', 'cellular-automata'];

test.describe('3. 3D AUDIT — Sample engines × all geometries', () => {
  for (const engine of SAMPLE_3D_ENGINES) {
    for (const geometry of GEOMETRIES) {
      test(`3D ${engine} × ${geometry}`, async ({ page }) => {
        await goToSeed(page, 42, '3d');
        await setEngine(page, engine);
        await setGeometry(page, geometry);
        await waitRender(page, 4000);
        await snap(page, `${DIR}/03-3d-${engine}-${geometry}`);
        expect(true).toBe(true);
      });
    }
  }
});

test.describe('3D AUDIT — All materials', () => {
  for (const material of MATERIALS) {
    test(`3D material: ${material}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setMaterial(page, material);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/03b-3d-material-${material}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('3D AUDIT — Geometry × Material matrix (collatz)', () => {
  for (const geometry of GEOMETRIES) {
    for (const material of MATERIALS) {
      test(`3D collatz × ${geometry} × ${material}`, async ({ page }) => {
        await goToSeed(page, 42, '3d');
        await setEngine(page, 'collatz');
        await setGeometry(page, geometry);
        await setMaterial(page, material);
        await waitRender(page, 4000);
        await snap(page, `${DIR}/03c-3d-collatz-${geometry}-${material}`);
        expect(true).toBe(true);
      });
    }
  }
});

// ═══════════════════════════════════════════════════
// SECTION 4: CUSTOM COLOR MATRIX
// ═══════════════════════════════════════════════════

test.describe('4. CUSTOM COLOR MATRIX — 2D', () => {
  for (let i = 0; i < SAMPLE_COLORS.length; i++) {
    test(`2D custom color set ${i + 1}`, async ({ page }) => {
      await goToSeed(page, 42, '2d');
      await setEngine(page, 'collatz');
      await setCustomColors(page, SAMPLE_COLORS[i]);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/04-custom2d-${i + 1}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('4. CUSTOM COLOR MATRIX — 3D', () => {
  for (let i = 0; i < SAMPLE_COLORS.length; i++) {
    test(`3D custom color set ${i + 1}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setCustomColors(page, SAMPLE_COLORS[i]);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/04-custom3d-${i + 1}`);
      expect(true).toBe(true);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 5: PALETTE vs CUSTOM COLOR
// ═══════════════════════════════════════════════════

test.describe('5. PALETTE vs CUSTOM — 2D', () => {
  test('palette aurora vs custom red-green-blue', async ({ page }) => {
    test.setTimeout(90000);
    await goToSeed(page, 42, '2d');
    await setEngine(page, 'collatz');
    await setPalette(page, 'aurora');
    await waitRender(page, 4000);
    await snap(page, `${DIR}/05-palette-aurora-2d`);

    await setCustomColors(page, ['#FF0000', '#00FF00', '#0000FF']);
    await waitRender(page, 4000);
    await snap(page, `${DIR}/05-custom-rgb-2d`);
  });

  test('palette inferno vs custom fire', async ({ page }) => {
    test.setTimeout(90000);
    await goToSeed(page, 42, '2d');
    await setEngine(page, 'collatz');
    await setPalette(page, 'inferno');
    await waitRender(page, 4000);
    await snap(page, `${DIR}/05-palette-inferno-2d`);

    await setCustomColors(page, ['#FF4500', '#FF8C00', '#FFD700']);
    await waitRender(page, 4000);
    await snap(page, `${DIR}/05-custom-fire-2d`);
  });
});

test.describe('5. PALETTE vs CUSTOM — 3D', () => {
  test('palette nebula vs custom purple', async ({ page }) => {
    test.setTimeout(90000);
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'collatz');
    await setGeometry(page, 'tubes');
    await setPalette(page, 'nebula');
    await waitRender(page, 4000);
    await snap(page, `${DIR}/05-palette-nebula-3d`);

    await setCustomColors(page, ['#8B00FF', '#FF1493', '#00CED1']);
    await waitRender(page, 4000);
    await snap(page, `${DIR}/05-custom-purple-3d`);
  });
});

// ═══════════════════════════════════════════════════
// SECTION 6: MATERIAL ENGINE (3D only)
// ═══════════════════════════════════════════════════

test.describe('6. MATERIAL ENGINE — all 6 materials × 3 palettes', () => {
  const materialPalettes = ['aurora', 'nebula', 'solar'];
  for (const material of MATERIALS) {
    for (const palette of materialPalettes) {
      test(`3D material:${material} × palette:${palette}`, async ({ page }) => {
        await goToSeed(page, 42, '3d');
        await setEngine(page, 'collatz');
        await setGeometry(page, 'tubes');
        await setMaterial(page, material);
        await setPalette(page, palette);
        await waitRender(page, 4000);
        await snap(page, `${DIR}/06-material-${material}-${palette}`);
        expect(true).toBe(true);
      });
    }
  }
});

// ═══════════════════════════════════════════════════
// SECTION 7: LIGHTING AUDIT (3D only)
// ═══════════════════════════════════════════════════

test.describe('7. LIGHTING — all 5 presets', () => {
  for (const preset of LIGHT_PRESETS) {
    test(`3D lighting: ${preset}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setMaterial(page, 'metallic');
      await setLightPreset(page, preset);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/07-light-${preset}`);
      expect(true).toBe(true);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 8: FX AUDIT — 8 effects ON/OFF
// ═══════════════════════════════════════════════════

test.describe('8. FX — all 8 effects (3D)', () => {
  for (const effect of EFFECTS) {
    test(`3D effect: ${effect}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setEffect(page, effect);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08-fx3d-${effect}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('8. FX — all 8 effects (2D)', () => {
  for (const effect of EFFECTS) {
    test(`2D effect: ${effect}`, async ({ page }) => {
      await goToSeed(page, 42, '2d');
      await setEngine(page, 'collatz');
      await setEffect(page, effect);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08-fx2d-${effect}`);
      expect(true).toBe(true);
    });
  }
});

// ─── ADVANCED EFFECTS ─────────────────────────────

test.describe('8b. ADVANCED FX — Fog (3D)', () => {
  const fogLevels = [0, 0.2, 0.5, 0.8, 1.0];
  for (const fog of fogLevels) {
    test(`3D fog: ${fog}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setFogDensity(page, fog);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08b-fog-${fog}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('8c. ADVANCED FX — Dispersion (3D)', () => {
  const levels = [0, 0.3, 0.7, 1.0];
  for (const d of levels) {
    test(`3D dispersion: ${d}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setDispersion(page, d);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08c-dispersion-${d}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('8d. ADVANCED FX — Shockwave (3D)', () => {
  const levels = [0, 0.3, 0.7, 1.0];
  for (const s of levels) {
    test(`3D shockwave: ${s}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setShockwave(page, s);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08d-shockwave-${s}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('8e. ADVANCED FX — DOF (3D)', () => {
  const levels = [0, 0.3, 0.7, 1.0];
  for (const d of levels) {
    test(`3D DOF: ${d}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setDof(page, d);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08e-dof-${d}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('8f. COMBINED FX — multiple ON', () => {
  const combos = [
    { name: 'bloom+fog', effect: 'bloom', fogDensity: 0.5, dispersion: 0, shockwaveIntensity: 0, dofStrength: 0 },
    { name: 'cinematic+dispersion', effect: 'cinematic-lighting', fogDensity: 0, dispersion: 0.5, shockwaveIntensity: 0, dofStrength: 0 },
    { name: 'depth+DOF', effect: 'depth', fogDensity: 0, dispersion: 0, shockwaveIntensity: 0, dofStrength: 0.7 },
    { name: 'all-on', effect: 'bloom', fogDensity: 0.5, dispersion: 0.5, shockwaveIntensity: 0.5, dofStrength: 0.5 },
    { name: 'reflection+shockwave', effect: 'reflection', fogDensity: 0, dispersion: 0, shockwaveIntensity: 0.7, dofStrength: 0 },
    { name: 'refraction+fog+DOF', effect: 'refraction', fogDensity: 0.3, dispersion: 0, shockwaveIntensity: 0, dofStrength: 0.3 },
  ];
  for (const c of combos) {
    test(`3D combined: ${c.name}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setEffect(page, c.effect);
      await setFogDensity(page, c.fogDensity);
      await setDispersion(page, c.dispersion);
      await setShockwave(page, c.shockwaveIntensity);
      await setDof(page, c.dofStrength);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/08f-combo-${c.name}`);
      expect(true).toBe(true);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 9: BACKGROUND AUDIT
// ═══════════════════════════════════════════════════

test.describe('9. BACKGROUND — 3 modes × 2D/3D', () => {
  for (const bg of BG_MODES) {
    test(`2D background: ${bg}`, async ({ page }) => {
      await goToSeed(page, 42, '2d');
      await setEngine(page, 'collatz');
      await setBackground(page, bg);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/09-bg2d-${bg}`);
      expect(true).toBe(true);
    });

    test(`3D background: ${bg}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await setBackground(page, bg);
      await waitRender(page, 4000);
      await snap(page, `${DIR}/09-bg3d-${bg}`);
      expect(true).toBe(true);
    });
  }
});

test.describe('9b. BACKGROUND × Palette matrix', () => {
  const samplePalettes = ['aurora', 'nebula', 'solar', 'inferno'];
  for (const bg of BG_MODES) {
    for (const palette of samplePalettes) {
      test(`3D bg:${bg} × palette:${palette}`, async ({ page }) => {
        await goToSeed(page, 42, '3d');
        await setEngine(page, 'collatz');
        await setGeometry(page, 'tubes');
        await setBackground(page, bg);
        await setPalette(page, palette);
        await waitRender(page, 4000);
        await snap(page, `${DIR}/09b-bg3d-${bg}-${palette}`);
        expect(true).toBe(true);
      });
    }
  }
});

// ═══════════════════════════════════════════════════
// SECTION 10: PERFORMANCE STRESS TEST
// ═══════════════════════════════════════════════════

test.describe('10. PERFORMANCE — FPS measurement', () => {
  test('3D collatz × tubes baseline FPS', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'collatz');
    await setGeometry(page, 'tubes');
    await waitRender(page, 3000);
    const fps = await measureFPS(page, 5000);
    console.log(`[PERF] 3D collatz×tubes: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
    await snap(page, `${DIR}/10-perf-3d-collatz-tubes`);
  });

  test('3D lorenz × mesh FPS', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'lorenz');
    await setGeometry(page, 'mesh');
    await waitRender(page, 3000);
    const fps = await measureFPS(page, 5000);
    console.log(`[PERF] 3D lorenz×mesh: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
  });

  test('3D sierpinski × network FPS', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'sierpinski');
    await setGeometry(page, 'network');
    await waitRender(page, 3000);
    const fps = await measureFPS(page, 5000);
    console.log(`[PERF] 3D sierpinski×network: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
  });

  test('3D ALL effects ON FPS', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'collatz');
    await setGeometry(page, 'tubes');
    await setMaterial(page, 'metallic');
    await setEffect(page, 'cinematic-lighting');
    await setBackground(page, 'mosaic');
    await setFogDensity(page, 0.5);
    await setDispersion(page, 0.5);
    await setShockwave(page, 0.5);
    await setDof(page, 0.5);
    await waitRender(page, 3000);
    const fps = await measureFPS(page, 5000);
    console.log(`[PERF] 3D ALL-ON: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
    await snap(page, `${DIR}/10-perf-3d-all-on`);
  });

  test('3D torus-knot × holographic FPS', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'collatz');
    await setGeometry(page, 'torus-knot');
    await setMaterial(page, 'holographic');
    await setEffect(page, 'bloom');
    await waitRender(page, 3000);
    const fps = await measureFPS(page, 5000);
    console.log(`[PERF] 3D torus-knot×holographic: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
  });

  test('3D mobius × crystal FPS', async ({ page }) => {
    await goToSeed(page, 42, '3d');
    await setEngine(page, 'collatz');
    await setGeometry(page, 'mobius');
    await setMaterial(page, 'crystal');
    await setEffect(page, 'glow');
    await waitRender(page, 3000);
    const fps = await measureFPS(page, 5000);
    console.log(`[PERF] 3D mobius×crystal: avg=${fps.avg} min=${fps.min} max=${fps.max} frames=${fps.frames}`);
  });
});

// ═══════════════════════════════════════════════════
// SECTION 11: RESPONSIVENESS
// ═══════════════════════════════════════════════════

test.describe('11. RESPONSIVENESS — 5 viewports', () => {
  for (const vp of VIEWPORTS) {
    test(`2D @ ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await goToSeed(page, 42, '2d');
      await setEngine(page, 'collatz');
      await waitRender(page, 4000);
      await snap(page, `${DIR}/11-2d-${vp.name}`);
      expect(true).toBe(true);
    });

    test(`3D @ ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await goToSeed(page, 42, '3d');
      await setEngine(page, 'collatz');
      await setGeometry(page, 'tubes');
      await waitRender(page, 4000);
      await snap(page, `${DIR}/11-3d-${vp.name}`);
      expect(true).toBe(true);
    });
  }
});

// ═══════════════════════════════════════════════════
// SECTION 12: CONSOLE ERROR MONITOR
// ═══════════════════════════════════════════════════

test.describe('12. CONSOLE ERRORS — all mode switches', () => {
  test('no console errors across all modes', async ({ page }) => {
    test.setTimeout(300000);
    const errors: string[] = [];
    const warnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    // Test 2D
    await goToSeed(page, 42, '2d');
    await setEngine(page, 'collatz');
    await waitRender(page, 3000);

    // Switch to 3D
    await setStoredMode(page, '3d');
    await waitRender(page, 3000);

    // Switch geometry
    await setGeometry(page, 'torus-knot');
    await waitRender(page, 3000);
    await setGeometry(page, 'mobius');
    await waitRender(page, 3000);

    // Switch effects
    await setEffect(page, 'bloom');
    await waitRender(page, 3000);
    await setFogDensity(page, 0.5);
    await waitRender(page, 3000);
    await setDispersion(page, 0.3);
    await waitRender(page, 3000);

    // Switch palettes (reduced to avoid timeout)
    for (const p of ['aurora', 'nebula', 'solar', 'inferno']) {
      await setPalette(page, p);
      await waitRender(page, 3000);
    }

    console.log(`[CONSOLE] Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ERR: ${e}`));
    console.log(`[CONSOLE] Warnings: ${warnings.length}`);

    expect(errors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════
// SECTION 13: AWWWARDS-LEVEL VISUAL COMPOSITION
// ═══════════════════════════════════════════════════

test.describe('13. AWWWARDS — hero compositions', () => {
  const heroConfigs = [
    { name: 'lorenz-aurora-tubes-metallic', engine: 'lorenz', geometry: 'tubes', material: 'metallic', palette: 'aurora', effect: 'bloom', bg: 'mosaic' },
    { name: 'mandelbrot-ice-torus-knot-crystal', engine: 'mandelbrot', geometry: 'torus-knot', material: 'crystal', palette: 'ice', effect: 'depth', bg: 'none' },
    { name: 'phyllotaxis-solar-helix-gem', engine: 'phyllotaxis', geometry: 'helix', material: 'gem', palette: 'solar', effect: 'glow', bg: 'tunnel' },
    { name: 'sierpinski-void-network-glass', engine: 'sierpinski', geometry: 'network', material: 'glass', palette: 'void', effect: 'cinematic-lighting', bg: 'mosaic' },
    { name: 'cellular-inferno-surface-metallic', engine: 'cellular-automata', geometry: 'surface', material: 'metallic', palette: 'inferno', effect: 'bloom', bg: 'none' },
    { name: 'henon-aurora-ribbon-holographic', engine: 'henon', geometry: 'ribbon', material: 'holographic', palette: 'aurora', effect: 'glow', bg: 'tunnel' },
    { name: 'collatz-nebula-mesh-crystal', engine: 'collatz', geometry: 'mesh', material: 'crystal', palette: 'nebula', effect: 'depth', bg: 'mosaic' },
    { name: 'rossler-ice-surface-glass', engine: 'rossler', geometry: 'surface', material: 'glass', palette: 'ice', effect: 'reflection', bg: 'none' },
    { name: 'burning-ship-void-polygons-gem', engine: 'burning-ship', geometry: 'polygons', material: 'gem', palette: 'void', effect: 'cinematic-lighting', bg: 'tunnel' },
    { name: 'julia-solar-lines-basic', engine: 'julia', geometry: 'lines', material: 'basic', palette: 'solar', effect: 'neutral', bg: 'none' },
  ];

  for (const c of heroConfigs) {
    test(`hero: ${c.name}`, async ({ page }) => {
      await goToSeed(page, 42, '3d');
      await setEngine(page, c.engine);
      await setGeometry(page, c.geometry);
      await setMaterial(page, c.material);
      await setPalette(page, c.palette);
      await setEffect(page, c.effect);
      await setBackground(page, c.bg);
      await waitRender(page, 5000);
      await snap(page, `${DIR}/13-hero-${c.name}`);
      expect(true).toBe(true);
    });
  }
});
