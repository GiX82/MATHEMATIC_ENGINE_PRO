import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Home Lab — Editorial Prototype', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/home-lab`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
  });

  test('Desktop 1440×900 — Hero', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-hero.png', fullPage: false });
  });

  test('Desktop 1440×900 — Full page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-full.png', fullPage: true });
  });

  test('Desktop 1440×900 — Il Numero', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Il Numero"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-numero.png', fullPage: false });
  });

  test('Desktop 1440×900 — Pipeline', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Pipeline"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-pipeline.png', fullPage: false });
  });

  test('Desktop 1440×900 — Engine Card', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Engine Card"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-engine.png', fullPage: false });
  });

  test('Desktop 1440×900 — Perché panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Engine Card"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    const whyButton = page.locator('button:has-text("Perché")').first();
    await whyButton.scrollIntoViewIfNeeded();
    await whyButton.click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-perche.png', fullPage: false });
  });

  test('Desktop 1440×900 — ⓘ hover', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Pipeline"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    const infoButton = page.locator('button[aria-label*="Informazioni"]').first();
    await infoButton.scrollIntoViewIfNeeded();
    await infoButton.hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-info-hover.png', fullPage: false });
  });

  test('Desktop 1440×900 — ⓘ tap', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Pipeline"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    const infoButton = page.locator('button[aria-label*="Informazioni"]').first();
    await infoButton.scrollIntoViewIfNeeded();
    await infoButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-info-tap.png', fullPage: false });
  });

  test('Mobile 375×667 — Hero', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-mobile-hero.png', fullPage: false });
  });

  test('Mobile 375×667 — Full page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-mobile-full.png', fullPage: true });
  });

  test('Mobile 375×667 — ⓘ tap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Pipeline"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    const infoButton = page.locator('button[aria-label*="Informazioni"]').first();
    await infoButton.scrollIntoViewIfNeeded();
    await infoButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-mobile-info-tap.png', fullPage: false });
  });

  test('Tablet 768×1024 — Hero', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-tablet-hero.png', fullPage: false });
  });

  test('Desktop 1440×900 — Sound Lab', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const section = document.querySelector('[aria-label="Sound Lab"]');
      section?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/home-lab/v2-desktop-soundlab.png', fullPage: false });
  });
});
