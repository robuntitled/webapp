'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BedDouble, Loader2, Plane, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction } from '@/actions/practices';
import { ItineraryWorldMap } from '@/components/itineraries/ItineraryWorldMap';
import { BookingRecap } from '@/components/itineraries/BookingRecap';
import {
  ItineraryScrollWidget,
  WorkspaceEmptyState,
} from '@/components/itineraries/workspace/ItineraryScrollWidget';
import { WorkspaceHero, WorkspaceMetaChip } from '@/components/itineraries/workspace/WorkspaceHero';
import { WorkspaceStatusCard } from '@/components/itineraries/workspace/WorkspaceStatusCard';
import { WorkspaceTabs, type WorkspaceTabItem } from '@/components/itineraries/workspace/WorkspaceTabs';
import { WorldClocksWidget } from '@/components/itineraries/workspace/WorldClocksWidget';
import { Button } from '@/components/ui/button';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
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

  const editionLabel =
    editionType === 'private'
      ? 'Viaggio privato'
      : editionType === 'official'
        ? 'Partenza di gruppo'
        : 'Il mio viaggio';

  const tabItems: WorkspaceTabItem[] = [
    { id: 'itinerario', label: 'Itinerario', status: null },
    {
      id: 'voli',
      label: 'Voli',
      status: flightBooked ? 'done' : 'pending',
    },
    {
      id: 'hotel',
      label: 'Hotel',
      status: hotelCount > 0 ? 'count' : 'pending',
      count: hotelCount > 0 ? hotelCount : undefined,
    },
  ];

  const joinButton =
    canJoin && !isMember ? (
      <Button
        type="button"
        size="sm"
        className="rounded-full bg-accent px-5 font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent/90"
        disabled={pendingJoin}
        onClick={joinTrip}
      >
        {pendingJoin ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Partecipa
      </Button>
    ) : null;

  return (
    <div className="ws-surface min-h-[calc(100vh-var(--nl-nav-height))]">
      <div className="nl-page w-full space-y-5 py-5 sm:space-y-6 sm:py-6">
        <WorkspaceHero
          destinationSlug={template.destination_slug}
          destinationName={template.destination_name}
          eyebrow={editionLabel}
          meta={`${formatItDate(dateFrom)} – ${formatItDate(dateTo)} · ${template.duration_days} giorni`}
          backHref={backHref}
          backLabel={backLabel}
          action={joinButton}
          chips={
            <>
              {members.length > 0 ? (
                <WorkspaceMetaChip icon={Users}>
                  {members.length} nel gruppo
                </WorkspaceMetaChip>
              ) : null}
              <WorkspaceMetaChip icon={Wallet}>
                ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € ·{' '}
                {COMPLIANCE_COPY.budgetLabel.toLowerCase()}
              </WorkspaceMetaChip>
            </>
          }
        />

        <WorkspaceTabs items={tabItems} value={tab} onChange={selectTab} />

        {tab === 'itinerario' ? (
          <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start lg:gap-6">
            <div className="h-[min(70vh,42rem)] min-h-[24rem] lg:sticky lg:top-[calc(var(--nl-nav-height)+1rem)] lg:h-[min(78vh,44rem)]">
              <ItineraryScrollWidget template={template} />
            </div>
            <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--nl-nav-height)+1rem)]">
              <div className="ws-widget overflow-hidden rounded-2xl">
                <p className="border-b border-slate-100/90 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Percorso
                </p>
                <div className="h-[12rem] sm:h-[13rem]">
                  <ItineraryWorldMap
                    template={template}
                    staticMap
                    compact
                    className="h-full rounded-none border-0 shadow-none"
                  />
                </div>
              </div>

              <WorkspaceStatusCard
                icon={Plane}
                title="Voli"
                subtitle={
                  flightBooked ? 'Prenotazione confermata' : 'Andata e ritorno sulle date del viaggio'
                }
                complete={flightBooked}
                actionLabel={flightBooked ? 'Vedi dettaglio' : 'Scegli voli'}
                onAction={() => selectTab('voli')}
              >
                {flightBooked && practice?.flight_booking ? (
                  <div className="space-y-1.5 text-sm text-slate-700">
                    <p>
                      {practice.flight_booking.outbound.origin} →{' '}
                      {practice.flight_booking.outbound.destination}
                    </p>
                    {practice.flight_booking.returnLeg ? (
                      <p>
                        {practice.flight_booking.returnLeg.origin} →{' '}
                        {practice.flight_booking.returnLeg.destination}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <WorkspaceEmptyState
                    title="Nessun volo selezionato"
                    body="Cerca e confronta le opzioni quando sei pronto."
                  />
                )}
              </WorkspaceStatusCard>

              <WorkspaceStatusCard
                icon={BedDouble}
                title="Hotel"
                subtitle={
                  hotelCount > 0
                    ? `${hotelCount} tapp${hotelCount === 1 ? 'a' : 'e'} confermat${hotelCount === 1 ? 'a' : 'e'}`
                    : 'Un alloggio per ogni tappa del piano'
                }
                complete={hotelCount > 0}
                actionLabel={hotelCount > 0 ? 'Vedi dettaglio' : 'Scegli hotel'}
                onAction={() => selectTab('hotel')}
              >
                {hotelCount > 0 && practice ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {hotels.slice(0, 3).map((h) => (
                      <li key={`${h.hotelName}-${h.checkin}`}>
                        {h.hotelName}
                        {h.city ? ` · ${h.city}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <WorkspaceEmptyState
                    title="Nessun hotel selezionato"
                    body="Scegli dove soggiornare in ogni città."
                  />
                )}
              </WorkspaceStatusCard>
            </aside>
          </div>
        ) : null}

        {tab === 'voli' ? (
          <div className="ws-widget rounded-2xl p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
                  Voli
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cerca, confronta e scegli andata e ritorno sulle date del viaggio.
                </p>
              </div>
              <WorldClocksWidget />
            </div>
            {!canBook ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center">
                <p className="font-medium text-slate-800">Unisciti al viaggio per prenotare</p>
                <p className="mt-1 text-sm text-slate-500">
                  Partecipa al gruppo per sbloccare la ricerca voli.
                </p>
                {canJoin && !isMember ? (
                  <Button
                    type="button"
                    className="mt-4 rounded-full"
                    disabled={pendingJoin}
                    onClick={joinTrip}
                  >
                    Partecipa
                  </Button>
                ) : null}
              </div>
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
          <div className="ws-widget rounded-2xl p-5 sm:p-6">
            <div className="mb-5 border-b border-slate-100 pb-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
                Hotel
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Un hotel per ogni tappa del piano. Scegli e conferma quando sei pronto.
              </p>
            </div>
            {!canBook ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center">
                <p className="font-medium text-slate-800">Unisciti al viaggio per prenotare</p>
                <p className="mt-1 text-sm text-slate-500">
                  Partecipa al gruppo per sbloccare la ricerca hotel.
                </p>
              </div>
            ) : groupLocked ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-6 text-center">
                <p className="font-medium text-slate-800">Hotel in attesa del volo</p>
                <p className="mt-1 text-sm text-slate-600">
                  In modalità gruppo gli hotel si sbloccano dopo il volo confermato.
                </p>
              </div>
            ) : practice ? (
              <div className="space-y-5">
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
                              ? 'bg-primary text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40',
                            booked && i !== stayIdx && 'opacity-70'
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
