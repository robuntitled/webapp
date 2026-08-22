'use client';

import { Check, Copy, ExternalLink, Hotel, Plane, Ticket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  formatBookingMoney,
  formatFlightWhen,
  type ActivityBookingRecap,
  type FlightBookingRecap,
  type FlightLegRecap,
  type HotelBookingRecap,
} from '@/lib/itineraries/bookings';
import type { PracticeRow } from '@/lib/itineraries/types';

function formatDuration(mins?: number | null) {
  if (mins == null || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function CopyRef({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success('Codice copiato');
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          toast.error('Copia non riuscita');
        }
      }}
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {value}
    </button>
  );
}

function Leg({ label, leg }: { label: string; leg: FlightLegRecap }) {
  const duration = formatDuration(leg.durationMinutes);
  const stops =
    leg.stops == null ? null : leg.stops === 0 ? 'Diretto' : `${leg.stops} scalo${leg.stops > 1 ? 'i' : ''}`;
  return (
    <div className="rounded-2xl bg-[#0b1220] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-white">
        {leg.origin} → {leg.destination}
      </p>
      <p className="mt-1 text-sm text-white/80">
        {[leg.airline, leg.flightNumber, leg.cabinClass].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-1 text-sm text-white/70">
        {formatFlightWhen(leg.departureAt)}
        {leg.arrivalAt ? ` → ${formatFlightWhen(leg.arrivalAt)}` : ''}
      </p>
      {duration || stops ? (
        <p className="mt-1 text-xs text-white/50">{[duration, stops].filter(Boolean).join(' · ')}</p>
      ) : null}
    </div>
  );
}

export function FlightBookingCard({ flight }: { flight: FlightBookingRecap }) {
  const money = formatBookingMoney(flight.amountEur, flight.currency);
  const ref = flight.bookingRef || flight.bookingId;
  return (
    <section className="space-y-3 rounded-3xl bg-[#161d2b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          <Plane className="h-3.5 w-3.5" />
          Volo prenotato
        </p>
        {ref ? <CopyRef value={ref} /> : null}
      </div>
      <Leg label="Andata" leg={flight.outbound} />
      {flight.returnLeg ? <Leg label="Ritorno" leg={flight.returnLeg} /> : null}
      <p className="text-sm text-white/70">
        {[money, flight.status].filter(Boolean).join(' · ')}
      </p>
    </section>
  );
}

export function HotelBookingCard({ hotel }: { hotel: HotelBookingRecap }) {
  const money = formatBookingMoney(hotel.amountEur, hotel.currency);
  const ref = hotel.bookingRef || hotel.bookingId;
  return (
    <section className="space-y-2 rounded-3xl bg-[#161d2b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          <Hotel className="h-3.5 w-3.5" />
          Hotel prenotato
        </p>
        {ref ? <CopyRef value={ref} /> : null}
      </div>
      <p className="font-display text-xl font-semibold text-white">{hotel.hotelName}</p>
      <p className="text-sm text-white/75">
        {[hotel.city, hotel.address, hotel.roomName].filter(Boolean).join(' · ')}
      </p>
      {hotel.checkin && hotel.checkout ? (
        <p className="text-sm text-white/70">
          {hotel.checkin} → {hotel.checkout}
        </p>
      ) : null}
      {money ? <p className="text-sm text-white/70">{money}</p> : null}
    </section>
  );
}

export function ActivityBookingCard({ activity }: { activity: ActivityBookingRecap }) {
  const money = formatBookingMoney(activity.amountEur, activity.currency);
  return (
    <section className="space-y-2 rounded-3xl bg-[#161d2b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          <Ticket className="h-3.5 w-3.5" />
          {activity.provider === 'attractions' ? 'Attrazione' : 'Viator'}
        </p>
        {activity.bookingRef ? <CopyRef value={activity.bookingRef} /> : null}
      </div>
      <p className="font-display text-xl font-semibold text-white">{activity.title}</p>
      {money ? <p className="text-sm text-white/70">{money}</p> : null}
      {activity.bookingUrl ? (
        <a
          href={activity.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent"
        >
          Apri su Viator
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </section>
  );
}

export function BookingRecap({
  practice,
  compact = false,
  section = 'all',
}: {
  practice: PracticeRow;
  compact?: boolean;
  section?: 'all' | 'flight' | 'hotel' | 'activity';
}) {
  const flight = practice.flight_booking ?? null;
  const hotels = practice.hotel_bookings ?? [];
  const activities = practice.activity_bookings ?? [];
  const showFlight = section === 'all' || section === 'flight';
  const showHotel = section === 'all' || section === 'hotel';
  const showActivity = section === 'all' || section === 'activity';

  if (compact) {
    const bits = [
      showFlight && (flight?.bookingRef ? `Volo ${flight.bookingRef}` : practice.flight_confirmed_at ? 'Volo' : null),
      showHotel &&
        (hotels[0]?.bookingRef
          ? `Hotel ${hotels[0].bookingRef}`
          : practice.hotel_confirmed_at
            ? 'Hotel'
            : null),
      showActivity &&
        (activities.length
          ? `${activities.length} attività`
          : practice.activity_confirmed_at
            ? 'Viator'
            : null),
    ].filter(Boolean);
    if (!bits.length) return null;
    return <p className="text-xs font-medium text-white/75">{bits.join(' · ')}</p>;
  }

  return (
    <div className="space-y-3">
      {showFlight && flight ? <FlightBookingCard flight={flight} /> : null}
      {showFlight && !flight && practice.flight_confirmed_at ? (
        <p className="rounded-3xl bg-[#161d2b] p-4 text-sm text-white/80">
          Volo confermato. Il codice è nella tua email di conferma.
        </p>
      ) : null}
      {showHotel
        ? hotels.map((h, i) => <HotelBookingCard key={`${h.bookingRef ?? h.hotelName}-${i}`} hotel={h} />)
        : null}
      {showHotel && hotels.length === 0 && practice.hotel_confirmed_at ? (
        <p className="rounded-3xl bg-[#161d2b] p-4 text-sm text-white/80">Hotel confermato.</p>
      ) : null}
      {showActivity
        ? activities.map((a, i) => (
            <ActivityBookingCard key={`${a.title}-${i}`} activity={a} />
          ))
        : null}
    </div>
  );
}
