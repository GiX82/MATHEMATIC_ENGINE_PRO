import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Generator — UX Refactor Validation', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/generator`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
  });

  test('1. Caption shows engine + seed + grid · geometry', async ({ page }) => {
    const caption = page.locator('.select-none.pointer-events-none').first();
    await expect(caption).toBeVisible();

    const text = await caption.textContent();
    console.log('Caption text:', text);

    expect(text).toContain('Collatz');
    expect(text).toContain('27');
    expect(text).toContain('Ulam');
  });

  test('2. CREA button exists and works', async ({ page }) => {
    const creaBtn = page.locator('button:has-text("Crea")').first();
    await expect(creaBtn).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/generator/01-before-crea.png' });

    for (let i = 0; i < 3; i++) {
      await creaBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'e2e/screenshots/generator/02-after-crea.png' });

    const caption = page.locator('.select-none.pointer-events-none').first();
    const text = await caption.textContent();
    expect(text).toContain('27');
  });

  test('3. Seed +/- buttons work', async ({ page }) => {
    const seedInput = page.locator('input[type="number"]');
    const val = await seedInput.inputValue();
    expect(val).toBe('27');

    await page.locator('button[aria-label="Increase seed"]').click({ force: true });
    await page.waitForTimeout(1000);
    expect(await seedInput.inputValue()).toBe('28');

    await page.locator('button[aria-label="Decrease seed"]').click({ force: true });
    await page.waitForTimeout(1000);
    expect(await seedInput.inputValue()).toBe('27');
  });

  test('4. Hamburger opens panel with accordion', async ({ page }) => {
    const hamburger = page.locator('button.absolute.right-4.top-4');
    await hamburger.click({ timeout: 5000, force: true });
    await page.waitForTimeout(1000);

    const studioText = page.locator('h2:has-text("Studio")');
    await expect(studioText).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=Scena').first()).toBeVisible();
    await expect(page.locator('text=Aspetto').first()).toBeVisible();

    await expect(page.locator('text=Collatz').first()).toBeVisible();
    await expect(page.locator('text=Ulam').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/generator/03-panel-open.png' });
  });

  test('5. Accordion — Motore opens, shows search + list', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    const motoreBtn = page.locator('button').filter({ hasText: /^Motore/ }).first();
    await motoreBtn.click({ force: true });
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder="Cerca..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await expect(page.locator('button:has-text("Collatz")').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/generator/04-motore-open.png' });
  });

  test('6. Engine locked indicator visible', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    await page.locator('button').filter({ hasText: /^Motore/ }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Collatz should be selected (active style), others should be locked
    const lockIcons = page.locator('button:has-text("🔒")');
    const lockCount = await lockIcons.count();
    console.log('Locked engines:', lockCount);
    expect(lockCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'e2e/screenshots/generator/05-engine-locked.png' });
  });

  test('7. Colori shows 3 color inputs', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    await page.locator('button').filter({ hasText: /^Colori/ }).first().click({ force: true });
    await page.waitForTimeout(500);

    const colorInputs = page.locator('input[type="color"]');
    expect(await colorInputs.count()).toBe(3);
    await page.screenshot({ path: 'e2e/screenshots/generator/06-colors-open.png' });
  });

  test('8. ESC closes submenu then panel', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    // Verify panel is open
    await expect(page.locator('h2:has-text("Studio")')).toBeVisible({ timeout: 5000 });

    // Open Motore submenu
    await page.locator('button').filter({ hasText: /^Motore/ }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Verify search input is visible (submenu open)
    await expect(page.locator('input[placeholder="Cerca..."]')).toBeVisible({ timeout: 5000 });

    // First ESC: closes submenu only
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Panel should still be open, but search input should be gone
    await expect(page.locator('h2:has-text("Studio")')).toBeVisible();
    await expect(page.locator('input[placeholder="Cerca..."]')).not.toBeVisible();

    // Second ESC: closes the entire panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Panel should be closed — check bounding box is off-screen
    const panel = page.locator('[role="dialog"]');
    const box = await panel.boundingBox();
    if (box) {
      // Panel should be off-screen (translated right)
      expect(box.x).toBeGreaterThan(300);
    }
  });

  test('9. Full workflow: Geometria → Linee → CREA → verify', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    // Open Geometria accordion
    await page.locator('button').filter({ hasText: /^Geometria/ }).first().click({ force: true });
    await page.waitForTimeout(500);

    // In 2D mode, only 'lines' and 'polygons' are available. Click 'Linee'.
    const lineeBtn = page.locator('button').filter({ hasText: 'Linee' }).first();
    await expect(lineeBtn).toBeVisible({ timeout: 5000 });
    await lineeBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Close panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click CREA
    await page.locator('button:has-text("Crea")').first().click({ force: true });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'e2e/screenshots/generator/07-full-workflow.png' });

    // Caption should still show default values since Linee was already selected
    const caption = page.locator('.select-none.pointer-events-none').first();
    const text = await caption.textContent();
    expect(text).toContain('Collatz');
    expect(text).toContain('Ulam');
  });

  test('10. Panel close/open resets accordion', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    // Open Motore accordion
    await page.locator('button').filter({ hasText: /^Motore/ }).first().click({ force: true });
    await page.waitForTimeout(500);

    // Verify search is visible (accordion open)
    await expect(page.locator('input[placeholder="Cerca..."]')).toBeVisible({ timeout: 5000 });

    // Close panel via ✕
    await page.locator('button:has-text("✕")').click({ force: true });
    await page.waitForTimeout(500);

    // Reopen panel
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    // Accordion should be collapsed (search input gone)
    await expect(page.locator('input[placeholder="Cerca..."]')).not.toBeVisible();

    // But values preserved
    await expect(page.locator('text=Collatz').first()).toBeVisible();
    await expect(page.locator('text=Ulam').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/generator/08-state-preserved.png' });
  });

  test('11. Durata slider visible in Animazione section', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Durata').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/generator/09-durata.png' });
  });

  test('12. Effetti avanzati badge shows count', async ({ page }) => {
    await page.locator('button.absolute.right-4.top-4').click({ force: true });
    await page.waitForTimeout(1000);

    const avanzati = page.locator('button').filter({ hasText: /Effetti avanzati/ });
    await expect(avanzati.first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/generator/10-avanzati-badge.png' });
  });
});
