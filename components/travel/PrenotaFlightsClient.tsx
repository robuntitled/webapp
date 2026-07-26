'use client';

import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';

export function PrenotaFlightsClient() {
  return (
    <FlightSearchPanel
      defaultOrigin="MIL"
      defaultDestination="Londra"
      defaultAdults={1}
      autoSearch
    />
  );
}
