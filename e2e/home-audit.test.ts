import { test } from '@playwright/test';

test.describe('Home page audit', () => {
  test('desktop 1440×900', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'it'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-audit/desktop-1440.png', fullPage: true });
  });

  test('mobile 375×667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'it'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-audit/mobile-375.png', fullPage: true });
  });

  test('tablet 768×1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'it'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-audit/tablet-768.png', fullPage: true });
  });

  test('desktop EN', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'en'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-audit/desktop-en.png', fullPage: true });
  });
});
