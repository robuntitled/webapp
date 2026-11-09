import { test, expect } from '@playwright/test';

/**
 * Mobile Organizza redesign: Dove → Quando → Con chi → Voli → Riepilogo.
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

test.describe('organizza redesigned flow (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Dove search + sticky Continua + Quando + Con chi (no Gruppo)', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Organizza il tuo viaggio/i })
    ).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('dest-search').fill('Thailand');
    const th = page.getByTestId('dest-card-thailandia');
    await expect(th).toBeVisible();
    await th.click();
    await expect(page.getByText(/Selezionato:.*Thailandia/i)).toBeVisible();

    // Sticky Continua visible with selection
    const continua = page.getByRole('button', { name: /^Continua$/i });
    await expect(continua).toBeEnabled();
    await continua.click();

    await expect(page.getByRole('heading', { name: /Quando vuoi partire/i })).toBeVisible();
    await expect(page.getByText(/Date libere/i)).toHaveCount(0);

    const from = page.locator('input[type="date"]').first();
    const to = page.locator('input[type="date"]').nth(1);
    await from.fill('2026-12-10');
    await to.fill('2026-12-23');
    await expect(page.getByTestId('smart-flight-calendar').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\bn\/d\b/i);
    await continua.click();

    await expect(page.getByRole('heading', { name: /Con chi parti/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Gruppo/i })).toHaveCount(0);
    await page.getByRole('button', { name: /Con amici/i }).click();
    await expect(
      page.getByText(/Dopo la creazione vedrai il link invito/i)
    ).toBeVisible();
    await continua.click();

    await expect(page.getByRole('heading', { name: /Voli consigliati/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('curated multi-meta suggestions from Dove', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Organizza il tuo viaggio/i })
    ).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('dest-card-thailandia').click();
    await page.getByRole('button', { name: /Vuoi aggiungere un'altra meta/i }).click();
    await expect(page.getByText(/Cambogia|Malesia/i).first()).toBeVisible();
    await expect(page.getByText(/verificata/i).first()).toBeVisible();
  });

  test('non-curated free combo shows unverified notice', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Organizza il tuo viaggio/i })
    ).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('dest-card-thailandia').click();
    await page.getByRole('button', { name: /Vuoi aggiungere un'altra meta/i }).click();
    // Pick a same-continent neighbour that is not a curated pair (e.g. Giappone / Vietnam / Indonesia)
    const neighbour = page
      .getByRole('button', { name: /da verificare/i })
      .first();
    await expect(neighbour).toBeVisible({ timeout: 10_000 });
    await neighbour.click();
    await expect(
      page.getByText(/Combinazione non verificata: controlla collegamenti/i)
    ).toBeVisible();
    await expect(page.getByText(/Viaggiare Sicuri/i).first()).toBeVisible();
  });
});
