'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction } from '@/actions/practices';
import { ItineraryWorldMap } from '@/components/itineraries/ItineraryWorldMap';
import { BookingRecap } from '@/components/itineraries/BookingRecap';
import {
  ItineraryScrollWidget,
  WorkspaceEmptyState,
} from '@/components/itineraries/workspace/ItineraryScrollWidget';
import { WorldClocksWidget } from '@/components/itineraries/workspace/WorldClocksWidget';
import { Button } from '@/components/ui/button';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { staysFromTemplate, formatItDate } from '@/lib/itineraries/dates';
import { getStayBookingProgress, isStayBooked } from '@/lib/itineraries/stay-progress';
import {
  parseWorkspaceTab,
  workspaceHref,
  type WorkspaceTab,
} from '@/lib/itineraries/workspace-tab';
import type { EditionMemberCard } from '@/lib/itineraries/bookings';
import type { ItineraryTemplate, PracticeRow } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

type TripWorkspaceProps = {
  template: ItineraryTemplate;
  dateFrom: string;
  dateTo: string;
  practice?: PracticeRow | null;
  editionId?: string | null;
  editionType?: 'official' | 'private' | null;
  members?: EditionMemberCard[];
  isMember?: boolean;
  canJoin?: boolean;
  backHref: string;
  backLabel: string;
  initialTab?: string | null;
  initialStay?: string | null;
};

