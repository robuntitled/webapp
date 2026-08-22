'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  confirmActivityAction,
  confirmFlightAction,
  confirmHotelAction,
} from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { PrenotaActivitiesClient } from '@/components/travel/PrenotaActivitiesClient';
import { PrenotaAttractionsClient } from '@/components/travel/PrenotaAttractionsClient';
import { firstStayCity } from '@/lib/itineraries/catalog';
import { cn } from '@/lib/utils';
import type { ItineraryTemplate, PracticeRow } from '@/lib/itineraries/types';

type BookStep = 'flight' | 'hotel' | 'sights';

export function PracticeBookingHub({
  practice,
  template,
}: {
  practice: PracticeRow;
  template: ItineraryTemplate;
}) {
  const [step, setStep] = useState<BookStep>('flight');
  const [pending, startTransition] = useTransition();
  const groupLocked = practice.mode === 'group' && !practice.flight_confirmed_at;
  const city = firstStayCity(template);
  const from = String(practice.date_from).slice(0, 10);
  const to = String(practice.date_to).slice(0, 10);

  function run(fn: (id: string) => Promise<unknown>) {
    startTransition(async () => {
      const result = (await fn(practice.id)) as { error?: string };
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['flight', 'Voli'],
            ['hotel', 'Hotel'],
            ['sights', 'Attrazioni'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStep(id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              step === id
                ? 'bg-accent text-[#0b1220]'
                : 'border border-white/15 bg-white/8 text-white/80 hover:bg-white/12'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 'flight' ? (
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            Ricerca automatica da tutta Italia. Posto confermato = volo prenotato.
          </p>
          <FlightSearchPanel
            variant="composer"
            defaultOrigin="Italia"
            defaultDestination={template.destination_name}
            defaultStartDate={from}
            defaultEndDate={to}
            defaultTripType="roundtrip"
            defaultAdults={1}
            autoSearch
            cacheKey={null}
          />
          <Button
            disabled={pending || Boolean(practice.flight_confirmed_at)}
            className="rounded-full"
            onClick={() => run(confirmFlightAction)}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {practice.flight_confirmed_at ? 'Volo confermato' : 'Ho prenotato il volo'}
          </Button>
        </div>
      ) : null}

      {step === 'hotel' ? (
        groupLocked ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
            In gruppo l’hotel si sblocca dopo il volo confermato.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              Stessa zona del piano ({city}). Ognuno prenota la propria camera.
            </p>
            <LiteApiHotelSearch
              defaultCity={city}
              defaultCheckin={from}
              defaultCheckout={to}
              defaultAdults={1}
              autoSearch
              cacheKey={null}
              className="rounded-2xl bg-card p-4"
            />
            <Button
              variant="secondary"
              disabled={pending || Boolean(practice.hotel_confirmed_at)}
              className="rounded-full"
              onClick={() => run(confirmHotelAction)}
            >
              {practice.hotel_confirmed_at ? 'Hotel confermato' : 'Ho prenotato l’hotel'}
            </Button>
          </div>
        )
      ) : null}

      {step === 'sights' ? (
        groupLocked ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
            In gruppo attrazioni e attività dopo il volo.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Attrazioni</p>
              <PrenotaAttractionsClient
                defaultCity={city}
                defaultStartDate={from}
                defaultEndDate={to}
                autoSearch
                cacheKey={null}
              />
            </div>
            <div className="rounded-2xl bg-card p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Attività</p>
              <PrenotaActivitiesClient
                defaultCity={city}
                defaultStartDate={from}
                defaultEndDate={to}
                autoSearch
                cacheKey={null}
              />
            </div>
            <Button
              variant="secondary"
              disabled={pending || Boolean(practice.activity_confirmed_at)}
              className="rounded-full"
              onClick={() => run(confirmActivityAction)}
            >
              {practice.activity_confirmed_at ? 'Attività confermata' : 'Ho prenotato un’attività'}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
