/**
 * Capture Organizza step screenshots on a preview (mobile viewport).
 * Usage: PLAYWRIGHT_BASE_URL=… PLAYWRIGHT_VERCEL_SHARE=… node scripts/organizza-step-shots.mjs
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const share = process.env.PLAYWRIGHT_VERCEL_SHARE || '';
const outDir = '/opt/cursor/artifacts';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  locale: 'it-IT',
});
const page = await context.newPage();

await page.addInitScript(() => {
  try {
    localStorage.setItem('consent-v1', 'accepted');
  } catch {}
  document.cookie = 'consent-v1=accepted; path=/; max-age=31536000; SameSite=Lax';
});

if (share) {
  await page.goto(`${base}/?_vercel_share=${share}`, { waitUntil: 'domcontentloaded' });
}

await page.goto(`${base}/organizza`, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Organizza il tuo viaggio/i }).waitFor({ timeout: 20000 });
await page.screenshot({ path: `${outDir}/organizza-01-dove.png`, fullPage: true });

await page.getByTestId('dest-card-thailandia').click();
await page.getByRole('button', { name: /Vuoi aggiungere un'altra meta/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/organizza-02-dove-multi.png`, fullPage: true });

await page.getByRole('button', { name: /^Continua$/i }).click();
await page.getByRole('heading', { name: /Quando vuoi partire/i }).waitFor();
await page.locator('input[type="date"]').first().fill('2026-12-10');
await page.locator('input[type="date"]').nth(1).fill('2026-12-23');
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/organizza-03-quando.png`, fullPage: true });

await page.getByRole('button', { name: /^Continua$/i }).click();
await page.getByRole('heading', { name: /Con chi parti/i }).waitFor();
await page.getByRole('button', { name: /Con amici/i }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/organizza-04-con-chi.png`, fullPage: true });

await page.getByRole('button', { name: /^Continua$/i }).click();
await page.getByRole('heading', { name: /Voli consigliati/i }).waitFor({ timeout: 20000 });
const skip = page.getByRole('button', { name: /Continua senza tariffa ora/i });
const pick = page.getByRole('button', { name: /Più conveniente|Più veloce|Equilibrato/i }).first();
await page.waitForTimeout(2000);
if (await skip.isVisible().catch(() => false)) await skip.click();
else if (await pick.isVisible().catch(() => false)) await pick.click();
await page.screenshot({ path: `${outDir}/organizza-05-voli.png`, fullPage: true });

const continua = page.getByRole('button', { name: /^Continua$/i });
if (await continua.isEnabled().catch(() => false)) {
  await continua.click();
  await page.getByRole('heading', { name: /^Riepilogo$/i }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${outDir}/organizza-06-riepilogo.png`, fullPage: true });
}

console.log('shots written to', outDir);
await browser.close();
