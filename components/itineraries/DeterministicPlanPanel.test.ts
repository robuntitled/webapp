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

  it('OrganizzaWizard mounts DeterministicPlanPanel for any destination', () => {
    const wiz = readFileSync(
      new URL('./OrganizzaWizard.tsx', import.meta.url),
      'utf8'
    );
    expect(wiz).toContain('DeterministicPlanPanel');
    expect(wiz).toContain('otherDestinations');
    expect(wiz).toContain('FREE_TRIP_TEMPLATE_ID');
    expect(wiz).toContain('showLegalDraft');
  });
});
