'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Plane, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { Button } from '@/components/ui/button';
import { uniqueCover } from '@/lib/composer/destination-covers';
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

function displayName(m: EditionMemberCard) {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  if (n) return n;
  if (m.username) return `@${m.username}`;
  return 'Viaggiatore';
}

function initials(m: EditionMemberCard) {
  const a = (m.firstName ?? m.username ?? '?').slice(0, 1).toUpperCase();
  const b = (m.lastName ?? '').slice(0, 1).toUpperCase();
  return `${a}${b}`;
}

function FlightBlock({ recap }: { recap: FlightBookingRecap }) {
  const o = recap.outbound;
  const r = recap.returnLeg;
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/85">
        <span className="font-semibold text-white">Andata</span> {o.origin} → {o.destination}
        {o.flightNumber ? ` · ${o.flightNumber}` : ''}
        {o.airline ? ` · ${o.airline}` : ''}
        <span className="block text-xs text-white/55">{formatFlightWhen(o.departureAt)}</span>
      </p>
      {r ? (
        <p className="text-sm text-white/85">
          <span className="font-semibold text-white">Ritorno</span> {r.origin} → {r.destination}
          {r.flightNumber ? ` · ${r.flightNumber}` : ''}
          {r.airline ? ` · ${r.airline}` : ''}
          <span className="block text-xs text-white/55">{formatFlightWhen(r.departureAt)}</span>
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
}: {
  practiceId: string;
  template: ItineraryTemplate;
  dateFrom: string;
  dateTo: string;
  members: EditionMemberCard[];
  peerFlights: EditionPeerFlight[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('plan');
  const [picked, setPicked] = useState<EditionPeerFlight | null>(null);
  const [checking, setChecking] = useState(false);

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
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
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
            {step === 'plan' && 'Stesso piano. Date già fissate. Viaggio con altri.'}
            {step === 'people' && 'Chi si è già aggiunto. Solo sguardo, niente profilo.'}
            {step === 'flights' && 'I voli già prenotati dal gruppo. Ti va bene lo stesso?'}
            {step === 'picked' && 'Solo questo volo, se è ancora disponibile.'}
            {step === 'search' && 'Cerca da Italia verso destinazione.'}
          </p>
        </header>

        {step === 'plan' ? (
          <div className="composer-panel space-y-5 rounded-3xl p-6 md:p-8">
            <p className="text-white/85">{template.summary}</p>
            <div className="flex items-center gap-3 rounded-2xl bg-[#0b1220] px-4 py-3">
              <Wallet className="h-4 w-4 text-accent" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/45">
                  {COMPLIANCE_COPY.budgetLabel}
                </p>
                <p className="text-sm font-medium text-white">
                  ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a persona
                </p>
              </div>
            </div>
            <ol className="space-y-2">
              {template.days.map((day) => (
                <li key={day.day_number} className="rounded-2xl bg-[#0b1220] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                    Giorno {day.day_number}
                  </p>
                  <p className="font-semibold text-white">{day.title}</p>
                  <p className="mt-1 text-sm text-white/70">{day.description}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                    <MapPin className="h-3 w-3" />
                    {day.area_segment}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {step === 'people' ? (
          members.length === 0 ? (
            <p className="rounded-3xl bg-[#161d2b] p-6 text-sm text-white/80">
              Sei tra i primi. Il gruppo si forma quando gli altri prenotano il volo.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {members.map((m, i) => (
                <li
                  key={m.userId}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/80 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.75)]"
                >
                  <div className="relative h-56">
                    {m.image ? (
                      <Image
                        src={m.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="50vw"
                        unoptimized
                      />
                    ) : (
                      <>
                        <Image
                          src={uniqueCover(template.destination_slug, i + 11)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="50vw"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/45 font-display text-2xl font-semibold text-white backdrop-blur-sm">
                            {initials(m)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/20 to-transparent" />
                    <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                      {m.status === 'confirmed' ? 'Confermato' : 'Nel gruppo'}
                    </p>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-display text-2xl font-semibold text-white">{displayName(m)}</p>
                      {m.username ? <p className="text-sm text-white/70">@{m.username}</p> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {step === 'flights' ? (
          peerFlights.length === 0 ? (
            <div className="space-y-4 rounded-3xl bg-[#161d2b] p-6">
              <p className="text-sm text-white/80">
                Nessun volo prenotato dagli altri. Cerca da Italia verso {template.destination_name}.
              </p>
              <Button className="rounded-full" onClick={() => setStep('search')}>
                Cerca volo
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {peerFlights.map((peer) => (
                <li key={peer.fingerprint} className="rounded-3xl bg-[#161d2b] p-5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    <Plane className="h-3.5 w-3.5" />
                    Volo del gruppo
                  </p>
                  <p className="mt-2 text-xs text-white/55">
                    Prenotato da{' '}
                    {peer.bookers.map((b) => b.firstName || 'un viaggiatore').join(', ')}
                  </p>
                  <div className="mt-3">
                    <FlightBlock recap={peer.recap} />
                  </div>
                  {formatBookingMoney(peer.recap.amountEur, peer.recap.currency) ? (
                    <p className="mt-2 text-sm text-white/70">
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
          <div className="space-y-4 rounded-3xl bg-[#161d2b] p-6">
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
              className="rounded-full text-white"
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
