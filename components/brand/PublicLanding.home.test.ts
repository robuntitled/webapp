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

  it('renames Lasciati ispirare to Esplora gli itinerari', () => {
    expect(src).toContain('Esplora gli itinerari');
    expect(src).not.toContain('Lasciati ispirare');
  });

  it('does not use Prenotabile for Thailand itinerary badge', () => {
    expect(src).toContain('Itinerario disponibile');
    expect(src).not.toMatch(/Prenotabile/);
  });

  it('keeps flights/hotels inside Organizza, not as sole hero comparator', () => {
    expect(src).toContain('href="/prenota/voli"');
    expect(src).toContain('href="/prenota/hotel"');
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
