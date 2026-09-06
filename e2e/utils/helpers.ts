import type { Page } from '@playwright/test';

const ARTWORK_KEY = 'mathematic-engine-artwork';

export interface StoredState {
  state: {
    mode: '2d' | '3d';
    seed: number;
    engine: string;
    grid: string;
    palette: string;
    geometry: string;
    material: string;
    effect: string;
    lineWidth: number;
    fogDensity: number;
    dispersion: number;
    shockwaveIntensity: number;
    dofStrength: number;
    [key: string]: unknown;
  };
  version: number;
}

export async function getStoredMode(page: Page): Promise<'2d' | '3d'> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return '2d';
    const parsed = JSON.parse(raw);
    return parsed.state?.mode ?? '2d';
  }, ARTWORK_KEY);
}

export async function setStoredMode(page: Page, mode: '2d' | '3d') {
  await page.evaluate(([key, m]) => {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state.mode = m;
    localStorage.setItem(key, JSON.stringify(parsed));
    localStorage.setItem('i18nextLng', 'it');
  }, [ARTWORK_KEY, mode] as const);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
}

export async function setStoredValue(page: Page, field: string, value: unknown) {
  await page.evaluate(([key, f, v]) => {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state[f] = v;
    localStorage.setItem(key, JSON.stringify(parsed));
    localStorage.setItem('i18nextLng', 'it');
  }, [ARTWORK_KEY, field, value] as const);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
}

export async function getStoredValue(page: Page, field: string): Promise<unknown> {
  return page.evaluate(([key, f]) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.state?.[f] ?? null;
  }, [ARTWORK_KEY, field] as const);
}

export async function openPanel(page: Page): Promise<boolean> {
  const btn = page.locator('button[aria-label="Impostazioni"], button[aria-label="Settings"]').first();
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(1200);
    return true;
  }
  const svgBtn = page.locator('button:has(svg path[d*="M1 1H17"])').first();
  if (await svgBtn.count() > 0) {
    await svgBtn.click();
    await page.waitForTimeout(1200);
    return true;
  }
  return false;
}

export async function closePanel(page: Page) {
  const closeBtn = page.locator('button[aria-label="Close"], button[aria-label="Chiudi"]').first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }
}

export async function scrollToLabel(page: Page, label: string) {
  const el = page.locator(`text="${label}"`).first();
  if (await el.count() > 0) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
}

export async function setSliderValue(page: Page, ariaLabel: string, value: number) {
  const slider = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  if (await slider.count() === 0) return false;
  await slider.fill(String(value));
  await page.waitForTimeout(300);
  return true;
}

export async function getSliderValue(page: Page, ariaLabel: string): Promise<number | null> {
  const slider = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  if (await slider.count() === 0) return null;
  const val = await slider.inputValue();
  return parseFloat(val);
}

export async function getSliderBounds(page: Page, ariaLabel: string) {
  const slider = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  if (await slider.count() === 0) return null;
  return {
    min: await slider.getAttribute('min'),
    max: await slider.getAttribute('max'),
    step: await slider.getAttribute('step'),
  };
}

export async function hasText(page: Page, text: string): Promise<boolean> {
  const count = await page.locator(`text="${text}"`).count();
  return count > 0 && await page.locator(`text="${text}"`).first().isVisible();
}

export async function countLabel(page: Page, label: string): Promise<number> {
  return page.locator(`label:has-text("${label}")`).count();
}

export async function setLanguage(page: Page, lang: string) {
  await page.evaluate((l) => {
    localStorage.setItem('i18nextLng', l);
  }, lang);
}

export async function navigateToGenerator(page: Page) {
  await page.goto('/generator', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'it');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
}

export async function snap(page: Page, name: string, dir = 'e2e/screenshots') {
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false });
}
