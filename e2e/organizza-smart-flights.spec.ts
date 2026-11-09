import { test, expect } from '@playwright/test';

/**
 * Mobile Organizza redesign: Dove e quando → Voli → Riepilogo compatto.
 * Guest-safe: never hits paid booking; create-trip may require auth.
 */

test.beforeEach(async ({ page }) => {
  const share = process.env.PLAYWRIGHT_VERCEL_SHARE;
  if (share) {
    await page.goto(`/?_vercel_share=${share}`, { waitUntil: 'domcontentloaded' });
  }
});

test.describe('organizza smart flights (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dove e quando → multi-country sub-step → dates → voli → compact riepilogo', async ({
    page,
  }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /Organizza il tuo viaggio/i })
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Aggiungi un paese/i }).click();
    const vnKh = page.getByRole('button', { name: /Vietnam \+ Cambogia/i });
    await expect(vnKh).toBeVisible();
    await expect(vnKh.getByText(/Arrivo HAN · rientro da REP/i)).toBeVisible();
    await vnKh.click();

    const from = page.locator('input[type="date"]').first();
    const to = page.locator('input[type="date"]').nth(1);
    await from.fill('2026-12-10');
    await to.fill('2026-12-23');
    await expect(page.getByText(/14 giorni/i)).toBeVisible();

    // Smart calendar mounts after a date is set — no developer ops copy, no n/d
    await expect(page.getByTestId('smart-flight-calendar').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Concorrenza 2/i);
    await expect(page.locator('body')).not.toContainText(/\bn\/d\b/i);
    await expect(page.getByText(/giorni vicini se conviene/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^Continua$/i }).click();
    await expect(page.getByRole('heading', { name: /Voli consigliati/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('body')).not.toContainText(/schema cache/i);
    await expect(page.locator('body')).not.toContainText(/Could not find/i);
    await expect(page.locator('body')).not.toContainText(/liteapi/i);

    // Wait for search to settle, then pick a recommendation or soft-skip
    await expect(page.getByText(/Cerchiamo le tariffe/i)).toHaveCount(0, {
      timeout: 90_000,
    });
    const skip = page.getByRole('button', { name: /Continua senza tariffa ora/i });
    const pick = page
      .getByRole('button', { name: /Più conveniente|Più veloce|Equilibrato/i })
      .first();
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
    } else {
      await expect(pick).toBeVisible({ timeout: 10_000 });
      await pick.click();
    }

    const continua = page.getByRole('button', { name: /^Continua$/i });
    await expect(continua).toBeEnabled({ timeout: 10_000 });
    await continua.click();
    await expect(page.getByRole('heading', { name: /^Riepilogo$/i })).toBeVisible();

    await page.getByRole('button', { name: /Informazioni importanti/i }).click();
    await expect(page.getByText(/BOZZA, da revisione avvocato/i).first()).toBeVisible();
    await expect(page.getByText(/Ho letto le informazioni importanti/i)).toBeVisible();

    await page.getByRole('button', { name: /Itinerario \(tappe\)/i }).click();
    await expect(
      page.getByText(/Trasferimento|Vietnam|Cambogia|SGN|HAN|REP/i).first()
    ).toBeVisible();

    // No raw technical toasts on the surface
    await expect(page.locator('body')).not.toContainText(/PGRST/i);
    await expect(page.locator('body')).not.toContainText(/schema cache/i);
  });

  test('single destination free calendar without 7/14/21 primary presets', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Organizza il tuo viaggio/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /Thailandia/i }).first().click();
    await expect(page.getByText(/Niente preset fissi/i)).toBeVisible();
    // Old fixed-duration chips should not be the primary control
    await expect(page.getByRole('button', { name: /^7 giorni$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^14 giorni$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^21 giorni$/i })).toHaveCount(0);
  });
});
