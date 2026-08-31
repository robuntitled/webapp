import { describe, expect, it } from 'vitest';
import { INTEREST_KEYWORDS, keywordsForCategory, isValidKeywordId } from '@/lib/onboarding/keywords';
import { afterOnboardingPath, ONBOARDING_STEPS, postLoginPath } from '@/lib/onboarding/steps';
import { plannerFromKeywordIds } from '@/lib/onboarding/planner-from-keywords';
import { completeOnboardingSchema } from '@/lib/validations/onboarding';
import { coordsFromDestinationLabel } from '@/lib/trips/destination-coords';

describe('onboarding keywords', () => {
  it('covers trip_type, setting and experience', () => {
    expect(keywordsForCategory('trip_type').length).toBeGreaterThan(5);
    expect(keywordsForCategory('setting').length).toBeGreaterThan(4);
    expect(keywordsForCategory('experience').length).toBeGreaterThan(5);
    expect(INTEREST_KEYWORDS.every((k) => isValidKeywordId(k.id))).toBe(true);
  });

  it('maps keywords to a planner profile', () => {
    const profile = plannerFromKeywordIds(['adventure', 'outdoor', 'nature']);
    expect(profile.travelStyle).toBe('adventure');
    expect(profile.interests).toContain('adventure');
  });
});

describe('onboarding paths', () => {
  it('has three steps then itinerari or partenze', () => {
    expect(ONBOARDING_STEPS).toEqual(['model', 'home', 'intent']);
  });

  it('sends incomplete users to onboarding', () => {
    expect(postLoginPath({ onboardingCompleted: false })).toBe('/onboarding');
  });

  it('sends returning users to itinerari', () => {
    expect(postLoginPath({ onboardingCompleted: true, travelIntent: 'create' })).toBe(
      '/destinazioni'
    );
  });

  it('branches after first onboarding', () => {
    expect(afterOnboardingPath('create')).toBe('/destinazioni');
    expect(afterOnboardingPath('book')).toBe('/partenze');
  });
});

describe('completeOnboardingSchema', () => {
  it('accepts intent and home without keyword categories', () => {
    const result = completeOnboardingSchema.safeParse({
      intent: 'book',
      keywordIds: [],
      home: { city: 'Roma', lat: 41.9, lng: 12.5 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a complete payload', () => {
    const result = completeOnboardingSchema.safeParse({
      intent: 'create',
      keywordIds: ['city_break', 'city', 'food_wine'],
      home: { city: 'Milano', country: 'Italia', lat: 45.46, lng: 9.19 },
    });
    expect(result.success).toBe(true);
  });
});

describe('destination coords', () => {
  it('resolves catalog destinations', () => {
    expect(coordsFromDestinationLabel('Lisbona')).toBeNull();
    expect(coordsFromDestinationLabel('Portogallo')).toEqual({
      lat: 38.7223,
      lng: -9.1393,
    });
  });
});
