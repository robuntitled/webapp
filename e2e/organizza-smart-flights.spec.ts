import { test, expect } from '@playwright/test';

/**
 * Organizza 3 fasi: Imposta → Voli → Itinerario.
 * Multi-select destinazioni; Voli = una striscia per tratta (N paesi → N+1).
 */

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

test.describe('organizza 3 fasi (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('stepper has three stages', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('organizza-stepper')).toBeVisible({ timeout: 20_000 });
    const stepper = page.getByTestId('organizza-stepper');
    await expect(stepper.locator('li')).toHaveCount(3);
    await expect(stepper.getByText('Imposta', { exact: true })).toBeVisible();
  });

  test('Imposta progressive: dest → airports → dates → company, no map', async ({
    page,
  }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Organizza il tuo viaggio/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('organizza-imposta')).toBeVisible();
    await expect(page.getByTestId('organizza-destination-map')).toHaveCount(0);

    await expect(page.getByTestId('trip-type-roundtrip')).toBeVisible();
    await page.getByTestId('dest-search').fill('Thailand');
    const th = page.getByTestId('dest-card-thailandia');
    await expect(th).toBeVisible();
    await th.click();
    await expect(page.getByText(/Thailandia/i).first()).toBeVisible();

    await expect(page.getByText(/Da dove parti/i)).toBeVisible();
    await expect(page.getByText(/Dove torni/i)).toBeVisible();

    const from = page.locator('input[type="date"]').first();
    const to = page.locator('input[type="date"]').nth(1);
    await from.fill('2026-12-10');
    await to.fill('2026-12-23');
    await expect(page.getByText(/Con chi/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Con amici/i }).click();

    const continua = page.getByTestId('organizza-continua');
    await expect(continua).toBeEnabled();
    await continua.click();

    await expect(page.getByTestId('organizza-voli')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('organizza-destination-map')).toHaveCount(0);
    await expect(page.getByTestId('leg-calendar-strips')).toBeVisible();
    // Single country RT → 2 strips
    await expect(page.locator('[data-testid^="leg-flight-strip-"]')).toHaveCount(2);
    await expect(page.getByText(/Aggiungi tratta/i)).toHaveCount(0);
    await expect(page.getByText(/Offerte ·/i)).toHaveCount(0);
    await expect(page.getByText(/cold |warm |chiamate/i)).toHaveCount(0);
  });

  test('one-way trip type hides return airport', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('organizza-imposta')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('trip-type-oneway').click();
    await page.getByTestId('dest-card-thailandia').click();
    await expect(page.getByText(/Da dove parti/i)).toBeVisible();
    await expect(page.getByText(/Solo andata/i).first()).toBeVisible();
    await expect(page.getByText(/Dove torni/i)).toHaveCount(0);
  });

  test('multi-select Vietnam + Cambogia → 3 calendar strips', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('organizza-imposta')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('dest-card-vietnam').click();
    await page.getByTestId('dest-card-cambogia').click();
    await expect(page.getByText(/Vietnam → Cambogia|Vietnam \+ Cambogia/i).first()).toBeVisible();
    await expect(page.getByText(/Aggiungi un'altra meta/i)).toHaveCount(0);
    await expect(page.getByText(/VERIFICATA|DA VERIFICARE/i)).toHaveCount(0);

    await page.locator('input[type="date"]').first().fill('2026-12-10');
    await page.locator('input[type="date"]').nth(1).fill('2026-12-24');
    await page.getByRole('button', { name: /Da solo/i }).click();
    await page.getByTestId('organizza-continua').click();

    await expect(page.getByTestId('organizza-voli')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('leg-calendar-strips')).toBeVisible();
    // 2 countries + return → 3 main strips
    await expect(page.locator('[data-testid^="leg-flight-strip-"]')).toHaveCount(3);
    await expect(page.locator('[data-leg-kind="intercountry"]')).toHaveCount(1);
    await expect(page.getByText(/Tra paesi/i).first()).toBeVisible();
    await expect(page.getByText(/SGN/i).first()).toBeVisible();
    await expect(page.getByText(/Aggiungi tratta/i)).toHaveCount(0);
    await expect(page.getByTestId('organizza-destination-map')).toHaveCount(0);
  });
});
