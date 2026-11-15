'use client';

import { useState } from 'react';
import { FlightReviewCart } from '@/components/itineraries/FlightReviewCart';
import { FlightOfferCard } from '@/components/travel/FlightOfferCard';
import { Button } from '@/components/ui/button';
import type { TripFlightPlan } from '@/lib/travel/trip-flight-legs';

const MOCK_PLAN: TripFlightPlan = {
  shape: 'openjaw',
  returnHome: true,
  homeOriginIata: 'MXP',
  homeReturnIata: 'MXP',
  legs: [
    {
      id: 'leg-out',
      kind: 'outbound',
      originIata: 'MXP',
      destinationIata: 'BKK',
      date: '2026-12-10',
      passengers: 2,
      labelIt: 'Andata MXP → BKK',
      status: 'selected',
      offer: {
        offerId: 'o1',
        price: 410,
        currency: 'EUR',
        originIata: 'MXP',
        destinationIata: 'BKK',
        departureAt: '2026-12-10T10:15:00',
        arrivalAt: '2026-12-10T23:40:00',
        stops: 1,
        durationMinutes: 805,
        airline: 'Emirates',
        capturedAt: Date.now(),
      },
    },
    {
      id: 'leg-ret',
      kind: 'return',
      originIata: 'BKK',
      destinationIata: 'MXP',
      date: '2026-12-20',
      passengers: 2,
      labelIt: 'Rientro BKK → MXP',
      status: 'selected',
      offer: {
        offerId: 'o2',
        price: 380,
        currency: 'EUR',
        originIata: 'BKK',
        destinationIata: 'MXP',
        departureAt: '2026-12-20T09:00:00',
        arrivalAt: '2026-12-20T18:20:00',
        stops: 0,
        durationMinutes: 560,
        airline: 'Thai Airways',
        capturedAt: Date.now(),
      },
    },
  ],
};

/**
 * Visual fixtures for UX review (cart totals, offer cards, legal ack, checkout hierarchy).
 * No real booking/payment.
 */
export function UxReviewFixturesClient() {
  const [legalAck, setLegalAck] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 px-3 py-8">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Preview fixtures · non produzione
        </p>
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          UX review · Voli / Pratiche
        </h1>
      </header>

      <section data-testid="fixture-flight-review-cart" className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800">B1 · Carrello tratte</h2>
        <FlightReviewCart plan={MOCK_PLAN} travelers={2} />
      </section>

      <section data-testid="fixture-flight-offer-cards" className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">B2 · Offer cards @390</h2>
        <FlightOfferCard
          offer={{
            offerId: 'card-1',
            price: 214.5,
            currency: 'EUR',
            origin: 'MXP',
            destination: 'BKK',
            airline: 'Emirates',
            airlineCode: 'EK',
            departureAt: '2026-12-10T10:15:00',
            arrivalAt: '2026-12-10T23:40:00',
            durationMinutes: 805,
            stops: 1,
            flightNumber: 'EK92',
          }}
          actionLabel="Seleziona"
          onAction={() => undefined}
        />
        <FlightOfferCard
          offer={{
            offerId: 'card-2',
            price: 189,
            currency: 'EUR',
            origin: 'MXP',
            destination: 'BKK',
            airline: 'Qatar Airways',
            airlineCode: 'QR',
            departureAt: '2026-12-10T14:05:00',
            arrivalAt: '2026-12-11T08:20:00',
            durationMinutes: 915,
            stops: 1,
            flightNumber: 'QR124',
          }}
          actionLabel="Seleziona"
          onAction={() => undefined}
        />
      </section>

      <section
        className="rounded-2xl border border-amber-200/80 bg-amber-50/50"
        data-testid="fixture-legal-ack"
      >
        <h2 className="px-4 pt-3 text-sm font-bold text-slate-800">
          B3 · Informazioni importanti
        </h2>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-amber-950"
          onClick={() => setLegalOpen((v) => !v)}
          aria-expanded={legalOpen}
          data-testid="fixture-legal-toggle"
        >
          Informazioni importanti
          <span className="text-xs font-medium">{legalOpen ? 'Aperto' : 'Chiuso'}</span>
        </button>
        {legalOpen ? (
          <p className="border-t border-amber-200/80 px-4 py-3 text-xs text-amber-950">
            Testo legale Allegato B (BOZZA) visibile solo qui dentro.
          </p>
        ) : null}
        <label className="flex min-h-11 cursor-pointer items-start gap-3 border-t border-amber-200/80 px-4 py-3 text-xs text-amber-950">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={legalAck}
            onChange={(e) => setLegalAck(e.target.checked)}
            data-testid="fixture-legal-checkbox"
          />
          <span>
            Ho letto le informazioni importanti. Le confermerò di nuovo prima di
            qualsiasi pagamento.
          </span>
        </label>
        <div className="px-4 pb-4">
          <Button
            type="button"
            variant="cta"
            className="min-h-11 w-full"
            disabled={!legalAck}
            data-testid="fixture-crea-viaggio"
          >
            Crea viaggio
          </Button>
        </div>
      </section>

      <section
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
        data-testid="fixture-checkout-hierarchy"
      >
        <h2 className="text-sm font-bold text-slate-800">P · Checkout hierarchy</h2>
        <div className="rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
          <p className="text-[11px] uppercase tracking-wider text-white/70">
            Paghi ora · tratta 1/2
          </p>
          <p className="font-display text-2xl font-semibold">820,00 €</p>
          <p className="text-[11px] text-white/70">
            410,00 € a persona · 820,00 € totale tratta (2 persone)
          </p>
          <p className="mt-1 text-[11px] text-white/55">Totale voli 1.580,00 €</p>
        </div>
        <div className="space-y-2">
          <Button className="min-h-11 w-full rounded-full" data-testid="fixture-pago-per-me">
            Pago per me · 410,00 €
          </Button>
          <p className="text-center text-[11px] text-slate-500">
            Solo la tua quota · 410,00 € a persona · totale voli 790,00 € a persona.
          </p>
          <Button
            variant="outline"
            className="min-h-11 w-full rounded-full"
            data-testid="fixture-pago-per-altri"
          >
            Pago per altri · da 790,00 € / persona
          </Button>
        </div>
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600"
        data-testid="fixture-jargon-check"
      >
        <p>
          Nessun “one-way”, “cache”, “all-or-nothing” o “piano” tecnico in questa UI
          fixture. Allegato B resta BOZZA solo nel testo legale espanso.
        </p>
      </section>
    </div>
  );
}
