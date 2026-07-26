'use client';

import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';

type TripFlightBookSearchProps = {
  destination: string;
  startDate: string;
  endDate: string;
  defaultOriginIata?: string;
  adults?: number;
};

/** Wrapper trip-page: stessa UI OTA del hub Prenota. Cache separata; niente auto-search. */
export function TripFlightBookSearch({
  destination,
  startDate,
  endDate,
  defaultOriginIata = '',
  adults = 1,
}: TripFlightBookSearchProps) {
  return (
    <FlightSearchPanel
      defaultOrigin={defaultOriginIata}
      defaultDestination={destination}
      defaultStartDate={startDate}
      defaultEndDate={endDate}
      defaultAdults={adults}
      autoSearch={false}
      cacheKey="trip-flights"
    />
  );
}
