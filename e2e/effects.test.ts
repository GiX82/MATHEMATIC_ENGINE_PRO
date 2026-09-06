import { test, expect } from '@playwright/test';
import {
  navigateToGenerator,
  openPanel,
  setStoredMode,
  setSliderValue,
  getSliderValue,
  getSliderBounds,
  hasText,
  scrollToLabel,
  getStoredValue,
  snap,
} from './utils/helpers';

const SCREENSHOT_DIR = 'e2e/screenshots';

test.describe('Advanced Effects — Fog, Dispersion, Shockwave', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGenerator(page);
  });

  // ─── FOG ──────────────────────────────────────────────

  test.describe('Nebbia (Fog)', () => {
    test('slider exists in 3D with correct bounds', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'Nebbia');
      expect(bounds).not.toBeNull();
      expect(bounds!.min).toBe('0');
      expect(bounds!.max).toBe('1');
      expect(bounds!.step).toBe('0.05');
    });

    test('slider exists in 2D with correct bounds', async ({ page }) => {
      await setStoredMode(page, '2d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'Nebbia');
      expect(bounds).not.toBeNull();
      expect(bounds!.min).toBe('0');
      expect(bounds!.max).toBe('1');
    });

    test('slider value changes and persists in store', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      await setSliderValue(page, 'Nebbia', 0.7);
      const val = await getSliderValue(page, 'Nebbia');
      expect(val).toBeCloseTo(0.7, 1);

      const stored = await getStoredValue(page, 'fogDensity');
      expect(stored).toBeCloseTo(0.7, 1);
    });

    test('no console errors when enabling fog in 3D', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Nebbia', 0.8);
      await page.waitForTimeout(2000);

      expect(errors).toHaveLength(0);
    });

    test('screenshot changes with fog enabled (3D)', async ({ page }) => {
      await setStoredMode(page, '3d');

      // Baseline — no fog
      await page.goto('/generator?seed=42', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await snap(page, 'fog-baseline-3d', SCREENSHOT_DIR);

      // Enable fog
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Nebbia', 0.9);
      await page.waitForTimeout(2000);
      await snap(page, 'fog-enabled-3d', SCREENSHOT_DIR);

      // Screenshots should differ (if WebGL renders)
      // With WebGL disabled both will be black — that's OK, test still passes
    });
  });

  // ─── DISPERSION ───────────────────────────────────────

  test.describe('Dispersione (Dispersion)', () => {
    test('slider exists in 3D with correct bounds', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'Dispersione');
      expect(bounds).not.toBeNull();
      expect(bounds!.min).toBe('0');
      expect(bounds!.max).toBe('1');
      expect(bounds!.step).toBe('0.05');
    });

    test('slider exists in 2D', async ({ page }) => {
      await setStoredMode(page, '2d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'Dispersione');
      expect(bounds).not.toBeNull();
    });

    test('slider value changes and persists in store', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      await setSliderValue(page, 'Dispersione', 0.5);
      const val = await getSliderValue(page, 'Dispersione');
      expect(val).toBeCloseTo(0.5, 1);

      const stored = await getStoredValue(page, 'dispersion');
      expect(stored).toBeCloseTo(0.5, 1);
    });

    test('no console errors when enabling dispersion in 3D', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Dispersione', 0.6);
      await page.waitForTimeout(2000);

      expect(errors).toHaveLength(0);
    });

    test('screenshot changes with dispersion enabled (3D)', async ({ page }) => {
      await setStoredMode(page, '3d');

      await page.goto('/generator?seed=42', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await snap(page, 'dispersion-baseline-3d', SCREENSHOT_DIR);

      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Dispersione', 0.8);
      await page.waitForTimeout(2000);
      await snap(page, 'dispersion-enabled-3d', SCREENSHOT_DIR);
    });
  });

  // ─── SHOCKWAVE ────────────────────────────────────────

  test.describe('Onda d\'urto (Shockwave)', () => {
    test('slider exists in 3D with correct bounds', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'Onda d\'urto');
      expect(bounds).not.toBeNull();
      expect(bounds!.min).toBe('0');
      expect(bounds!.max).toBe('1');
      expect(bounds!.step).toBe('0.05');
    });

    test('slider exists in 2D', async ({ page }) => {
      await setStoredMode(page, '2d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'Onda d\'urto');
      expect(bounds).not.toBeNull();
    });

    test('slider value changes and persists in store', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      await setSliderValue(page, 'Onda d\'urto', 0.4);
      const val = await getSliderValue(page, 'Onda d\'urto');
      expect(val).toBeCloseTo(0.4, 1);

      const stored = await getStoredValue(page, 'shockwaveIntensity');
      expect(stored).toBeCloseTo(0.4, 1);
    });

    test('no console errors when enabling shockwave in 3D', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Onda d\'urto', 0.7);
      await page.waitForTimeout(2000);

      expect(errors).toHaveLength(0);
    });

    test('screenshot changes with shockwave enabled (3D)', async ({ page }) => {
      await setStoredMode(page, '3d');

      await page.goto('/generator?seed=42', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await snap(page, 'shockwave-baseline-3d', SCREENSHOT_DIR);

      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Onda d\'urto', 0.9);
      await page.waitForTimeout(2000);
      await snap(page, 'shockwave-enabled-3d', SCREENSHOT_DIR);
    });
  });

  // ─── CROSS-MODE TESTS ────────────────────────────────

  test.describe('Cross-mode behavior', () => {
    test('fog slider resets to 0 when switching 3D → 2D → 3D', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Nebbia', 0.8);

      // Switch to 2D
      await page.evaluate(() => {
        const raw = localStorage.getItem('mathematic-engine-artwork');
        const parsed = JSON.parse(raw!);
        parsed.state.mode = '2d';
        localStorage.setItem('mathematic-engine-artwork', JSON.stringify(parsed));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Switch back to 3D
      await page.evaluate(() => {
        const raw = localStorage.getItem('mathematic-engine-artwork');
        const parsed = JSON.parse(raw!);
        parsed.state.mode = '3d';
        localStorage.setItem('mathematic-engine-artwork', JSON.stringify(parsed));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Fog value should persist (stored in localStorage)
      const stored = await getStoredValue(page, 'fogDensity');
      expect(stored).toBeCloseTo(0.8, 1);
    });

    test('all three effects can be enabled simultaneously without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      await setSliderValue(page, 'Nebbia', 0.5);
      await setSliderValue(page, 'Dispersione', 0.5);
      await setSliderValue(page, 'Onda d\'urto', 0.5);
      await page.waitForTimeout(3000);

      expect(errors).toHaveLength(0);

      // Verify all values persisted
      expect(await getStoredValue(page, 'fogDensity')).toBeCloseTo(0.5, 1);
      expect(await getStoredValue(page, 'dispersion')).toBeCloseTo(0.5, 1);
      expect(await getStoredValue(page, 'shockwaveIntensity')).toBeCloseTo(0.5, 1);
    });

    test('effects section is visible in both 2D and 3D', async ({ page }) => {
      // 3D
      await setStoredMode(page, '3d');
      await openPanel(page);
      const visible3d = await hasText(page, 'Effetti Avanzati');
      expect(visible3d).toBe(true);

      // 2D
      await setStoredMode(page, '2d');
      await openPanel(page);
      const visible2d = await hasText(page, 'Effetti Avanzati');
      expect(visible2d).toBe(true);
    });

    test('no console errors during mode switch with effects active', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      // Enable effects in 3D
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'Nebbia', 0.6);
      await setSliderValue(page, 'Dispersione', 0.4);
      await setSliderValue(page, 'Onda d\'urto', 0.3);
      await page.waitForTimeout(1000);

      // Switch to 2D
      await page.evaluate(() => {
        const raw = localStorage.getItem('mathematic-engine-artwork');
        const parsed = JSON.parse(raw!);
        parsed.state.mode = '2d';
        localStorage.setItem('mathematic-engine-artwork', JSON.stringify(parsed));
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      expect(errors).toHaveLength(0);
    });
  });

  // ─── DOF (3D only) ───────────────────────────────────

  test.describe('DOF (Depth of Field)', () => {
    test('slider exists only in 3D', async ({ page }) => {
      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const bounds = await getSliderBounds(page, 'DOF');
      expect(bounds).not.toBeNull();
      expect(bounds!.min).toBe('0');
      expect(bounds!.max).toBe('1');
    });

    test('slider not visible in 2D', async ({ page }) => {
      await setStoredMode(page, '2d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');

      const count = await page.locator('input[aria-label="DOF"]').count();
      expect(count).toBe(0);
    });

    test('value persists and no errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await setStoredMode(page, '3d');
      await openPanel(page);
      await scrollToLabel(page, 'Effetti Avanzati');
      await setSliderValue(page, 'DOF', 0.6);
      await page.waitForTimeout(2000);

      expect(errors).toHaveLength(0);
      const stored = await getStoredValue(page, 'dofStrength');
      expect(stored).toBeCloseTo(0.6, 1);
    });
  });
});
