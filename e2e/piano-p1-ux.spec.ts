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
});

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: path.join(ARTIFACTS, name),
    fullPage: true,
  });
}

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

const PUBLIC_SCREENS = [
  { path: '/', id: 'home', testId: 'public-landing' },
  { path: '/organizza', id: 'organizza', roleHeading: /Organizza|Imposta|Dove|Partenza/i },
  { path: '/gruppi', id: 'gruppi', testId: 'catalog-hero-search' },
  { path: '/prenota/voli', id: 'voli', text: /Voli|Partenza/i },
  { path: '/come-funziona', id: 'come-funziona', text: /Come funziona/i },
  { path: '/domande-frequenti', id: 'faq', text: /Domande frequenti/i },
  { path: '/regole-community', id: 'regole', text: /Regole|BOZZA/i },
  { path: '/assistenza', id: 'assistenza', text: /Supporto|Assistenza|Placeholder/i },
] as const;

for (const vp of [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
] as const) {
  test.describe(`P1 real pages @${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const screen of PUBLIC_SCREENS) {
      test(`${screen.id} renders without overflow`, async ({ page }) => {
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
        if ('testId' in screen && screen.testId) {
          await expect(page.getByTestId(screen.testId).first()).toBeVisible({
            timeout: 25_000,
          });
        } else if ('roleHeading' in screen && screen.roleHeading) {
          await expect(
            page.getByRole('heading', { name: screen.roleHeading }).first()
          ).toBeVisible({ timeout: 25_000 });
        } else if ('text' in screen && screen.text) {
          await expect(page.getByText(screen.text).first()).toBeVisible({
            timeout: 25_000,
          });
        }
        await assertNoHorizontalOverflow(page);
        await shot(page, `p1-${screen.id}-${vp.name}.png`);
      });
    }

    test('mobile tab bar present on home', async ({ page }) => {
      test.skip(vp.width > 500, 'tab bar is mobile-only');
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('mobile-tab-bar')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('mobile-tab-esplora')).toBeVisible();
      await expect(page.getByTestId('mobile-tab-organizza')).toBeVisible();
      await expect(page.getByTestId('mobile-tab-gruppi')).toBeVisible();
      await expect(page.getByTestId('mobile-tab-viaggi')).toBeVisible();
      await expect(page.getByTestId('mobile-tab-profilo')).toBeVisible();
      await shot(page, `p1-tabbar-${vp.name}.png`);
    });

    test('footer has Come funziona + Assistenza', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('footer-logo-home')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('link', { name: 'Come funziona' }).first()).toBeVisible();
      await expect(page.getByTestId('footer-supporto')).toBeVisible();
    });

    test('home does not claim fake open departures', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/Scopri 1 partenza/i);
      await expect(page.getByTestId('home-cta-organizza')).toBeVisible();
    });
  });
}

test.describe('P1 guest auth redirects', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('/pratiche → Accedi', async ({ page }) => {
    await page.goto('/pratiche', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/accedi/);
    await shot(page, 'p1-pratiche-guest-390.png');
  });

  test('/profilo → Accedi', async ({ page }) => {
    await page.goto('/profilo', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/accedi.*profilo/);
    await shot(page, 'p1-profilo-guest-390.png');
  });
});
