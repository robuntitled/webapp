'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  Lock,
  MessageCircle,
  Plane,
  Search,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  inviteEditionFriendAction,
  searchNoiviaUsersAction,
} from '@/actions/edition-invites';
import { Button } from '@/components/ui/button';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import { formatEuro } from '@/lib/format/euro';
import {
  loadPracticeFlightsLocal,
  parseSelectedFlightPlan,
  primaryOfferFromSelected,
  savePracticeFlightsLocal,
  type SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
import { saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import { cn } from '@/lib/utils';

export type ParticipantStatusCard = {
  userId: string;
  name: string;
  status: 'owner' | 'joined' | 'invited';
  flightsBought: boolean;
  hotelBooked: boolean;
};

type Props = {
  practiceId: string;
  editionId: string | null;
  destinationName: string;
  tripTitle: string | null;
  dateFrom: string;
  dateTo: string;
  mode: string;
  editionType: string | null;
  inviteUrl: string | null;
  isPrivate: boolean;
  /** Show invite step only for amici (friends mode). */
  showInviteStep: boolean;
  selectedFlightPlan: SelectedFlightPlanSnapshot | null;
  participants: ParticipantStatusCard[];
};

export function ProssimoPasso({
  practiceId,
  editionId,
  destinationName,
  tripTitle,
  dateFrom,
  dateTo,
  mode,
  inviteUrl,
  isPrivate,
  showInviteStep,
  selectedFlightPlan: selectedFromServer,
  participants,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [friendQuery, setFriendQuery] = useState('');
  const [friendHits, setFriendHits] = useState<
    Array<{
      userId: string;
      firstName: string | null;
      lastName: string | null;
      username: string | null;
    }>
  >([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<SelectedFlightPlanSnapshot | null>(
    selectedFromServer
  );

  useEffect(() => {
    // Merge server plan + pending Organizza stash + per-practice local cache.
    const pendingRaw =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('nl-pending-selected-flights')
        : null;
    const pending = pendingRaw
      ? parseSelectedFlightPlan(JSON.parse(pendingRaw))
      : null;
    const cached = loadPracticeFlightsLocal(practiceId);
    const plan = selectedFromServer ?? pending ?? cached;
    if (plan) {
      setLocalPlan(plan);
      savePracticeFlightsLocal(practiceId, plan);
      try {
        sessionStorage.removeItem('nl-pending-selected-flights');
      } catch {
        /* ignore */
      }
    }
  }, [practiceId, selectedFromServer]);

  useEffect(() => {
    if (!showInviteStep || friendQuery.trim().length < 2) {
      setFriendHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void searchNoiviaUsersAction(friendQuery).then((res) => {
        if (res.error) return;
        setFriendHits(res.users);
      });
    }, 280);
    return () => window.clearTimeout(t);
  }, [friendQuery, showInviteStep]);

  const title = tripTitle?.trim() || destinationName;
  const privacyLabel = isPrivate ? 'privato' : 'gruppo';
  const waHref = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Unisciti al mio viaggio: ${inviteUrl}`)}`
    : null;

  const completedSteps = useMemo(() => {
    let n = 0;
    if (!showInviteStep) n += 1;
    // Invite counts as done when at least one joined friend (besides owner) — real data only.
    else if (participants.some((p) => p.status === 'joined' && p.userId)) n += 1;
    if (participants.some((p) => p.flightsBought)) n += 1;
    if (participants.some((p) => p.hotelBooked)) n += 1;
    return n;
  }, [participants, showInviteStep]);

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Link copiato');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossibile copiare il link');
    }
  }

  function inviteFriend(userId: string) {
    if (!editionId) {
      toast.error('Invito in-app disponibile solo per viaggi con edizione.');
      return;
    }
    setInvitingId(userId);
    startTransition(async () => {
      const res = await inviteEditionFriendAction({ editionId, toUserId: userId });
      setInvitingId(null);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success('Invito inviato in-app (notifica). Nessun messaggio esterno.');
      setFriendQuery('');
      setFriendHits([]);
    });
  }

  function goBuyFlights() {
    const primary = primaryOfferFromSelected(localPlan);
    if (!primary?.offerId || primary.price == null) {
      toast.message(
        'Nessun volo selezionato salvato. Torna in Organizza o modifica le tratte dal viaggio.'
      );
      return;
    }
    saveFlightCheckoutDraft({
      offerId: primary.offerId,
      price: primary.price,
      currency: primary.currency || 'EUR',
      outbound: {
        origin: primary.originIata,
        destination: primary.destinationIata,
        airline: primary.airline,
        departureAt: primary.departureAt,
        arrivalAt: primary.arrivalAt,
        durationMinutes: primary.durationMinutes,
        stops: primary.stops ?? undefined,
      },
      returnLeg: null,
      adults: Math.max(1, localPlan?.travelers ?? 1),
      tripType: 'oneway',
      practiceId,
      createdAt: Date.now(),
    });
    router.push('/prenota/voli/checkout');
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-tint)]/50 py-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="nl-page w-full max-w-2xl">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <h1 className="mt-3 font-display text-2xl font-extrabold text-[var(--color-text)]">
              Viaggio creato
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
              {title} · {formatEditionDateRange(dateFrom, dateTo)} ·{' '}
              <span className="font-semibold text-[var(--color-text)]">{privacyLabel}</span>
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Prossimi passi · {completedSteps} di 3 completati
            </p>
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-tint)]">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(completedSteps / 3) * 100}%` }}
              />
            </div>
          </div>

          <ol className="mt-6 space-y-2.5">
            {showInviteStep ? (
              <li className="rounded-2xl border-2 border-primary bg-white p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                  Ora · Passo 1 — Invita gli amici
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Chi apre il link entra nel viaggio e nella chat. Il link resta privato.
                </p>

                {inviteUrl ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="min-h-10 flex-1 truncate rounded-[10px] border border-[var(--color-border)] bg-[var(--color-tint)]/60 px-2.5 py-2 text-[11px] text-[var(--color-text-secondary)]">
                      {inviteUrl}
                    </code>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="min-h-10 rounded-[10px] bg-accent hover:bg-[var(--color-accent-hover)]"
                        onClick={copyLink}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copia
                      </Button>
                      {waHref ? (
                        <Button asChild variant="outline" size="sm" className="min-h-10 rounded-[10px]">
                          <a href={waHref} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-800">
                    Link invito non ancora disponibile per questo viaggio.
                  </p>
                )}

                <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    Invita chi ha già un account Noivia
                  </p>
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      placeholder="Cerca username o nome…"
                      className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm"
                      data-testid="invite-friend-search"
                    />
                  </label>
                  {friendHits.length > 0 ? (
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      {friendHits.map((u) => {
                        const label =
                          [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                          u.username ||
                          'Utente';
                        return (
                          <li key={u.userId}>
                            <button
                              type="button"
                              disabled={pending && invitingId === u.userId}
                              className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-left text-xs hover:border-primary/40"
                              onClick={() => inviteFriend(u.userId)}
                            >
                              <span>
                                <span className="font-semibold">{label}</span>
                                {u.username ? (
                                  <span className="ml-1 text-[var(--color-text-secondary)]">
                                    @{u.username}
                                  </span>
                                ) : null}
                              </span>
                              <UserPlus className="h-3.5 w-3.5 text-primary" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </li>
            ) : (
              <li className="rounded-2xl border border-[var(--color-border)] p-3.5 sm:p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                  Passo 1 — Il viaggio è tuo
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {mode === 'solo'
                    ? 'Sei da solo: passa ai voli quando vuoi. Nessun invito necessario.'
                    : 'Passa ai voli quando vuoi.'}
                </p>
              </li>
            )}

            <li className="rounded-2xl border border-[var(--color-border)] p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5">
                <Plane className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--color-text)]">
                    Passo 2 — Acquista i voli
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {showInviteStep
                      ? 'Ognuno compra il proprio biglietto, con le stesse tratte già scelte.'
                      : 'Acquista le tratte già scelte in Organizza.'}
                  </p>

                  {localPlan?.legs?.length ? (
                    <ul className="mt-2.5 space-y-1.5" data-testid="selected-flights-summary">
                      {localPlan.legs.map((leg) => (
                        <li
                          key={leg.id}
                          className="rounded-xl bg-[var(--color-tint)]/70 px-2.5 py-2 text-xs"
                        >
                          <p className="font-semibold">
                            {leg.originIata} → {leg.destinationIata}
                            <span className="ml-1 font-normal text-[var(--color-text-secondary)]">
                              · {leg.date.slice(8, 10)}/{leg.date.slice(5, 7)}
                            </span>
                          </p>
                          <p className="text-[var(--color-text-secondary)]">
                            {leg.stops == null
                              ? '—'
                              : leg.stops === 0
                                ? 'Diretto'
                                : `${leg.stops} scalo/i`}
                            {leg.durationMinutes != null
                              ? ` · ${Math.round(leg.durationMinutes / 60)} h`
                              : ''}
                            {leg.airline ? ` · ${leg.airline}` : ''}
                            {leg.price != null
                              ? ` · ${formatEuro(leg.price / Math.max(1, localPlan.travelers), { approx: false }) ?? `${leg.price} €`} a persona`
                              : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-amber-900" data-testid="selected-flights-empty">
                      Nessun volo salvato su questo viaggio (ancora).
                    </p>
                  )}

                  <Button
                    type="button"
                    className="mt-3 min-h-10 w-full rounded-[10px] bg-primary hover:bg-[var(--color-primary-hover)] sm:w-auto"
                    disabled={!primaryOfferFromSelected(localPlan)}
                    onClick={goBuyFlights}
                    data-testid="acquista-voli"
                  >
                    Acquista i voli →
                  </Button>
                </div>
              </div>
            </li>

            <li className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-tint)]/40 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Passo 3 — Scegli l&apos;hotel
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  Si sblocca dopo il volo, così le date coincidono con l&apos;arrivo.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled
                className="min-h-10 shrink-0 rounded-[10px]"
              >
                <Lock className="h-4 w-4" />
                Dopo il volo
              </Button>
            </li>
          </ol>

          <section className="mt-5 rounded-2xl border border-[var(--color-border)] p-3.5" data-testid="trip-participants">
            <h2 className="text-sm font-bold">Partecipanti</h2>
            {participants.length === 0 ? (
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                Nessun dato partecipanti ancora.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {participants.map((p) => (
                  <li
                    key={p.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-tint)]/60 px-2.5 py-2 text-xs"
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {p.status === 'owner'
                        ? 'Creatore'
                        : p.status === 'joined'
                          ? 'Entrato'
                          : 'Invitato'}
                      {p.flightsBought ? ' · voli acquistati' : ''}
                      {p.hotelBooked ? ' · hotel' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isPrivate ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] p-3.5">
              <p className="text-sm font-bold text-[var(--color-text)]">Rendi pubblico come gruppo</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Facoltativo. Il viaggio comparirà in Gruppi. (Attivazione in arrivo — resta privato.)
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-center">
            <Link
              href={`/pratica/${practiceId}`}
              className="inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline"
            >
              Apri workspace viaggio →
            </Link>
            <Link
              href="/pratiche"
              className={cn(
                'inline-flex min-h-10 items-center text-sm font-semibold text-[var(--color-text-secondary)] hover:underline'
              )}
            >
              I miei viaggi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
