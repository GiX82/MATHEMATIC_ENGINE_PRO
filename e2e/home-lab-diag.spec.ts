import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Diagnostic: console errors', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') errors.push(text);
  });

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/home-lab`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(5000);

  console.log('=== ALL CONSOLE LOGS ===');
  logs.forEach(l => console.log(l));
  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(e));
  console.log('=== HTML SNIPPET ===');
  const html = await page.innerHTML('body');
  console.log(html.substring(0, 2000));
});
