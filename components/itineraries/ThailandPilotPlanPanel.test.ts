import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildThailandPilotPlan } from '@/lib/itineraries/thailand-pilot/ui-plan';

describe('buildThailandPilotPlan (UI wiring)', () => {
  it('returns day route + warnings for Thailand inputs', () => {
    const plan = buildThailandPilotPlan({
      destinationSlug: 'thailandia',
      tripDays: 10,
      vibe: 'relax',
      travelMonth: 3,
      arrivalIata: 'BKK',
      departureIata: 'BKK',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.days.length).toBe(10);
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.attributions.length).toBeGreaterThan(0);
    expect(plan.warnings.some((w) => w.code === 'budget_orientative_only')).toBe(true);
  });

  it('preserves unsupported destination behavior', () => {
    const plan = buildThailandPilotPlan({
      destinationSlug: 'giappone',
      tripDays: 10,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.reason).toBe('unsupported_destination');
  });
});

describe('ThailandPilotPlanPanel source contracts', () => {
  const src = readFileSync(
    new URL('./ThailandPilotPlanPanel.tsx', import.meta.url),
    'utf8'
  );

  it('does not claim live bookability or guaranteed feasibility', () => {
    expect(src).toMatch(/Non.*bookability live/i);
    expect(src).toMatch(/fattibilità/i);
    expect(src).toContain('AllegatoBLinkedNotice');
  });

  it('OrganizzaWizard mounts pilot on Thailand date/riepilogo', () => {
    const wiz = readFileSync(
      new URL('./OrganizzaWizard.tsx', import.meta.url),
      'utf8'
    );
    expect(wiz).toContain('ThailandPilotPlanPanel');
    expect(wiz).toContain('THAILAND_DESTINATION_SLUG');
    expect(wiz).toContain('showLegalDraft');
    expect(wiz).toContain('arrivalIata');
  });
});
