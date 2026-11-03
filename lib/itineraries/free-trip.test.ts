import { describe, expect, it } from 'vitest';
import {
  FREE_TRIP_TEMPLATE_ID,
  isFreeTripTemplateId,
  practiceDestinationLabel,
} from '@/lib/itineraries/free-trip';

describe('free-trip helpers', () => {
  it('treats null / empty / viaggio-libero as free', () => {
    expect(isFreeTripTemplateId(null)).toBe(true);
    expect(isFreeTripTemplateId('')).toBe(true);
    expect(isFreeTripTemplateId(FREE_TRIP_TEMPLATE_ID)).toBe(true);
    expect(isFreeTripTemplateId('thailandia-10d')).toBe(false);
  });

  it('prefers template name then label then iata', () => {
    expect(
      practiceDestinationLabel({
        templateName: 'Thailandia',
        destinationLabel: 'Bangkok',
        destinationIata: 'BKK',
      })
    ).toBe('Thailandia');
    expect(
      practiceDestinationLabel({
        destinationLabel: 'Bangkok, Thailandia',
        destinationIata: 'BKK',
      })
    ).toBe('Bangkok, Thailandia');
    expect(practiceDestinationLabel({ destinationIata: 'bkk' })).toBe('BKK');
  });
});
