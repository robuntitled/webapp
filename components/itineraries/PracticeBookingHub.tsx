'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { confirmActivityAction, confirmHotelAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { PrenotaActivitiesClient } from '@/components/travel/PrenotaActivitiesClient';
import { PrenotaAttractionsClient } from '@/components/travel/PrenotaAttractionsClient';
import { staysFromTemplate } from '@/lib/itineraries/dates';
import {
  clearLastActivityDraft,
  loadLastActivityDraft,
} from '@/lib/travel/activity-draft';
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
  const [stayIdx, setStayIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [activityTitle, setActivityTitle] = useState('');
  const [activityRef, setActivityRef] = useState('');
  const groupLocked = practice.mode === 'group' && !practice.flight_confirmed_at;
  const from = String(practice.date_from).slice(0, 10);
  const to = String(practice.date_to).slice(0, 10);
  const stays = useMemo(() => staysFromTemplate(template, from), [template, from]);
  const stay = stays[stayIdx] ?? stays[0];

  function run(fn: (id: string) => Promise<unknown>) {
    startTransition(async () => {
      const result = (await fn(practice.id)) as { error?: string };
      if (result?.error) toast.error(result.error);
    });
  }

  function saveActivity() {
    const last = loadLastActivityDraft();
    const title = activityTitle.trim() || last?.title || '';
    if (!title) {
      toast.error('Apri un’attività su Viator o scrivi il titolo.');
      return;
    }
    startTransition(async () => {
      const result = await confirmActivityAction(practice.id, {
        title,
        bookingRef: activityRef.trim() || null,
        provider: last?.provider ?? 'viator',
        bookingUrl: last?.bookingUrl ?? null,
        amountEur: last?.amountEur ?? null,
        currency: last?.currency ?? 'EUR',
      });
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
        return;
      }
      clearLastActivityDraft();
      setActivityTitle('');
      setActivityRef('');
      toast.success('Attività salvata nel recap. Ti abbiamo inviato l’email.');
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
              step === id ? 'bg-accent text-[#0b1220]' : 'bg-[#161d2b] text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {step === 'flight' ? (
        <div className="space-y-3">
          <p className="text-sm text-white/80">
            Offerte da tutta Italia sulle date del viaggio. Scegli andata, poi ritorno.
          </p>
          <FlightSearchPanel
            variant="composer"
            hideSearchForm
            defaultOrigin="Italia"
            defaultDestination={template.destination_name}
            defaultStartDate={from}
            defaultEndDate={to}
            defaultTripType="roundtrip"
            defaultAdults={1}
            autoSearch
            cacheKey={null}
            practiceId={practice.id}
          />
        </div>
      ) : null}

      {step === 'hotel' ? (
        groupLocked ? (
          <p className="rounded-3xl bg-[#161d2b] p-5 text-sm text-white/80">
            In gruppo l’hotel si sblocca dopo il volo confermato.
          </p>
        ) : (
          <div className="space-y-3">
            {stays.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {stays.map((s, i) => (
                  <button
                    key={`${s.city}-${s.checkin}`}
                    type="button"
                    onClick={() => setStayIdx(i)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-sm font-medium',
                      i === stayIdx ? 'bg-accent text-[#0b1220]' : 'bg-[#161d2b] text-white'
                    )}
                  >
                    {i + 1}. {s.label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-white/80">
              {stay
                ? `${stay.label}: stessa zona, camera tua. ${stay.checkin} → ${stay.checkout}`
                : 'Hotel del piano.'}
            </p>
            {stay ? (
              <LiteApiHotelSearch
                key={`${stay.city}-${stay.checkin}`}
                defaultCity={stay.city}
                defaultCheckin={stay.checkin}
                defaultCheckout={stay.checkout}
                defaultAdults={1}
                autoSearch
                hideSearchForm
                cacheKey={null}
                className="rounded-3xl bg-white p-4"
                practiceId={practice.id}
              />
            ) : null}
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
          <p className="rounded-3xl bg-[#161d2b] p-5 text-sm text-white/80">
            In gruppo attrazioni e attività dopo il volo.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-4">
              <p className="mb-3 text-sm font-medium text-slate-900">Attrazioni</p>
              <PrenotaAttractionsClient
                defaultCity={stay?.city ?? template.destination_name}
                defaultStartDate={from}
                defaultEndDate={to}
                autoSearch
                hideSearchForm
                cacheKey={null}
              />
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="mb-3 text-sm font-medium text-slate-900">Attività</p>
              <PrenotaActivitiesClient
                defaultCity={stay?.city ?? template.destination_name}
                defaultStartDate={from}
                defaultEndDate={to}
                autoSearch
                hideSearchForm
                cacheKey={null}
              />
            </div>
            <div className="space-y-2 rounded-3xl bg-[#161d2b] p-4">
              <p className="text-sm text-white/80">
                Dopo Viator, salva qui titolo e codice così non perdi la conferma.
              </p>
              <Input
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder="Titolo attività"
                className="bg-white"
              />
              <Input
                value={activityRef}
                onChange={(e) => setActivityRef(e.target.value)}
                placeholder="Codice prenotazione (opzionale)"
                className="bg-white"
              />
              <Button
                variant="secondary"
                disabled={pending}
                className="rounded-full"
                onClick={saveActivity}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salva nel recap
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
