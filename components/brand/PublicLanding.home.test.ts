import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Smoke copy checks: home dual entrances without duplicate flight-hero CTAs. */
describe('PublicLanding home entrances', () => {
  const src = readFileSync(
    new URL('./PublicLanding.tsx', import.meta.url),
    'utf8'
  );

  it('offers equal Organizza / Gruppi hero CTAs', () => {
    expect(src).toContain('Organizza il tuo viaggio');
    expect(src).toContain('Parti con un gruppo');
    expect(src).toContain('Scopri le partenze');
  });

  it('keeps itinerary copy without the old Lasciati ispirare label', () => {
    expect(src).toContain('Esplora gli itinerari pronti');
    expect(src).not.toContain('Lasciati ispirare');
  });

  it('does not use Prenotabile for Thailand itinerary badge', () => {
    expect(src).toContain('Itinerario disponibile');
    expect(src).not.toMatch(/Prenotabile/);
  });

  it('Organizza card has only Vai a Organizza CTA (no shortcut buttons)', () => {
    expect(src).toContain('Vai a Organizza →');
    // Dead shortcut buttons removed from the Organizza entry card.
    expect(src).not.toMatch(/>Cerca voli</);
    expect(src).not.toMatch(/>Cerca hotel</);
    expect(src).not.toMatch(/>Esplora gli itinerari</);
    expect(src).not.toContain('href="/prenota/voli"');
    expect(src).not.toContain('href="/prenota/hotel"');
    // Hero equal-weight buttons should not be coral Cerca voli
    expect(src).not.toMatch(
      /min-w-\[12rem\][\s\S]{0,120}bg-\[var\(--color-cta\)\][\s\S]{0,80}Cerca voli/
    );
  });

  it('shows I miei viaggi instead of Accedi when logged in', () => {
    expect(src).toContain('USER_AREA_HREF');
    expect(src).toContain('isLoggedIn');
    expect(src).toContain('home-user-area');
  });
});
