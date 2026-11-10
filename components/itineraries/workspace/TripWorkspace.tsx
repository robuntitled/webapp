'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BedDouble, Loader2, Plane, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction, renameEditionAction } from '@/actions/practices';
import { BookingRecap } from '@/components/itineraries/BookingRecap';
import { ItineraryExplorerWidget } from '@/components/itineraries/workspace/ItineraryExplorerWidget';
import {
  WorkspaceEmptyState,
} from '@/components/itineraries/workspace/ItineraryScrollWidget';
import {
  TripSelectedFlightsPanel,
  type TripParticipant,
} from '@/components/itineraries/workspace/TripSelectedFlightsPanel';
import { WorkspaceHero, WorkspaceMetaChip } from '@/components/itineraries/workspace/WorkspaceHero';
import { WorkspaceStatusCard } from '@/components/itineraries/workspace/WorkspaceStatusCard';
import { WorkspaceTabs, type WorkspaceTabItem } from '@/components/itineraries/workspace/WorkspaceTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { accediHref } from '@/lib/auth/callback-url';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { staysFromTemplate, formatItDate } from '@/lib/itineraries/dates';
import {
  parseSelectedFlightPlan,
  snapshotFromPlannedLegs,
} from '@/lib/itineraries/selected-flight-plan';
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
  /** Null = viaggio libero senza itinerario template (Fase 1 / M2). */
  template: ItineraryTemplate | null;
  destinationName?: string;
  destinationSlug?: string;
  dateFrom: string;
  dateTo: string;
  practice?: PracticeRow | null;
  editionId?: string | null;
  editionType?: 'official' | 'private' | null;
  /** Nome custom edizione (null → destinazione). */
  tripTitle?: string | null;
  canRename?: boolean;
  members?: EditionMemberCard[];
  /** Owner + joined with booking flags (for Voli / Partecipanti). */
  participants?: TripParticipant[];
  isMember?: boolean;
  canJoin?: boolean;
  /** A4: partenza ufficiale senza tour operator. */
  comingSoon?: boolean;
  backHref: string;
  backLabel: string;
  initialTab?: string | null;
  initialStay?: string | null;
};

