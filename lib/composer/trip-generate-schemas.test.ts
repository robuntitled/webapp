import { describe, expect, it } from 'vitest';
import {
  composerTripGenerateRequestSchema,
  composerTripGenerateResponseSchema,
} from '@/lib/composer/trip-generate-schemas';
import { MAX_TRIP_DAYS } from '@/lib/composer/trip-limits';

function days(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    dayIndex: i + 1,
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
  }));
}

const validRequest = {
  destination: 'Sydney, Australia',
  destinationMeta: { label: 'Sydney', lat: -33.87, lng: 151.21, countryCode: 'AU' },
  startDate: '2026-09-01',
  endDate: '2026-09-05',
  days: days(5),
  planningMode: 'group' as const,
  maxParticipants: 4,
  organizerOrigin: {
    id: 'o1',
    label: 'Roma Fiumicino',
    city: 'Roma',
    iata: 'FCO',
    role: 'organizer' as const,
  },
  roundtrip: true,
};

describe('composerTripGenerateRequestSchema', () => {
  it('accepts a complete request', () => {
    expect(composerTripGenerateRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it('accepts a minimal request without origin or meta', () => {
    const { destinationMeta, organizerOrigin, roundtrip, ...minimal } = validRequest;
    void destinationMeta;
    void organizerOrigin;
    void roundtrip;
    expect(composerTripGenerateRequestSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects malformed dates', () => {
    expect(
      composerTripGenerateRequestSchema.safeParse({ ...validRequest, startDate: '01/09/2026' })
        .success
    ).toBe(false);
    expect(
      composerTripGenerateRequestSchema.safeParse({
        ...validRequest,
        days: [{ dayIndex: 1, date: 'domani' }],
      }).success
    ).toBe(false);
  });

  it('requires at least one day and caps the trip length', () => {
    expect(
      composerTripGenerateRequestSchema.safeParse({ ...validRequest, days: [] }).success
    ).toBe(false);
    expect(
      composerTripGenerateRequestSchema.safeParse({
        ...validRequest,
        days: days(MAX_TRIP_DAYS + 1),
      }).success
    ).toBe(false);
    expect(
      composerTripGenerateRequestSchema.safeParse({ ...validRequest, days: days(MAX_TRIP_DAYS) })
        .success
    ).toBe(true);
  });

  it('rejects an invalid IATA origin', () => {
    const bad = {
      ...validRequest,
      organizerOrigin: { ...validRequest.organizerOrigin, iata: 'ROMA' },
    };
    expect(composerTripGenerateRequestSchema.safeParse(bad).success).toBe(false);
  });
});

describe('composerTripGenerateResponseSchema', () => {
  const validResponse = {
    tripTitle: 'Sydney in 5 giorni',
    days: [
      {
        dayIndex: 1,
        date: '2026-09-01',
        suggestedTitle: 'Arrivo a Sydney',
        blocks: [],
      },
    ],
    warnings: [],
    meta: {
      source: 'ai' as const,
      generatedAt: new Date().toISOString(),
      latencyMs: 1234,
      model: 'gemini-2.0-flash',
      version: 'trip-v1',
      daysFilled: 5,
      blocksTotal: 22,
      enrichment: { flights: true, hotels: false, activities: true, transfers: false },
    },
  };

  it('accepts a well-formed response', () => {
    expect(composerTripGenerateResponseSchema.safeParse(validResponse).success).toBe(true);
  });

  it('requires the enrichment flags', () => {
    const { enrichment, ...meta } = validResponse.meta;
    void enrichment;
    expect(
      composerTripGenerateResponseSchema.safeParse({ ...validResponse, meta }).success
    ).toBe(false);
  });

  it('rejects an unknown source', () => {
    expect(
      composerTripGenerateResponseSchema.safeParse({
        ...validResponse,
        meta: { ...validResponse.meta, source: 'guess' },
      }).success
    ).toBe(false);
  });
});
