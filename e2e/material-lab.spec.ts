import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Material Lab — Desktop screenshots', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/material-lab`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(8000);

  // Full page
  await page.screenshot({ path: 'e2e/screenshots/material-lab/desktop-full.png', fullPage: true });

  // Click through phases
  const phases = ['M', 'A', 'B', 'C', 'D', 'F', 'I', 'O'];
  for (const phase of phases) {
    const btn = page.locator(`button:has-text("Phase ${phase}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `e2e/screenshots/material-lab/phase-${phase}.png`, fullPage: true });
    }
  }

  console.log('Errors:', errors);
});