export function TripWorkspace({
  template,
  destinationName,
  destinationSlug,
  dateFrom,
  dateTo,
  practice = null,
  editionId = null,
  editionType = null,
  tripTitle = null,
  canRename = false,
  members = [],
  participants: participantsProp,
  isMember = Boolean(practice),
  canJoin = false,
  comingSoon = false,
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
  const [pendingRename, startRename] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(tripTitle ?? '');
  const resolvedDestinationName =
    destinationName?.trim() ||
    template?.destination_name ||
    practice?.destination_label ||
    'Il tuo viaggio';
  const resolvedDestinationSlug =
    destinationSlug?.trim() ||
    template?.destination_slug ||
    practice?.destination_iata ||
    'viaggio';
  const displayName = tripTitle?.trim() || resolvedDestinationName;
  const currentUserId = session?.user?.id ?? '';

  // Difesa UI: dedup per userId (allineato a listEditionMembers in lettura)
  const uniqueMembers = useMemo(() => {
    const byId = new Map<string, (typeof members)[number]>();
    for (const m of members) {
      const key = String(m.userId ?? '')
        .trim()
        .toLowerCase();
      if (!key || byId.has(key)) continue;
      byId.set(key, m);
    }
    return [...byId.values()];
  }, [members]);
  const groupSize = uniqueMembers.length;

  const participants = useMemo<TripParticipant[]>(() => {
    if (participantsProp?.length) return participantsProp;
    if (!currentUserId) return [];
    return [
      {
        userId: currentUserId,
        name: session?.user?.name?.trim() || 'Tu',
        isOwner: true,
        isSelf: true,
        flightsBought: Boolean(
          practice?.flight_confirmed_at ||
            practice?.flight_booking ||
            (Array.isArray(practice?.flight_bookings) && practice.flight_bookings.length > 0)
        ),
      },
    ];
  }, [participantsProp, currentUserId, session?.user?.name, practice]);

  const flightBooked = Boolean(
    practice?.flight_confirmed_at ||
      practice?.flight_booking ||
      (Array.isArray(practice?.flight_bookings) && practice.flight_bookings.length > 0)
  );
  const selectedPlan =
    parseSelectedFlightPlan(practice?.selected_flight_plan) ??
    snapshotFromPlannedLegs(practice?.planned_legs);
  const hasSelectedPlan = Boolean(selectedPlan?.legs?.length);
  const hotels = practice?.hotel_bookings ?? [];
  const stays = useMemo(
    () => (template ? staysFromTemplate(template, dateFrom) : []),
    [template, dateFrom]
  );
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
  const hotelCount = hotels.length;
  const canBookFlights = Boolean(practice?.id) && isMember;
  // Gruppi: hotel dopo volo. Solo/libero (Fase 1 da hotel): hotel subito, un servizio alla volta.
  const canBookHotels =
    canBookFlights &&
    (flightBooked || practice?.mode === 'solo' || (!practice?.edition_id && Boolean(practice?.id)));

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
      router.push(accediHref(`/partenze/${editionId}`, 'register'));
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
      status: flightBooked || hasSelectedPlan ? 'done' : 'pending',
    },
    {
      id: 'hotel',
      label: 'Hotel',
      status: hotelCount > 0 ? 'count' : 'pending',
      count: hotelCount > 0 ? hotelCount : undefined,
    },
    {
      id: 'partecipanti',
      label: 'Partecipanti',
      status: participants.length > 1 ? 'count' : null,
      count: participants.length > 1 ? participants.length : undefined,
    },
  ];

  const joinButton =
    comingSoon && !isMember ? (
      <span className="inline-flex items-center rounded-full bg-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
        In arrivo
      </span>
    ) : canJoin && !isMember ? (
      <Button
        type="button"
        variant="cta"
        size="sm"
        className="rounded-full px-5 font-semibold shadow-lg shadow-[var(--color-cta)]/25"
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
          destinationSlug={resolvedDestinationSlug}
          destinationName={displayName}
          eyebrow={editionLabel}
          meta={`${formatItDate(dateFrom)} – ${formatItDate(dateTo)}${
            template ? ` · ${template.duration_days} giorni` : ''
          }`}
          backHref={backHref}
          backLabel={backLabel}
          action={joinButton}
          chips={
            <>
              {groupSize > 0 ? (
                <WorkspaceMetaChip icon={Users}>
                  {groupSize === 1 ? 'Solo tu' : `${groupSize} nel gruppo`}
                </WorkspaceMetaChip>
              ) : null}
              {template ? (
                <WorkspaceMetaChip icon={Wallet}>
                  ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € ·{' '}
                  {COMPLIANCE_COPY.budgetLabel.toLowerCase()}
                </WorkspaceMetaChip>
              ) : (
                <WorkspaceMetaChip icon={Wallet}>
                  {COMPLIANCE_COPY.budgetLabel} · somma di servizi separati
                </WorkspaceMetaChip>
              )}
            </>
          }
        />

        {canRename && editionId && practice ? (
          <div className="ws-widget flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 sm:px-5">
            {editingName ? (
              <>
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, 80))}
                  placeholder={resolvedDestinationName}
                  className="h-11 max-w-sm flex-1 rounded-xl"
                  maxLength={80}
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 rounded-full"
                  disabled={pendingRename}
                  onClick={() => {
                    startRename(async () => {
                      const res = await renameEditionAction({
                        editionId,
                        title: nameDraft.trim() || null,
                        practiceId: practice.id,
                      });
                      if ('error' in res) {
                        toast.error(res.error);
                        return;
                      }
                      setEditingName(false);
                      toast.message(
                        res.title ? `Rinominato: ${res.title}` : 'Nome ripristinato'
                      );
                      router.refresh();
                    });
                  }}
                >
                  {pendingRename ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salva'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-11 rounded-full"
                  onClick={() => {
                    setNameDraft(tripTitle ?? '');
                    setEditingName(false);
                  }}
                >
                  Annulla
                </Button>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-sm text-slate-600">
                  Nome viaggio:{' '}
                  <span className="font-semibold text-slate-900">{displayName}</span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 rounded-full"
                  onClick={() => {
                    setNameDraft(tripTitle ?? '');
                    setEditingName(true);
                  }}
                >
                  Rinomina
                </Button>
              </>
            )}
          </div>
        ) : null}

        <WorkspaceTabs items={tabItems} value={tab} onChange={selectTab} />

        {tab === 'itinerario' ? (
          <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-start lg:gap-6">
            <div className="h-[min(78vh,44rem)] min-h-[28rem] lg:sticky lg:top-[calc(var(--nl-nav-height)+1rem)]">
              {template ? (
                <ItineraryExplorerWidget template={template} />
              ) : (
                <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                  <p className="font-display text-xl font-semibold text-slate-900">
                    Viaggio senza itinerario fisso
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                    Hai creato questo viaggio da un volo o un hotel. Aggiungi i servizi uno alla
                    volta: prima paghi, poi scegli il prossimo. Nessun totale combinato.
                  </p>
                </div>
              )}
            </div>
            <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--nl-nav-height)+1rem)]">
              <WorkspaceStatusCard
                icon={Plane}
                title="Voli"
                subtitle={
                  flightBooked
                    ? 'Prenotazione confermata'
                    : hasSelectedPlan
                      ? `${selectedPlan!.legs.length} tratt${selectedPlan!.legs.length === 1 ? 'a' : 'e'} salvate`
                      : 'Voli fissati dopo la creazione — nessuna ricerca automatica'
                }
                complete={flightBooked || hasSelectedPlan}
                actionLabel={
                  flightBooked ? 'Vedi dettaglio' : hasSelectedPlan ? 'Vedi voli' : 'Scegli voli'
                }
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
                ) : hasSelectedPlan ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {selectedPlan!.legs.slice(0, 3).map((l) => (
                      <li key={l.id}>
                        {l.originIata} → {l.destinationIata}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <WorkspaceEmptyState
                    title="Nessun volo selezionato"
                    body="I voli scelti in Organizza restano fissi qui. Puoi modificarli quando vuoi."
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
                actionLabel={
                  hotelCount > 0
                    ? 'Vedi dettaglio'
                    : flightBooked
                      ? 'Scegli hotel'
                      : 'Vai agli hotel'
                }
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
                    body={
                      canBookFlights && !flightBooked
                        ? 'Conferma il volo per sbloccare la scelta hotel.'
                        : 'Scegli dove soggiornare in ogni città.'
                    }
                  />
                )}
              </WorkspaceStatusCard>
            </aside>
          </div>
        ) : null}

        {tab === 'voli' ? (
          <div className="ws-widget rounded-2xl p-5 sm:p-6" data-testid="trip-tab-voli">
            <div className="mb-5 border-b border-slate-100 pb-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
                Voli
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Voli fissati alla creazione. Nessuna ricerca automatica: modifica solo se vuoi
                cambiare una tratta.
              </p>
            </div>
            {!canBookFlights ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center">
                {comingSoon ? (
                  <>
                    <p className="font-medium text-slate-800">Partenza in arrivo</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Le iscrizioni si apriranno quando sarà collegato un tour operator partner.
                      Non è possibile unirsi né prenotare ora.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-800">Partecipa per vedere i voli</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Unisciti al gruppo per sbloccare voli e prenotazione.
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
                  </>
                )}
              </div>
            ) : practice ? (
              <div className="space-y-4">
                {flightBooked ? (
                  <BookingRecap practice={practice} section="flight" />
                ) : null}
                {hasSelectedPlan || !flightBooked ? (
                  <TripSelectedFlightsPanel
                    practice={practice}
                    currentUserId={currentUserId}
                    participants={participants}
                    members={uniqueMembers}
                    canEdit={isMember}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'partecipanti' ? (
          <div className="ws-widget rounded-2xl p-5 sm:p-6" data-testid="trip-tab-partecipanti">
            <div className="mb-5 border-b border-slate-100 pb-5">
              <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
                Partecipanti
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Creatore e invitati. Lo stato volo di ciascuno è su Voli → Chi paga.
              </p>
            </div>
            {participants.length === 0 ? (
              <WorkspaceEmptyState
                title="Nessun partecipante"
                body="Invita amici dal prossimo passo o dalla chat del gruppo."
              />
            ) : (
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.isSelf ? 'Tu' : p.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {p.isOwner ? 'Creatore' : 'Partecipante'}
                        {p.flightsBought ? ' · volo prenotato' : ' · volo in attesa'}
                      </p>
                    </div>
                    <Users className="h-4 w-4 shrink-0 text-slate-300" />
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 w-full rounded-full"
              onClick={() => selectTab('voli')}
            >
              Vai a Voli · Chi paga
            </Button>
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
            {!canBookFlights ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center">
                <p className="font-medium text-slate-800">Partecipa per prenotare gli hotel</p>
                <p className="mt-1 text-sm text-slate-500">
                  Unisciti al gruppo per iniziare il percorso di prenotazione.
                </p>
              </div>
            ) : !canBookHotels ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-6 text-center">
                <p className="font-medium text-slate-800">Hotel in attesa del volo</p>
                <p className="mt-1 text-sm text-slate-600">
                  Conferma il volo per sbloccare la ricerca hotel.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => selectTab('voli')}
                >
                  Vai ai voli
                </Button>
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
                  <LiteApiHotelSearch
                    defaultCity={
                      practice.destination_label ||
                      resolvedDestinationName
                    }
                    defaultCheckin={dateFrom}
                    defaultCheckout={dateTo}
                    defaultAdults={1}
                    autoSearch={Boolean(practice.destination_label || resolvedDestinationName)}
                    cacheKey={null}
                    className="rounded-2xl border border-slate-100 bg-white p-3"
                    practiceId={practice.id}
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
