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

/** Real tap: center of control must not be covered by the mobile tab bar. */
async function assertNotCoveredByTabBar(
  page: import('@playwright/test').Page,
  testId: string
) {
  const btn = page.getByTestId(testId);
  await expect(btn).toBeVisible({ timeout: 20_000 });
  const box = await btn.boundingBox();
  expect(box).toBeTruthy();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  const top = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!el) return null;
      const tab = el.closest('[data-testid="mobile-tab-bar"]');
      return {
        coveredByTab: Boolean(tab),
        hitTestId:
          el.getAttribute('data-testid') ||
          el.closest('[data-testid]')?.getAttribute('data-testid') ||
          null,
      };
    },
    { x: cx, y: cy }
  );
  expect(top?.coveredByTab).toBe(false);
  expect(String(top?.hitTestId ?? '')).not.toMatch(/^mobile-tab/);
}

const PUBLIC_SCREENS = [
  { path: '/', id: 'home', testId: 'public-landing' },
  { path: '/organizza', id: 'organizza', roleHeading: /Organizza|Imposta|Dove|Partenza/i },
  { path: '/gruppi', id: 'gruppi', testId: 'catalog-hero-search' },
  { path: '/prenota/voli', id: 'voli', text: /Voli|Partenza/i },
  { path: '/come-funziona', id: 'come-funziona', text: /Come funziona/i },
  { path: '/domande-frequenti', id: 'faq', text: /Domande frequenti/i },
  { path: '/regole-community', id: 'regole', text: /Regole|BOZZA/i },
  { path: '/supporto', id: 'supporto', text: /Supporto/i },
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
        await shot(page, `v2-${screen.id}-${vp.name}.png`);
      });
    }

    test('mobile tab bar present on home', async ({ page }) => {
      test.skip(vp.width > 500, 'tab bar is mobile-only');
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('mobile-tab-bar')).toBeVisible({ timeout: 20_000 });
      await shot(page, `v2-tabbar-${vp.name}.png`);
    });

    test('footer has Supporto; draft pages hidden; no owner placeholder', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('footer-logo-home')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('footer-supporto')).toBeVisible();
      const footer = await page.locator('footer').innerText();
      expect(footer).not.toMatch(/Come funziona|Domande frequenti|Regole della community/i);
      expect(footer).not.toMatch(/segnaposto|decisione owner|DB-\d+/i);
      await shot(page, `v3-footer-${vp.name}.png`);
    });

    test('tab bar visible on Voli search; hidden on Organizza', async ({ page }) => {
      test.skip(vp.width > 500, 'tab bar is mobile-only');
      await page.goto('/prenota/voli', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('mobile-tab-bar')).toBeVisible({ timeout: 20_000 });
      await shot(page, `v3-voli-tabbar-${vp.name}.png`);
      await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('mobile-tab-bar')).toHaveCount(0);
    });

    test('Gruppi search input is at least 44px tall', async ({ page }) => {
      await page.goto('/gruppi', { waitUntil: 'domcontentloaded' });
      const input = page.getByTestId('catalog-hero-search-input');
      await expect(input).toBeVisible({ timeout: 20_000 });
      const box = await input.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await shot(page, `v3-gruppi-search-${vp.name}.png`);
    });

    test('home hero H1 is white; no fake open counter', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('public-landing')).toBeVisible({ timeout: 20_000 });
      const h1 = page.getByTestId('public-landing').locator('h1').first();
      await expect(h1).toBeVisible();
      const color = await h1.evaluate((el) => getComputedStyle(el).color);
      // rgb(255, 255, 255) or rgba(255,255,255,*)
      expect(color.replace(/\s/g, '')).toMatch(/rgba?\(255,255,255/);
      const body = await page.locator('body').innerText();
      expect(body).not.toMatch(/\d+\s+partenze?\s+con\s+iscrizioni\s+aperte/i);
      expect(body).not.toMatch(/Scopri 1 partenza/i);
      await shot(page, `v2-home-hero-${vp.name}.png`);
    });
  });
}

