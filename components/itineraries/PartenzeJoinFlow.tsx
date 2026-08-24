'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Plane, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { Button } from '@/components/ui/button';
import { ItineraryDaysWithMap } from '@/components/itineraries/ItineraryWorldMap';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { MemberRatingBadge } from '@/components/itineraries/EditionTrust';
import { formatBookingMoney, formatFlightWhen } from '@/lib/itineraries/bookings';
import { formatItDate } from '@/lib/itineraries/dates';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import type {
  EditionMemberCard,
  EditionPeerFlight,
  FlightBookingRecap,
} from '@/lib/itineraries/bookings';
import type { ItineraryTemplate } from '@/lib/itineraries/types';

type Step = 'plan' | 'people' | 'flights' | 'picked' | 'search';

function FlightBlock({ recap }: { recap: FlightBookingRecap }) {
  const o = recap.outbound;
  const r = recap.returnLeg;
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Andata</span> {o.origin} → {o.destination}
        {o.flightNumber ? ` · ${o.flightNumber}` : ''}
        {o.airline ? ` · ${o.airline}` : ''}
        <span className="block text-xs text-slate-500">{formatFlightWhen(o.departureAt)}</span>
      </p>
      {r ? (
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Ritorno</span> {r.origin} → {r.destination}
          {r.flightNumber ? ` · ${r.flightNumber}` : ''}
          {r.airline ? ` · ${r.airline}` : ''}
          <span className="block text-xs text-slate-500">{formatFlightWhen(r.departureAt)}</span>
        </p>
      ) : null}
    </div>
  );
}

