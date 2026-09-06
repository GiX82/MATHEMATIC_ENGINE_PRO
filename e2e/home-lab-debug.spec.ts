import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Diagnostic: Check page content renders', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/home-lab`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Check for text content
  const bodyText = await page.textContent('body');
  console.log('Body text length:', bodyText?.length);
  console.log('Body text preview:', bodyText?.substring(0, 500));

  // Check for specific elements
  const h1 = await page.locator('h1').first().textContent();
  console.log('H1:', h1);

  // Check for errors in console
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Take a screenshot with forced light background for debugging
  await page.evaluate(() => {
    document.body.style.background = 'white';
    document.body.style.color = 'black';
  });
  await page.screenshot({ path: 'e2e/screenshots/home-lab/debug-contrast.png', fullPage: false });
});
