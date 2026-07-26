'use client';

import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';

export function PrenotaFlightsClient() {
  return <FlightSearchPanel defaultAdults={1} cacheKey="flights" />;
}
