import { Hotel, Plane, Ticket } from 'lucide-react';
import {
  formatBookingMoney,
  formatFlightWhen,
  type ActivityBookingRecap,
  type FlightBookingRecap,
  type HotelBookingRecap,
} from '@/lib/itineraries/bookings';
import type { PracticeRow } from '@/lib/itineraries/types';

function Leg({
  label,
  leg,
}: {
  label: string;
  leg: FlightBookingRecap['outbound'];
}) {
  return (
    <p className="text-sm text-white/80">
      <span className="font-semibold text-white">{label}</span> {leg.origin} → {leg.destination}
      {leg.flightNumber ? ` · ${leg.flightNumber}` : ''}
      {leg.airline ? ` · ${leg.airline}` : ''}
      <span className="block text-xs text-white/55">{formatFlightWhen(leg.departureAt)}</span>
    </p>
  );
}

export function BookingRecap({
  practice,
  compact = false,
}: {
  practice: PracticeRow;
  compact?: boolean;
}) {
  const flight = practice.flight_booking ?? null;
  const hotels = practice.hotel_bookings ?? [];
  const activities = practice.activity_bookings ?? [];
  const empty = !flight && hotels.length === 0 && activities.length === 0;
  if (empty && !practice.flight_confirmed_at && !practice.hotel_confirmed_at && !practice.activity_confirmed_at) {
    return compact ? null : (
      <p className="text-sm text-white/55">Nessuna prenotazione salvata ancora.</p>
    );
  }

  if (compact) {
    const bits = [
      flight?.bookingRef ? `Volo ${flight.bookingRef}` : practice.flight_confirmed_at ? 'Volo' : null,
      hotels[0]?.bookingRef
        ? `Hotel ${hotels[0].bookingRef}`
        : practice.hotel_confirmed_at
          ? 'Hotel'
          : null,
      activities.length
        ? `${activities.length} attività`
        : practice.activity_confirmed_at
          ? 'Viator'
          : null,
    ].filter(Boolean);
    if (!bits.length) return null;
    return <p className="text-xs font-medium text-white/75">{bits.join(' · ')}</p>;
  }

  return (
    <div className="space-y-3">
      {flight ? (
        <section className="rounded-3xl bg-[#161d2b] p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            <Plane className="h-3.5 w-3.5" />
            Volo
          </p>
          <p className="mt-2 font-display text-lg font-semibold text-white">
            {flight.bookingRef || flight.bookingId || 'Confermato'}
          </p>
          <div className="mt-2 space-y-2">
            <Leg label="Andata" leg={flight.outbound} />
            {flight.returnLeg ? <Leg label="Ritorno" leg={flight.returnLeg} /> : null}
          </div>
          {formatBookingMoney(flight.amountEur, flight.currency) ? (
            <p className="mt-2 text-sm text-white/70">
              {formatBookingMoney(flight.amountEur, flight.currency)}
            </p>
          ) : null}
        </section>
      ) : practice.flight_confirmed_at ? (
        <p className="rounded-3xl bg-[#161d2b] p-4 text-sm text-white/80">Volo confermato.</p>
      ) : null}

      {hotels.map((h: HotelBookingRecap, i: number) => (
        <section key={`${h.bookingRef ?? h.hotelName}-${i}`} className="rounded-3xl bg-[#161d2b] p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            <Hotel className="h-3.5 w-3.5" />
            Hotel
          </p>
          <p className="mt-2 font-display text-lg font-semibold text-white">{h.hotelName}</p>
          <p className="text-sm text-white/70">
            {h.bookingRef || h.bookingId || 'Confermato'}
            {h.city ? ` · ${h.city}` : ''}
          </p>
          {h.checkin && h.checkout ? (
            <p className="text-xs text-white/55">
              {h.checkin} → {h.checkout}
            </p>
          ) : null}
          {formatBookingMoney(h.amountEur, h.currency) ? (
            <p className="mt-1 text-sm text-white/70">
              {formatBookingMoney(h.amountEur, h.currency)}
            </p>
          ) : null}
        </section>
      ))}

      {activities.map((a: ActivityBookingRecap, i: number) => (
        <section key={`${a.title}-${i}`} className="rounded-3xl bg-[#161d2b] p-4">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            <Ticket className="h-3.5 w-3.5" />
            Viator
          </p>
          <p className="mt-2 font-display text-lg font-semibold text-white">{a.title}</p>
          {a.bookingRef ? <p className="text-sm text-white/70">Codice: {a.bookingRef}</p> : null}
          {formatBookingMoney(a.amountEur, a.currency) ? (
            <p className="text-sm text-white/70">{formatBookingMoney(a.amountEur, a.currency)}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
