import { describe, expect, it } from 'vitest';
import { planThailandDeterministic } from '@/lib/itineraries/thailand-pilot/plan';
import { THAILAND_PROVENANCE } from '@/lib/itineraries/thailand-pilot/provenance';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';

describe('planThailandDeterministic', () => {
  it('rejects non-Thailand destinations honestly', () => {
    const r = planThailandDeterministic({
      destinationSlug: 'giappone',
      tripDays: 10,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.supported).toBe(false);
    expect(r.reason).toBe('unsupported_destination');
  });

  it('rejects impossible short durations', () => {
    const r = planThailandDeterministic({
      destinationSlug: 'thailandia',
      tripDays: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('impossible_duration');
  });

  it('matches curated 10d baseline length and keeps arrival/departure', () => {
    const baseline = findItineraryBySlug('thailandia', 10);
    expect(baseline?.days).toHaveLength(10);
    const r = planThailandDeterministic({
      destinationSlug: 'thailandia',
      tripDays: 10,
      arrivalIata: 'BKK',
      departureIata: 'BKK',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.templateId).toBe('thailandia-10d');
    expect(r.durationDays).toBe(10);
    expect(r.days[0]?.is_arrival).toBe(true);
    expect(r.days.at(-1)?.is_departure).toBe(true);
    expect(r.warnings.some((w) => w.code === 'budget_orientative_only')).toBe(true);
    expect(r.warnings.some((w) => w.code === 'unverified_transfer_timing')).toBe(true);
  });

  it('remaps 14d and 21d baselines without inventing extra destinations', () => {
    for (const n of [14, 21] as const) {
      const r = planThailandDeterministic({
        destinationSlug: 'thailandia',
        tripDays: n,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.durationDays).toBe(n);
      expect(r.templateId).toBe(`thailandia-${n}d`);
      const areas = new Set(r.days.map((d) => d.area_segment.toLowerCase()));
      for (const a of areas) {
        expect(['bangkok', 'islands', 'north']).toContain(a);
      }
    }
  });

  it('fits intermediate durations by dropping optional days first', () => {
    const r = planThailandDeterministic({
      destinationSlug: 'thailandia',
      tripDays: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.durationDays).toBe(8);
    expect(r.days[0]?.is_arrival).toBe(true);
    expect(r.days.at(-1)?.is_departure).toBe(true);
  });

  it('flags unverified POIs and attaches TAT provenance where matched', () => {
    const r = planThailandDeterministic({
      destinationSlug: 'thailandia',
      tripDays: 10,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const grand = r.days.flatMap((d) => d.pois).find((p) => /grand\s*palace/i.test(p.name));
    expect(grand?.provenance?.id).toBe('tat-grand-palace');
    expect(r.attributions.some((a) => a.id === 'tat-grand-palace')).toBe(true);
    expect(r.warnings.some((w) => w.code === 'unverified_poi')).toBe(true);
  });

  it('exposes seasonality warning outside TAT Koh Tao window when islands present', () => {
    const r = planThailandDeterministic({
      destinationSlug: 'thailandia',
      tripDays: 10,
      travelMonth: 8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => w.code === 'seasonality_hint_only')).toBe(true);
  });

  it('provenance registry has retrieval dates for every cited id', () => {
    for (const rec of Object.values(THAILAND_PROVENANCE)) {
      expect(rec.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rec.sourceUrl).toMatch(/^https:\/\//);
      expect(rec.attribution.length).toBeGreaterThan(3);
    }
  });
});
