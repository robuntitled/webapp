'use client';

import { useRouter } from 'next/navigation';
import { BedDouble, MapPin, Plane, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isCheckoutBookable } from '@/lib/composer/bookable-picks';
import type { ComposerBookablePick } from '@/types/composer';
import { saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import { saveHotelOfferDraft } from '@/lib/travel/hotel-offer-draft';
import { toast } from 'sonner';

function kindIcon(kind: ComposerBookablePick['kind']) {
  if (kind === 'flight') return Plane;
  if (kind === 'hotel') return BedDouble;
  if (kind === 'activity') return Ticket;
  return MapPin;
}

function providerLabel(pick: ComposerBookablePick): string {
  if (pick.provider === 'liteapi') return 'LiteAPI';
  if (pick.provider === 'viator') return 'Viator';
  return 'Google Places';
}

type SavedTripBookablesProps = {
  picks: ComposerBookablePick[];
  startDate?: string;
  endDate?: string;
  adults?: number;
  variant?: 'dark' | 'light';
  allowCheckout?: boolean;
  layout?: 'list' | 'cards' | 'rail';
};

export function SavedTripBookables({
  picks,
  startDate,
  endDate,
  adults = 1,
  variant = 'light',
  allowCheckout = true,
  layout = 'list',
}: SavedTripBookablesProps) {
  const router = useRouter();
  if (!picks.length) return null;

  const bookable = picks.filter(isCheckoutBookable);
  const places = picks.filter((p) => !isCheckoutBookable(p));
  const dark = variant === 'dark';

  const book = (pick: ComposerBookablePick) => {
    if (pick.kind === 'flight' && pick.offerId && pick.origin && pick.destinationIata && pick.price != null) {
      saveFlightCheckoutDraft({
        offerId: pick.offerId,
        price: pick.price,
        currency: pick.currency ?? 'EUR',
        outbound: {
          origin: pick.origin,
          destination: pick.destinationIata,
          airline: pick.airline ?? null,
          airlineCode: pick.airlineCode,
          airlineLogo: pick.airlineLogo,
          departureAt: pick.departureAt,
          arrivalAt: pick.arrivalAt,
          durationMinutes: pick.durationMinutes,
          stops: pick.stops,
          flightNumber: pick.flightNumber,
          cabinClass: pick.cabinClass,
        },
        returnLeg:
          pick.hasReturn && pick.returnOrigin && pick.returnDestination
            ? {
                origin: pick.returnOrigin,
                destination: pick.returnDestination,
                airline: pick.returnAirline ?? pick.airline ?? null,
                airlineCode: pick.returnAirlineCode,
                airlineLogo: pick.returnAirlineLogo,
                departureAt: pick.returnDepartureAt,
                arrivalAt: pick.returnArrivalAt,
                durationMinutes: pick.returnDurationMinutes,
                stops: pick.returnStops,
                flightNumber: pick.returnFlightNumber,
              }
            : null,
        adults,
        tripType: pick.hasReturn ? 'roundtrip' : 'oneway',
        createdAt: Date.now(),
      });
      router.push('/prenota/voli/checkout');
      return;
    }
    if (pick.kind === 'hotel' && pick.hotelId && pick.offerId && pick.price != null) {
      saveHotelOfferDraft({
        hotelId: pick.hotelId,
        name: pick.title,
        address: pick.address ?? null,
        city: pick.city ?? null,
        photo: pick.photoUrl ?? null,
        stars: pick.stars ?? null,
        rating: pick.rating ?? null,
        roomName: pick.roomName ?? 'Camera',
        boardName: pick.boardName ?? null,
        offerId: pick.offerId,
        totalAmount: pick.price,
        currency: pick.currency ?? 'EUR',
        freeCancellation: Boolean(pick.freeCancellation),
        checkin: pick.checkIn ?? startDate ?? '',
        checkout: pick.checkOut ?? endDate ?? '',
        adults,
        savedAt: Date.now(),
      });
      router.push('/prenota/hotel/checkout');
      return;
    }
    if (pick.kind === 'activity' && pick.bookingUrl) {
      window.open(pick.bookingUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    toast.message('Questa tappa è sulla mappa, ma non è prenotabile da LiteAPI/Viator.');
  };

  if (layout === 'cards' || layout === 'rail') {
    return (
      <ul
        className={
          layout === 'rail'
            ? 'grid auto-cols-[minmax(220px,260px)] grid-flow-col gap-3 overflow-x-auto pb-1'
            : 'grid gap-3 sm:grid-cols-2'
        }
      >
        {picks.map((pick) => {
          const Icon = kindIcon(pick.kind);
          const canBookThis = allowCheckout && isCheckoutBookable(pick);
          return (
            <li
              key={pick.id}
              className="overflow-hidden rounded-2xl border border-border/50 bg-muted/10 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)]"
            >
              <div className="relative h-28 bg-muted">
                {pick.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pick.photoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
                    <Icon className="h-8 w-8 text-accent" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-2 left-3 right-3 truncate font-display text-base font-semibold text-white">
                  {pick.title}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {providerLabel(pick)}
                  {pick.price != null ? ` · ${pick.price}€` : ''}
                  {pick.dayIndex ? ` · G${pick.dayIndex}` : ''}
                </p>
                {canBookThis ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 rounded-full"
                    onClick={() => book(pick)}
                  >
                    Prenota
                  </Button>
                ) : (
                  <span className="shrink-0 text-[11px] font-medium text-primary">Salvato</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {bookable.length > 0 ? (
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              dark ? 'text-white/50' : 'text-muted-foreground'
            }`}
          >
            Già scelti · prenota questi
          </p>
          <ul className="mt-2 space-y-2">
            {bookable.map((pick) => {
              const Icon = kindIcon(pick.kind);
              return (
                <li
                  key={pick.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${
                    dark
                      ? 'border-white/10 bg-white/[0.05]'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${dark ? 'text-white' : ''}`}>
                      <Icon className="mr-1.5 inline h-3.5 w-3.5 text-accent" />
                      {pick.title}
                    </p>
                    <p className={`text-[11px] ${dark ? 'text-white/50' : 'text-muted-foreground'}`}>
                      {providerLabel(pick)}
                      {pick.price != null ? ` · ${pick.price} ${pick.currency ?? 'EUR'}` : ''}
                    </p>
                  </div>
                  {allowCheckout ? (
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 rounded-full"
                      onClick={() => book(pick)}
                    >
                      Prenota
                    </Button>
                  ) : (
                    <span
                      className={`shrink-0 text-[11px] font-medium ${
                        dark ? 'text-accent' : 'text-primary'
                      }`}
                    >
                      Salvato
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {places.length > 0 ? (
        <div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              dark ? 'text-white/50' : 'text-muted-foreground'
            }`}
          >
            Must visit · sulla mappa
          </p>
          <ul className="mt-2 space-y-1.5">
            {places.map((pick) => (
              <li
                key={pick.id}
                className={`truncate text-sm ${dark ? 'text-white/80' : 'text-foreground/80'}`}
              >
                <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-accent" />
                {pick.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
