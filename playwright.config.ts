import { defineConfig, devices } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Preview share cookies if provided
    extraHTTPHeaders: process.env.PLAYWRIGHT_VERCEL_BYPASS
      ? { 'x-vercel-protection-bypass': process.env.PLAYWRIGHT_VERCEL_BYPASS }
      : undefined,
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
