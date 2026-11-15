'use client';

import { format, parseISO, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HotelStay } from '@/lib/itineraries/dates';
import { nextPostFlightStep } from '@/lib/itineraries/practice-lifecycle';
import { getStayBookingProgress, isStayBooked } from '@/lib/itineraries/stay-progress';
import {
  listPracticeFlightBookings,
  practiceHasSuccessfulFlightBooking,
} from '@/lib/itineraries/practice-flights';
import { parseFlightStatus } from '@/lib/itineraries/bookings';
import type { PracticeRow } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

/** Mockup-style range: «16–19 gen». */
function formatStayRangeShort(checkin: string, checkout: string): string {
  const from = parseISO(checkin.slice(0, 10));
  const to = parseISO(checkout.slice(0, 10));
  const dayFrom = format(from, 'd', { locale: it });
  const dayTo = format(to, 'd', { locale: it });
  if (isSameMonth(from, to)) {
    return `${dayFrom}–${dayTo} ${format(to, 'MMM', { locale: it })}`;
  }
  return `${dayFrom} ${format(from, 'MMM', { locale: it })}–${dayTo} ${format(to, 'MMM', { locale: it })}`;
}

export type TripWhatsMissingCardProps = {
  practice: PracticeRow;
  stays: HotelStay[];
  onChooseHotel: (stayIdx: number) => void;
  className?: string;
};

/**
 * Hub «Cosa manca» — first unfinished post-flight step (hotel for first stay).
 * Reuses `nextPostFlightStep` + stay progress (PracticeBookingHub pattern).
 */
export function TripWhatsMissingCard({
  practice,
  stays,
  onChooseHotel,
  className,
}: TripWhatsMissingCardProps) {
  const hotels = practice.hotel_bookings ?? [];
  const stayProgress = getStayBookingProgress(stays, hotels);
  const postFlight = nextPostFlightStep(practice, {
    hotelsComplete: stayProgress.isComplete,
  });

  const hasSuccessfulFlight = practiceHasSuccessfulFlightBooking(practice);
  const bookings = listPracticeFlightBookings(practice);
  const firstLegHeld = bookings.some((b) => {
    const kind = parseFlightStatus(b.status);
    return kind === 'confirmed' || kind === 'pending' || kind === 'needs_review';
  });

  if (!hasSuccessfulFlight && !firstLegHeld) return null;
  if (postFlight !== 'hotel') return null;
  if (stayProgress.isComplete) return null;

  const stayIdx = stayProgress.nextStayIdx ?? 0;
  const stay = stays[stayIdx] ?? stays[0];
  if (!stay) return null;
  if (isStayBooked(stay, hotels)) return null;

  const range = formatStayRangeShort(stay.checkin, stay.checkout);

  return (
    <section
      className={cn(
        'flex flex-col gap-2 rounded-2xl border-2 border-primary bg-white p-4 shadow-sm',
        className
      )}
      data-testid="trip-cosa-manca"
      aria-label="Cosa manca"
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary">
        Cosa manca
      </p>
      <h3 className="font-display text-lg font-bold leading-snug text-[var(--color-text)]">
        Hotel a {stay.label || stay.city}, {range}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Il volo di andata è confermato. Ora scegli dove dormire.
      </p>
      <Button
        type="button"
        variant="cta"
        className="mt-1 min-h-11 w-full rounded-[10px] font-bold"
        onClick={() => onChooseHotel(stayIdx)}
        data-testid="trip-cosa-manca-hotel-cta"
      >
        <BedDouble className="h-[18px] w-[18px]" aria-hidden />
        Scegli l&apos;hotel
      </Button>
    </section>
  );
}