export function PartenzeJoinFlow({
  practiceId,
  template,
  dateFrom,
  dateTo,
  members,
  peerFlights,
  editionStats,
}: {
  practiceId: string;
  template: ItineraryTemplate;
  dateFrom: string;
  dateTo: string;
  members: EditionMemberCard[];
  peerFlights: EditionPeerFlight[];
  editionStats?: {
    confirmed: number;
    interested: number;
    minConfirmed: number;
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('plan');
  const [picked, setPicked] = useState<EditionPeerFlight | null>(null);
  const [checking, setChecking] = useState(false);
  const confirmedMembers = useMemo(
    () => members.filter((m) => m.status === 'confirmed'),
    [members]
  );

  async function acceptFlight(peer: EditionPeerFlight) {
    const offerId = peer.recap.offerId;
    if (!offerId) {
      toast.message('Offerta non più in lista. Cerca da Italia.');
      setStep('search');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch('/api/liteapi/flights/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ offerId }),
      });
      const data = (await res.json()) as { error?: string; price?: number | null; currency?: string | null };
      if (!res.ok) {
        toast.error(data.error ?? 'Questo volo non è più disponibile.');
        setStep('search');
        return;
      }
      saveFlightCheckoutDraft({
        offerId,
        price: data.price ?? peer.recap.amountEur ?? 0,
        currency: data.currency ?? peer.recap.currency ?? 'EUR',
        outbound: peer.recap.outbound,
        returnLeg: peer.recap.returnLeg,
        adults: 1,
        tripType: peer.recap.returnLeg ? 'roundtrip' : 'oneway',
        practiceId,
        createdAt: Date.now(),
      });
      setPicked(peer);
      setStep('picked');
    } catch {
      toast.error('Verifica volo non riuscita. Cerca da Italia.');
      setStep('search');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-6 py-10">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Partenza ufficiale
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
            {template.destination_name} · {template.duration_days} giorni
          </h1>
          <p className="mt-2 text-muted-foreground">
            {formatItDate(dateFrom)} – {formatItDate(dateTo)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 'plan' && 'Stesso piano. Date già fissate. Per partecipare serve il volo.'}
            {step === 'people' &&
              'Partecipanti con volo confermato. Anche tu dovrai prenotare per unirti al gruppo.'}
            {step === 'flights' && 'Voli già scelti dal gruppo. Ti va bene lo stesso?'}
            {step === 'picked' && 'Solo questo volo, se è ancora disponibile.'}
            {step === 'search' && 'Cerca da Italia verso destinazione.'}
          </p>
        </header>

        {step === 'plan' ? (
          <div className="space-y-5 rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
            <p className="text-muted-foreground">{template.summary}</p>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
              <Wallet className="h-4 w-4 text-accent" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {COMPLIANCE_COPY.budgetLabel}
                </p>
                <p className="text-sm font-medium text-foreground">
                  ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a persona
                </p>
              </div>
            </div>
            <ItineraryDaysWithMap template={template} />
          </div>
        ) : null}

        {step === 'people' ? (
          <>
            {editionStats ? (
              <p className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-foreground">
                {editionStats.interested}{' '}
                {editionStats.interested === 1 ? 'persona interessata' : 'persone interessate'} ·{' '}
                {editionStats.confirmed}/{editionStats.minConfirmed} voli confermati
              </p>
            ) : null}
            {confirmedMembers.length === 0 ? (
              <p className="rounded-3xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
                Sei tra i primi. Il gruppo si forma quando qualcuno conferma il volo — poi potrai
                scrivergli in chat.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {confirmedMembers.map((m) => (
                  <li
                    key={m.userId}
                    className="rounded-2xl border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <UserProfileLink
                        userId={m.userId}
                        username={m.username}
                        firstName={m.firstName}
                        lastName={m.lastName}
                        image={m.image}
                        size="lg"
                        subtitle="Volo confermato"
                      />
                      <MemberRatingBadge avg={m.ratingAvg ?? null} count={m.ratingCount ?? 0} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        {step === 'flights' ? (
          peerFlights.length === 0 ? (
            <div className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Nessun volo prenotato dagli altri. Cerca da Italia verso {template.destination_name}.
              </p>
              <Button className="rounded-full" onClick={() => setStep('search')}>
                Cerca volo
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {peerFlights.map((peer) => (
                <li
                  key={peer.fingerprint}
                  className="rounded-3xl border border-border bg-white p-5 shadow-sm"
                >
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    <Plane className="h-3.5 w-3.5" />
                    Volo del gruppo
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Prenotato da{' '}
                    {peer.bookers.map((b) => b.firstName || 'un viaggiatore').join(', ')}
                  </p>
                  <div className="mt-3">
                    <FlightBlock recap={peer.recap} />
                  </div>
                  {formatBookingMoney(peer.recap.amountEur, peer.recap.currency) ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ultimo prezzo visto: {formatBookingMoney(peer.recap.amountEur, peer.recap.currency)}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      className="rounded-full"
                      disabled={checking}
                      onClick={() => void acceptFlight(peer)}
                    >
                      {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Mi va bene
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => setStep('search')}
                    >
                      Cerco un altro volo
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {step === 'picked' && picked ? (
          <div className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              Solo questo volo
            </p>
            <FlightBlock recap={picked.recap} />
            <Button
              className="rounded-full"
              onClick={() => router.push('/prenota/voli/checkout')}
            >
              Prenota questo volo
            </Button>
          </div>
        ) : null}

        {step === 'search' ? (
          <div>
            <FlightSearchPanel
              variant="composer"
              hideSearchForm
              defaultOrigin="Italia"
              defaultDestination={template.destination_name}
              defaultStartDate={dateFrom}
              defaultEndDate={dateTo}
              defaultTripType="roundtrip"
              defaultAdults={1}
              autoSearch
              cacheKey={null}
              practiceId={practiceId}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {step !== 'plan' ? (
            <Button
              variant="ghost"
              className="rounded-full text-foreground"
              onClick={() => {
                if (step === 'people') setStep('plan');
                else if (step === 'flights') setStep('people');
                else if (step === 'picked' || step === 'search') setStep('flights');
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </Button>
          ) : (
            <span />
          )}
          {step === 'plan' || step === 'people' ? (
            <Button
              className="rounded-full"
              onClick={() => setStep(step === 'plan' ? 'people' : 'flights')}
            >
              Avanti
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
