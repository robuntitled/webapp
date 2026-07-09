import { AffiliateSearchCard } from '@/components/travel/AffiliateSearchCard';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
} from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { formatTripDate } from '@/lib/utils/trip';

type TripBookingSectionProps = {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
};

export function TripBookingSection({
  tripId,
  destination,
  startDate,
  endDate,
  maxParticipants,
}: TripBookingSectionProps) {
  const config = getTravelpayoutsConfig();
  const flightUrl = buildTripFlightSearchUrl({
    tripId,
    destination,
    startDate,
    endDate,
    adults: Math.min(maxParticipants, 9),
  });
  const hotelUrl = buildTripHotelSearchUrl(tripId, {
    destination,
    startDate,
    endDate,
  });
  const prenotaPath = `/viaggi/${tripId}/prenota`;

  if (!config.isConfigured) {
    return <TravelpayoutsSetupNotice />;
  }

  if (config.mode === 'widget' && config.wlId) {
    return (
      <AffiliateSearchCard
        flightUrl={flightUrl}
        hotelUrl={hotelUrl}
        destination={`${destination} (${formatTripDate(startDate)} – ${formatTripDate(endDate)})`}
        title="Organizza il viaggio"
        prenotaPath={prenotaPath}
      />
    );
  }

  return (
    <AffiliateSearchCard
      flightUrl={flightUrl}
      hotelUrl={hotelUrl}
      destination={`${destination} (${formatTripDate(startDate)} – ${formatTripDate(endDate)})`}
      title="Organizza il viaggio"
      prenotaPath={prenotaPath}
    />
  );
}