test.describe('BLOCKING: Organizza Continua not covered @390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tab bar hidden; Continua real-click advances; Crea viaggio reachable', async ({
    page,
  }) => {
    await page.goto('/organizza', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('organizza-imposta')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('mobile-tab-bar')).toHaveCount(0);

    await page.getByTestId('dest-card-thailandia').click();
    await assertNotCoveredByTabBar(page, 'organizza-continua');
    await page.getByTestId('organizza-continua').click({ force: false });
    await expect(page.getByTestId('organizza-partenza')).toBeVisible({ timeout: 15_000 });
    await assertNotCoveredByTabBar(page, 'organizza-continua');
    await shot(page, 'v2-organizza-continua-click-390.png');

    // Inject a complete draft so itinerario + «Crea viaggio» are reachable without live flight search.
    await page.evaluate(() => {
      const offer = {
        offerId: 'e2e-offer',
        price: 280.82,
        currency: 'EUR',
        originIata: 'MXP',
        destinationIata: 'BKK',
        departureAt: '2026-12-10T09:00:00Z',
        arrivalAt: '2026-12-10T22:00:00Z',
        stops: 0,
        durationMinutes: 600,
        airline: 'Example Air',
        capturedAt: Date.now(),
      };
      const draft = {
        slug: 'thailandia',
        slugs: ['thailandia'],
        vibe: null,
        durationDays: 10,
        company: 'solo',
        travelers: 1,
        originIata: 'MXP',
        homeReturnIata: 'MXP',
        arrivalIata: 'BKK',
        departureIata: 'BKK',
        dateFrom: '2026-12-10',
        dateTo: '2026-12-20',
        returnHome: true,
        tripType: 'roundtrip',
        domesticPlan: null,
        flightPlan: {
          shape: 'roundtrip',
          returnHome: true,
          homeOriginIata: 'MXP',
          homeReturnIata: 'MXP',
          legs: [
            {
              id: 'leg-out',
              kind: 'outbound',
              originIata: 'MXP',
              destinationIata: 'BKK',
              date: '2026-12-10',
              passengers: 1,
              offer,
              status: 'selected',
              labelIt: 'Andata',
            },
            {
              id: 'leg-ret',
              kind: 'return',
              originIata: 'BKK',
              destinationIata: 'MXP',
              date: '2026-12-20',
              passengers: 1,
              offer: { ...offer, offerId: 'e2e-offer-ret', originIata: 'BKK', destinationIata: 'MXP' },
              status: 'selected',
              labelIt: 'Ritorno',
            },
          ],
        },
        selectedFlight: {
          offerId: 'e2e-offer',
          price: 280.82,
          currency: 'EUR',
        },
      };
      localStorage.setItem(
        'nl-organizza-draft-v4',
        JSON.stringify({ draft, step: 'itinerario', savedAt: Date.now(), version: 4 })
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('mobile-tab-bar')).toHaveCount(0);
    const crea = page.getByRole('button', { name: /Crea viaggio/i });
    await expect(crea).toBeVisible({ timeout: 25_000 });
    await crea.scrollIntoViewIfNeeded();
    const box = await crea.boundingBox();
    expect(box).toBeTruthy();
    const top = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null;
        return el?.closest('button')?.textContent?.trim() ?? el?.tagName ?? null;
      },
      { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
    );
    expect(String(top)).toMatch(/Crea viaggio/i);
    await crea.click({ force: false });
    await shot(page, 'v2-organizza-crea-viaggio-click-390.png');
  });
});

test.describe('P1 guest auth redirects', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('/pratiche → Accedi', async ({ page }) => {
    await page.goto('/pratiche', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/accedi/);
    await shot(page, 'v3-pratiche-guest-390.png');
  });

  test('/profilo → Accedi', async ({ page }) => {
    await page.goto('/profilo', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/accedi.*profilo/);
    await shot(page, 'v3-profilo-guest-390.png');
  });

  test('Password dimenticata? is hidden until reset is wired', async ({ page }) => {
    await page.goto('/accedi', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('password-forgot-link')).toHaveCount(0);
    await expect(page.getByText(/Password dimenticata/i)).toHaveCount(0);
    await shot(page, 'v3-accedi-no-forgot-390.png');
  });

  test('Supporto title is not doubled', async ({ page }) => {
    await page.goto('/supporto', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title).toMatch(/^Supporto/);
    expect(title).not.toMatch(/Noivia — Noivia|Supporto — Noivia — Noivia/);
    await shot(page, 'v3-supporto-title-390.png');
  });

  test('404 page has proper title', async ({ page }) => {
    await page.goto('/pagina-inesistente-verifica-3', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title).toMatch(/Pagina non trovata/);
    expect(title).not.toMatch(/Noivia — Noivia/);
    await expect(page.getByRole('heading', { name: 'Pagina non trovata' })).toBeVisible();
    await shot(page, 'v3-404-title-390.png');
  });

  test('tab bar hidden on checkout path', async ({ page }) => {
    await page.goto('/prenota/voli/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('mobile-tab-bar')).toHaveCount(0);
    await shot(page, 'v3-checkout-no-tabbar-390.png');
  });
});
