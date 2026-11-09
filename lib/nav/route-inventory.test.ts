import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUTH_APP_ROUTES,
  FORBIDDEN_UI_ENGLISH,
  PUBLIC_APP_ROUTES,
} from '@/lib/nav/route-inventory';
import { HOME_HREF } from '@/lib/nav/home';

const ROOT = path.resolve(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('route inventory', () => {
  it('lists distinct public + auth routes', () => {
    const paths = [...PUBLIC_APP_ROUTES, ...AUTH_APP_ROUTES].map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(PUBLIC_APP_ROUTES.every((r) => r.logoShouldReachHome)).toBe(true);
  });

  it('Navbar logo uses HOME_HREF constant path', () => {
    const src = read('components/layout/Navbar.tsx');
    expect(src).toMatch(/HOME_HREF/);
    expect(src).toMatch(/data-testid="brand-logo-home"/);
    expect(src).not.toMatch(/href="\/"/);
  });

  it('middleware no longer bounces logged-in users from home', () => {
    const src = read('middleware.ts');
    expect(src).toMatch(/shouldBounceLoggedInFrom/);
    expect(src).not.toMatch(/pathname === '\/' \|\| pathname === '\/accedi'/);
  });
});

describe('Italian UI copy hygiene', () => {
  const surfaces = [
    'components/itineraries/OrganizzaWizard.tsx',
    'components/itineraries/ThailandPilotPlanPanel.tsx',
    'lib/itineraries/deterministic-planner/plan-destination.ts',
    'lib/itineraries/deterministic-planner/skeleton.ts',
    'components/layout/UserNav.tsx',
  ];

  it('strips forbidden English fragments from user-facing surfaces', () => {
    for (const file of surfaces) {
      const src = read(file);
      for (const bad of FORBIDDEN_UI_ENGLISH) {
        expect(src.toLowerCase(), `${file} contains "${bad}"`).not.toContain(
          bad.toLowerCase()
        );
      }
    }
  });

  it('riepilogo uses the Italian availability phrasing', () => {
    const src = read('components/itineraries/OrganizzaWizard.tsx');
    expect(src).toMatch(/disponibilità e prezzi da verificare/i);
    expect(src).not.toMatch(/bookability/i);
  });

  it('home constant is single source', () => {
    expect(HOME_HREF).toBe('/');
  });
});
