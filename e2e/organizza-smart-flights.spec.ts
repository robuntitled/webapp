import { test, expect } from '@playwright/test';

/**
 * Organizza 4 fasi: Imposta → Partenza → Voli → Itinerario.
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

test.describe('organizza 4 fasi (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('stepper has four stages; mobile shows current label', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('organizza-stepper')).toBeVisible({ timeout: 20_000 });
    const stepper = page.getByTestId('organizza-stepper');
    await expect(stepper.locator('li')).toHaveCount(4);
    await expect(stepper.getByText('Imposta', { exact: true })).toBeVisible();
  });

  test('Imposta dest only then Partenza requires empty origin', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('organizza-imposta')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('dest-card-thailandia').click();
    await page.getByTestId('organizza-continua').click();
    await expect(page.getByTestId('organizza-partenza')).toBeVisible();
    await expect(page.getByTestId('organizza-airports')).toBeVisible();
    // Departure not prefilled with MXP
    const origin = page.getByLabel(/Aeroporto di partenza/i);
    await expect(origin).toHaveValue('');
    await expect(page.getByTestId('organizza-continua')).toBeDisabled();
  });

  test('amici −/+ stepper and clearable field', async ({ page }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('dest-card-thailandia').click();
    await page.getByTestId('organizza-continua').click();
    await expect(page.getByTestId('organizza-partenza')).toBeVisible();
    await page.getByTestId('company-amici').click();
    await expect(page.getByTestId('amici-stepper')).toBeVisible();
    const input = page.getByTestId('amici-count-input');
    await expect(input).toHaveValue('3');
    await page.getByTestId('amici-plus').click();
    await expect(input).toHaveValue('4');
    await page.getByTestId('amici-minus').click();
    await expect(input).toHaveValue('3');
    await input.fill('');
    await expect(input).toHaveValue('');
    await input.blur();
    await expect(input).toHaveValue('2');
  });
});
