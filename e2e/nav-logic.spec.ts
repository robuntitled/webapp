import { test, expect } from '@playwright/test';
import { PUBLIC_APP_ROUTES } from '../lib/nav/route-inventory';

/**
 * Guest navigation audit against a live base URL (local or preview).
 * Logged-in flows need a real session cookie — not covered here without secrets.
 */

test.describe('guest navigation logic', () => {
  for (const route of PUBLIC_APP_ROUTES) {
    test(`guest can open ${route.path} (${route.labelIt})`, async ({ page }) => {
      const res = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(res?.ok() || res?.status() === 304).toBeTruthy();
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('logo from /organizza returns to home entrances', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    const logo = page.getByTestId('brand-logo-home').first();
    await expect(logo).toBeVisible();
    await logo.click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    await expect(
      page.getByRole('heading', { name: /Il viaggio fai da te/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test('logo from /gruppi returns to home', async ({ page }) => {
    await page.goto('/gruppi', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('brand-logo-home').first().click();
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test('voli search page is reachable without login', async ({ page }) => {
    await page.goto('/prenota/voli', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/prenota\/voli/);
    await expect(page.locator('body')).not.toContainText(/bookability live/i);
  });

  test('hotel search page is reachable without login', async ({ page }) => {
    await page.goto('/prenota/hotel', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/prenota\/hotel/);
  });

  test('unknown path shows Italian 404 with home CTA', async ({ page }) => {
    await page.goto('/questa-pagina-non-esiste-xyz', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Pagina non trovata/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Torna alla home/i })).toBeVisible();
  });

  test('organizza riepilogo copy has no English bookability (source surface)', async ({
    page,
  }) => {
    await page.goto('/organizza?slug=vietnam', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText(/bookability/i);
  });
});
