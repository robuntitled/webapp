import { test, expect } from '@playwright/test';
import path from 'node:path';

const ARTIFACTS = path.join('/opt/cursor/artifacts');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('consent-v1', 'accepted');
    } catch {
      /* ignore */
    }
    document.cookie = 'consent-v1=accepted; path=/; max-age=31536000; SameSite=Lax';
  });
  const share = process.env.PLAYWRIGHT_VERCEL_SHARE;
  if (share) {
    await page.goto(`/?_vercel_share=${share}`, { waitUntil: 'domcontentloaded' });
  }
});

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(ARTIFACTS, name),
    fullPage: true,
  });
}

test.describe('UX review fixtures (mobile 390)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('B1/B2/B3 fixtures: cart totals, offer cards, legal checkbox', async ({ page }) => {
    await page.goto('/dev/ux-review-fixtures', { waitUntil: 'domcontentloaded' });

    const cart = page.getByTestId('fixture-flight-review-cart');
    await expect(cart).toBeVisible({ timeout: 20_000 });
    await expect(cart.getByTestId('flight-review-party-total')).toContainText(/1\.?580/);
    await expect(cart.getByText(/a persona/i).first()).toBeVisible();
    await expect(cart.getByText(/totale tratta/i).first()).toBeVisible();
    await expect(cart.getByText(/Totale voli/i)).toBeVisible();
    await expect(cart).not.toContainText(/one-way|all-or-nothing|in cache/i);
    await expect(cart.getByText(/1 scalo/)).toBeVisible();

    const cards = page.getByTestId('fixture-flight-offer-cards');
    await expect(cards.getByTestId('flight-offer-card')).toHaveCount(2);
    const firstCard = cards.getByTestId('flight-offer-card').first();
    const box = await firstCard.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
    // Card content should not overflow viewport width
    await expect(firstCard.getByTestId('flight-offer-price')).toBeVisible();

    const legal = page.getByTestId('fixture-legal-ack');
    const checkbox = legal.getByTestId('fixture-legal-checkbox');
    await expect(checkbox).toBeVisible();
    const crea = legal.getByTestId('fixture-crea-viaggio');
    await expect(crea).toBeDisabled();
    await checkbox.check();
    await expect(crea).toBeEnabled();

    await expect(page.getByTestId('fixture-checkout-hierarchy').getByText('Paghi ora')).toBeVisible();
    await expect(page.getByTestId('fixture-pago-per-me')).toContainText(/Pago per me/);
    await expect(page.getByTestId('fixture-pago-per-altri')).toContainText(/Pago per altri/);

    await shot(page, 'ux-review-fixtures-390.png');
  });

  test('mobile menu Accedi/Registrati + Esc closes', async ({ page }) => {
    // Home (`app/page.tsx`) uses PublicLanding chrome; MobileNav lives in `(main)` layout.
    await page.goto('/gruppi', { waitUntil: 'domcontentloaded' });
    const toggle = page.getByTestId('mobile-nav-toggle');
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await toggle.click();
    const panel = page.getByTestId('mobile-nav-panel');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('mobile-nav-accedi')).toBeVisible();
    await expect(page.getByTestId('mobile-nav-registrati')).toBeVisible();
    await shot(page, 'ux-review-mobile-menu-390.png');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });

  test('/pratiche guest redirects to Accedi', async ({ page }) => {
    await page.goto('/pratiche', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/accedi/);
    expect(page.url()).toMatch(/callbackUrl/);
    await shot(page, 'ux-review-pratiche-guest-390.png');
  });

  test('gruppi search is full width; voli form loads', async ({ page }) => {
    await page.goto('/gruppi', { waitUntil: 'domcontentloaded' });
    const searchForm = page.getByTestId('catalog-hero-search');
    await expect(searchForm).toBeVisible({ timeout: 20_000 });
    const formBox = await searchForm.boundingBox();
    expect(formBox).toBeTruthy();
    expect(formBox!.width).toBeGreaterThan(300);
    await shot(page, 'ux-review-gruppi-390.png');

    await page.goto('/prenota/voli', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Partenza/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, 'ux-review-voli-390.png');
  });
});

test.describe('UX review fixtures (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('fixtures + voli desktop field layout', async ({ page }) => {
    await page.goto('/dev/ux-review-fixtures', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('fixture-flight-review-cart')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('flight-review-party-total')).toBeVisible();
    await shot(page, 'ux-review-fixtures-desktop.png');

    await page.goto('/prenota/voli', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Partenza/i).first()).toBeVisible({ timeout: 20_000 });
    await shot(page, 'ux-review-voli-desktop.png');

    await page.goto('/gruppi', { waitUntil: 'domcontentloaded' });
    const searchForm = page.getByTestId('catalog-hero-search');
    await expect(searchForm).toBeVisible({ timeout: 20_000 });
    const formBox = await searchForm.boundingBox();
    expect(formBox).toBeTruthy();
    expect(formBox!.width).toBeGreaterThan(600);
    await shot(page, 'ux-review-gruppi-desktop.png');
  });

  test('/pratiche guest → Accedi on desktop', async ({ page }) => {
    await page.goto('/pratiche', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/accedi.*callbackUrl/);
  });
});
