import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('DeterministicPlanPanel source contracts', () => {
  const src = readFileSync(
    new URL('./DeterministicPlanPanel.tsx', import.meta.url),
    'utf8'
  );

  it('uses plain-Italian gaps and collapsed Fonti', () => {
    expect(src).toContain('Da verificare prima di prenotare');
    expect(src).toContain('Fonti');
    expect(src).toContain('fontiOpen');
    expect(src).not.toContain('UNVERIFIED_POI');
    expect(src).not.toContain('fonte non verificata in pilot');
  });

  it('Organizza flow keeps plan/budget surfaces for riepilogo', () => {
    const flow = readFileSync(
      new URL('./OrganizzaFlow.tsx', import.meta.url),
      'utf8'
    );
    expect(flow).toMatch(/BudgetBreakdownCard|MultiCountryBudgetCard|planFromMaster/);
    expect(flow).toContain('FREE_TRIP_TEMPLATE_ID');
    expect(flow).toMatch(/Informazioni importanti|legalAck/);
  });
});