export function TripWorkspace({
  template,
  dateFrom,
  dateTo,
  practice = null,
  editionId = null,
  editionType = null,
  members = [],
  isMember = Boolean(practice),
  canJoin = false,
  backHref,
  backLabel,
  initialTab,
  initialStay,
}: TripWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [tab, setTab] = useState<WorkspaceTab>(() => parseWorkspaceTab(initialTab));
  const [pendingJoin, startJoin] = useTransition();

  const flightBooked = Boolean(practice?.flight_booking || practice?.flight_confirmed_at);
  const hotels = practice?.hotel_bookings ?? [];
  const stays = useMemo(() => staysFromTemplate(template, dateFrom), [template, dateFrom]);
  const stayProgress = useMemo(
    () => getStayBookingProgress(stays, hotels),
    [stays, hotels]
  );
  const [stayIdx, setStayIdx] = useState(() => {
    const parsed = initialStay != null ? Number(initialStay) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0 && parsed < stays.length) return parsed;
    return stayProgress.nextStayIdx ?? 0;
  });
  const stay = stays[stayIdx] ?? stays[0];
  const groupLocked = practice?.mode === 'group' && !practice.flight_confirmed_at;
  const hotelCount = hotels.length;
  const canBook = Boolean(practice?.id) && isMember;

  const selectTab = useCallback(
    (next: WorkspaceTab) => {
      setTab(next);
      router.replace(workspaceHref(pathname, next, next === 'hotel' ? String(stayIdx) : null), {
        scroll: false,
      });
    },
    [pathname, router, stayIdx]
  );

  function joinTrip() {
    if (!editionId) return;
    if (!session?.user) {
      router.push(`/?callbackUrl=${encodeURIComponent(`/partenze/${editionId}`)}`);
      return;
    }
    startJoin(async () => {
      const result = await joinEditionAction(editionId);
      if (result?.error) toast.error(result.error);
    });
  }

  const tabItems: {
    id: WorkspaceTab;
    label: string;
    status: string | null;
  }[] = [
    { id: 'itinerario', label: 'Itinerario', status: null },
    {
      id: 'voli',
      label: 'Voli',
      status: flightBooked ? '✓' : '•',
    },
    {
      id: 'hotel',
      label: 'Hotel',
      status: hotelCount > 0 ? String(hotelCount) : '•',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-var(--nl-nav-height))] bg-white">
      <div className="nl-page w-full space-y-4 py-5 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          {canJoin && !isMember ? (
            <Button type="button" className="rounded-full" disabled={pendingJoin} onClick={joinTrip}>
              {pendingJoin ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Partecipa
            </Button>
          ) : null}
        </div>

        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {editionType === 'private' ? 'Viaggio privato' : editionType === 'official' ? 'Partenza di gruppo' : 'Il mio viaggio'}
            {members.length > 0 ? ` · ${members.length} nel gruppo` : ''}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {template.destination_name}
          </h1>
          <p className="text-sm text-slate-500">
            {formatItDate(dateFrom)} – {formatItDate(dateTo)} · {template.duration_days} giorni
          </p>
        </header>

        <div
          className="flex gap-1 overflow-x-auto rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-md"
          role="tablist"
          aria-label="Configurazione viaggio"
        >
          {tabItems.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(item.id)}
                className={cn(
                  'inline-flex min-h-10 shrink-0 flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  selected
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-primary'
                )}
              >
                {item.label}
                {item.status === '✓' ? (
                  <Check className="h-3.5 w-3.5" aria-label="completato" />
                ) : item.status && item.status !== '•' ? (
                  <span className="text-xs opacity-80">{item.status}</span>
                ) : item.status === '•' && !selected ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-label="da completare" />
                ) : null}
              </button>
            );
          })}
        </div>

        {tab === 'itinerario' ? (
          <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:items-stretch">
            <div className="h-[min(68vh,40rem)] min-h-[22rem] lg:h-[min(72vh,44rem)]">
              <ItineraryScrollWidget template={template} />
            </div>
            <div className="flex min-h-0 flex-col gap-3 lg:h-[min(72vh,44rem)]">
              <div className="ws-widget overflow-hidden rounded-2xl">
                <div className="h-[11.5rem] sm:h-[13rem]">
                  <ItineraryWorldMap
                    template={template}
                    staticMap
                    compact
                    className="h-full rounded-none border-0 shadow-none"
                  />
                </div>
              </div>
              <div className="ws-widget flex-1 rounded-2xl p-4">
                {flightBooked && practice?.flight_booking ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Voli
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      ✓ {practice.flight_booking.outbound.origin} →{' '}
                      {practice.flight_booking.outbound.destination}
                    </p>
                    {practice.flight_booking.returnLeg ? (
                      <p className="text-sm font-medium text-slate-800">
                        ✓ {practice.flight_booking.returnLeg.origin} →{' '}
                        {practice.flight_booking.returnLeg.destination}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => selectTab('voli')}
                      className="text-sm font-semibold text-primary hover:text-primary/80"
                    >
                      Vedi dettaglio →
                    </button>
                  </div>
                ) : (
                  <WorkspaceEmptyState
                    title="Voli non ancora selezionati"
                    body="Seleziona i voli per completare il viaggio."
                    actionLabel="Scegli voli →"
                    onAction={() => selectTab('voli')}
                  />
                )}
              </div>
              <div className="ws-widget flex-1 rounded-2xl p-4">
                {hotelCount > 0 && practice ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Hotel
                    </p>
                    <ul className="space-y-1">
                      {hotels.slice(0, 3).map((h) => (
                        <li key={`${h.hotelName}-${h.checkin}`} className="text-sm text-slate-800">
                          ✓ {h.hotelName}
                          {h.city ? ` · ${h.city}` : ''}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => selectTab('hotel')}
                      className="text-sm font-semibold text-primary hover:text-primary/80"
                    >
                      Vedi dettaglio →
                    </button>
                  </div>
                ) : (
                  <WorkspaceEmptyState
                    title="Hotel non ancora selezionati"
                    body="Scegli dove soggiornare nelle varie tappe."
                    actionLabel="Scegli hotel →"
                    onAction={() => selectTab('hotel')}
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'voli' ? (
          <div className="ws-widget relative rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">Voli</h2>
                <p className="text-sm text-slate-500">
                  Cerca, confronta e scegli andata e ritorno sulle date del viaggio.
                </p>
              </div>
              <WorldClocksWidget />
            </div>
            {!canBook ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Partecipa al viaggio per selezionare i voli.
              </p>
            ) : flightBooked && practice ? (
              <BookingRecap practice={practice} section="flight" />
            ) : practice ? (
              <FlightSearchPanel
                hideSearchForm
                defaultOrigin="Italia"
                defaultDestination={template.destination_name}
                defaultStartDate={dateFrom}
                defaultEndDate={dateTo}
                defaultTripType="roundtrip"
                defaultAdults={1}
                autoSearch
                cacheKey={null}
                practiceId={practice.id}
              />
            ) : null}
          </div>
        ) : null}

        {tab === 'hotel' ? (
          <div className="ws-widget rounded-2xl p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold text-slate-900">Hotel</h2>
            <p className="mb-4 text-sm text-slate-500">
              Un hotel per ogni tappa del piano. Scegli e conferma quando sei pronto.
            </p>
            {!canBook ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Partecipa al viaggio per scegliere gli hotel.
              </p>
            ) : groupLocked ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                In gruppo l’hotel si sblocca dopo il volo confermato.
              </p>
            ) : practice ? (
              <div className="space-y-4">
                {hotels.length > 0 ? <BookingRecap practice={practice} section="hotel" /> : null}
                {stays.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {stays.map((s, i) => {
                      const booked = isStayBooked(s, hotels);
                      return (
                        <button
                          key={`${s.city}-${s.checkin}`}
                          type="button"
                          onClick={() => setStayIdx(i)}
                          className={cn(
                            'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                            i === stayIdx
                              ? 'bg-primary text-white'
                              : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40',
                            booked && 'opacity-70'
                          )}
                        >
                          {booked ? '✓ ' : ''}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
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
                    className="rounded-2xl border border-slate-100 bg-white p-3"
                    practiceId={practice.id}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Nessuna tappa hotel su questo piano.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
