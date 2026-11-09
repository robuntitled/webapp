'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Link2,
  Lock,
  Loader2,
  Pencil,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TripWhenPicker,
  type TripWhenSelection,
} from '@/components/itineraries/TripWhenPicker';
import { DeterministicPlanPanel } from '@/components/itineraries/DeterministicPlanPanel';
import { BudgetBreakdownCard } from '@/components/itineraries/BudgetBreakdownCard';
import { MultiCountryBudgetCard } from '@/components/itineraries/MultiCountryBudgetCard';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import {
  findItineraryBySlug,
  orientativeBudgetHint,
  templatesForDestination,
} from '@/lib/itineraries/catalog';
import { skeletonAsTemplate } from '@/lib/itineraries/deterministic-planner/skeleton';
import { planFromMaster, getMaster } from '@/lib/itineraries/masters';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import {
  combineMultiCountryPlan,
  listCuratedMultiCountryPairs,
} from '@/lib/itineraries/multi-country';
import type { CuratedMultiCountryPair } from '@/lib/itineraries/multi-country';
import {
  EMPTY_ORGANIZZA_DRAFT,
  ORGANIZZA_STEPS,
  type OrganizzaCompanyChoice,
  type OrganizzaDraft,
  type OrganizzaStepId,
  canNavigateToOrganizzaStep,
  companyChoiceToTravelMode,
  companyCreatesPrivateTrip,
  isMultiCountryDraft,
  nextOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';
import { FREE_TRIP_TEMPLATE_ID } from '@/lib/itineraries/free-trip';
import { THAILAND_DESTINATION_SLUG } from '@/lib/itineraries/thailand-pilot';
import { accediHref } from '@/lib/auth/callback-url';
import { BRAND_NAME } from '@/lib/brand';
import { formatEuro } from '@/lib/format/euro';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';

const ORGANIZZA_STORAGE_KEY = 'nl-organizza-draft-v1';

type StoredOrganizza = {
  draft: OrganizzaDraft;
  step: OrganizzaStepId;
  whenSelection: TripWhenSelection | null;
};

function loadOrganizzaStorage(): StoredOrganizza | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ORGANIZZA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOrganizza;
    if (!parsed?.draft || typeof parsed.draft !== 'object') return null;
    return {
      ...parsed,
      draft: patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, parsed.draft),
    };
  } catch {
    return null;
  }
}

function clearOrganizzaStorage() {
  try {
    sessionStorage.removeItem(ORGANIZZA_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type DestCard = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  allowedDurations: number[];
  published?: boolean;
};

function formatPeriod(from: string, to: string) {
  try {
    const a = new Date(`${from}T12:00:00`);
    const b = new Date(`${to}T12:00:00`);
    return `${format(a, 'd MMM', { locale: it })} → ${format(b, 'd MMM yyyy', { locale: it })}`;
  } catch {
    return `${from} → ${to}`;
  }
}

function StepperBar({
  step,
  draft,
  onJump,
}: {
  step: OrganizzaStepId;
  draft: OrganizzaDraft;
  onJump: (id: OrganizzaStepId) => void;
}) {
  const done = organizzaCompletedSteps(draft);
  const destName = (() => {
    if (isMultiCountryDraft(draft) && draft.slugs) {
      const names = draft.slugs.map(
        (s) => getMaster(s)?.nameIt ?? findCatalogDestination(s)?.name ?? s
      );
      return names.join(' + ');
    }
    if (draft.slug != null) {
      return (
        findItineraryBySlug(draft.slug, draft.durationDays ?? undefined)?.destination_name ??
        getMaster(draft.slug)?.nameIt ??
        null
      );
    }
    return null;
  })();

  const summaries: Record<OrganizzaStepId, string> = {
    meta: destName ?? 'Scegli',
    date:
      draft.dateFrom && draft.dateTo
        ? formatPeriod(draft.dateFrom, draft.dateTo)
        : 'Scegli',
    'con-chi':
      draft.company === 'solo'
        ? 'Da solo'
        : draft.company === 'amici'
          ? 'Con amici'
          : draft.company === 'gruppo'
            ? 'Gruppo'
            : 'Scegli',
    riepilogo: step === 'riepilogo' ? 'Ora' : '—',
  };

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:gap-2" aria-label="Progresso organizzazione">
      {ORGANIZZA_STEPS.map((s, i) => {
        const complete = done.has(s.id) && s.id !== step;
        const current = s.id === step;
        const clickable = canNavigateToOrganizzaStep(draft, s.id, step);
        return (
          <li key={s.id} className="min-w-0 flex-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump(s.id)}
              className={cn(
                'flex w-full min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                current &&
                  'border-primary shadow-[0_0_0_3px_rgba(35,42,107,0.12)] bg-white',
                complete && !current && 'border-[var(--color-border)] bg-white',
                !current && !complete && 'border-[var(--color-border)] bg-[var(--color-tint)]/60',
                !clickable && 'cursor-default opacity-70'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  complete && 'bg-primary text-white',
                  current && 'bg-primary text-white',
                  !complete && !current && 'bg-white text-[var(--color-text-secondary)]'
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--color-text)]">
                  {s.label}
                </span>
                <span
                  className={cn(
                    'block truncate text-xs',
                    complete || current
                      ? 'text-primary font-medium'
                      : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  {summaries[s.id]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function SummarySidebar({
  draft,
  onEdit,
}: {
  draft: OrganizzaDraft;
  onEdit: (id: OrganizzaStepId) => void;
}) {
  const tpl =
    draft.slug && draft.durationDays
      ? findItineraryBySlug(draft.slug, draft.durationDays)
      : draft.slug
        ? findItineraryBySlug(draft.slug)
        : undefined;
  const cover = draft.slug ? coverForDestination(draft.slug) : null;

  return (
    <aside className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] lg:sticky lg:top-[calc(var(--nl-nav-height)+1rem)]">
      {cover ? (
        <div className="relative h-36 w-full">
          <Image src={cover} alt="" fill className="object-cover" sizes="340px" />
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center bg-[var(--color-tint)]">
          <Compass className="h-8 w-8 text-primary" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Il tuo viaggio
        </p>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <dt className="text-[var(--color-text-secondary)]">Meta</dt>
              <dd className="font-semibold text-[var(--color-text)]">
                {tpl?.destination_name ?? 'da scegliere'}
              </dd>
            </div>
            {draft.slug ? (
              <button
                type="button"
                onClick={() => onEdit('meta')}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Modifica
              </button>
            ) : null}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <dt className="text-[var(--color-text-secondary)]">Date</dt>
              <dd className="font-semibold text-[var(--color-text)]">
                {draft.dateFrom && draft.dateTo
                  ? formatPeriod(draft.dateFrom, draft.dateTo)
                  : 'da scegliere'}
              </dd>
            </div>
            {draft.dateFrom ? (
              <button
                type="button"
                onClick={() => onEdit('date')}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Modifica
              </button>
            ) : null}
          </div>
          {draft.dateFrom && draft.dateTo ? (
            <div>
              <dt className="text-[var(--color-text-secondary)]">Durata</dt>
              <dd className="font-semibold text-[var(--color-text)]">
                {draft.durationDays
                  ? tripDurationLabelIt(draft.durationDays)
                  : '—'}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[var(--color-text-secondary)]">Con chi</dt>
            <dd className="font-semibold text-[var(--color-text)]">
              {draft.company === 'solo'
                ? 'Da solo'
                : draft.company === 'amici'
                  ? 'Con amici'
                  : 'da scegliere'}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

export function OrganizzaWizard({
  destinations,
  initialSlug,
  initialDuration,
}: {
  destinations: DestCard[];
  initialSlug?: string;
  initialDuration?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);

  const startTpl = initialSlug
    ? findItineraryBySlug(initialSlug, initialDuration)
    : undefined;

  const [step, setStep] = useState<OrganizzaStepId>(startTpl ? 'date' : 'meta');
  const [draft, setDraft] = useState<OrganizzaDraft>(() =>
    startTpl
      ? patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
          slug: startTpl.destination_slug,
          durationDays: startTpl.duration_days,
        })
      : EMPTY_ORGANIZZA_DRAFT
  );
  const [whenSelection, setWhenSelection] = useState<TripWhenSelection | null>(null);

  useEffect(() => {
    const stored = loadOrganizzaStorage();
    const resume = searchParams.get('ripresa') === '1';
    if (stored?.draft) {
      setDraft(patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, stored.draft));
      if (stored.whenSelection) setWhenSelection(stored.whenSelection);
      if (resume && stored.draft.slug && stored.draft.dateFrom && stored.draft.company) {
        setStep('riepilogo');
      } else if (stored.step) {
        setStep(stored.step);
      }
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: StoredOrganizza = { draft, step, whenSelection };
      sessionStorage.setItem(ORGANIZZA_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }, [draft, step, whenSelection, hydrated]);

  const catalogDest = useMemo(
    () => (draft.slug ? findCatalogDestination(draft.slug) : undefined),
    [draft.slug]
  );

  const template = useMemo(() => {
    if (!draft.slug) return undefined;
    const curated = findItineraryBySlug(draft.slug, draft.durationDays ?? undefined);
    if (curated) return curated;
    const dest = findCatalogDestination(draft.slug);
    if (!dest) return undefined;
    return skeletonAsTemplate(dest, draft.durationDays ?? dest.allowedDurations[0] ?? 10);
  }, [draft.slug, draft.durationDays]);

  const hasCuratedTemplate = Boolean(
    draft.slug && templatesForDestination(draft.slug).length > 0
  );

  const published = useMemo(
    () => destinations.filter((d) => d.published !== false),
    [destinations]
  );
  const otherDestinations = useMemo(
    () => destinations.filter((d) => d.published === false),
    [destinations]
  );

  function update(patch: Partial<OrganizzaDraft>) {
    setDraft((d) => patchOrganizzaDraft(d, patch));
  }

  function goTo(target: OrganizzaStepId) {
    if (!canNavigateToOrganizzaStep(draft, target, step)) return;
    setStep(target);
  }

  function goBack() {
    const prev = prevOrganizzaStep(step);
    if (prev) setStep(prev);
  }

  function goNext() {
    const next = nextOrganizzaStep(step, draft);
    if (next === 'gruppi') {
      router.push('/gruppi');
      return;
    }
    if (next) setStep(next);
  }

  function selectDestination(dest: DestCard) {
    const duration =
      dest.allowedDurations[Math.min(1, dest.allowedDurations.length - 1)] ??
      dest.allowedDurations[0];
    if (!duration) {
      toast.error('Durata non disponibile.');
      return;
    }
    update({
      slug: dest.slug,
      slugs: null,
      durationDays: duration,
      dateFrom: null,
      dateTo: null,
      company: null,
      arrivalIata: null,
      departureIata: null,
    });
    setWhenSelection(null);
    setStep('date');
    if (dest.published === false) {
      toast.message(
        'Schema orientativo: luoghi precisi e trasferimenti da verificare prima di prenotare.'
      );
    }
  }

  function selectMultiPair(pair: CuratedMultiCountryPair) {
    update({
      slug: pair.slugs[0],
      slugs: [...pair.slugs],
      durationDays: 14,
      dateFrom: null,
      dateTo: null,
      company: null,
      arrivalIata: pair.arrivalHubIata,
      departureIata: pair.departureHubIata,
    });
    setWhenSelection(null);
    setStep('date');
    toast.message('Combinazione curata: volo open-jaw e trasferimento tra paesi incluso.');
  }

  const multiPlan = useMemo(() => {
    if (!isMultiCountryDraft(draft) || !draft.slugs || !draft.durationDays) return null;
    const plan = combineMultiCountryPlan({
      slugs: draft.slugs,
      tripDays: draft.durationDays,
      vibe: draft.vibe,
      company: draft.company,
    });
    return plan.ok ? plan : null;
  }, [draft.slugs, draft.durationDays, draft.vibe, draft.company]);

  useEffect(() => {
    if (!multiPlan) return;
    if (
      draft.arrivalIata === multiPlan.arrivalIata &&
      draft.departureIata === multiPlan.departureIata
    ) {
      return;
    }
    update({
      arrivalIata: multiPlan.arrivalIata,
      departureIata: multiPlan.departureIata,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync hubs from plan only
  }, [multiPlan?.arrivalIata, multiPlan?.departureIata]);

  function onDatesChange(next: TripWhenSelection | null) {
    setWhenSelection(next);
    if (next) {
      update({
        dateFrom: format(next.dateFrom, 'yyyy-MM-dd'),
        dateTo: format(next.dateTo, 'yyyy-MM-dd'),
        durationDays: next.tripDays,
        vibe: next.vibe,
        slug: next.template.destination_slug,
      });
    }
  }

  function selectCompany(choice: OrganizzaCompanyChoice) {
    update({ company: choice });
  }

  function createTrip() {
    if (!draft.slug || !draft.dateFrom || !draft.dateTo || !draft.company) {
      toast.error('Completa tutti i passi.');
      return;
    }
    if (!companyCreatesPrivateTrip(draft.company)) {
      router.push('/gruppi');
      return;
    }
    const mode = companyChoiceToTravelMode(draft.company);
    if (mode === 'redirect-gruppi') {
      router.push('/gruppi');
      return;
    }
    if (!session?.user) {
      toast.message("Crea l'account per salvare il tuo viaggio.");
      router.push(accediHref('/organizza?ripresa=1', 'register'));
      return;
    }
    const curated = findItineraryBySlug(draft.slug, draft.durationDays ?? undefined);
    const templateId = curated?.template_id ?? FREE_TRIP_TEMPLATE_ID;
    const title =
      draft.tripName.trim() ||
      (curated
        ? null
        : `${catalogDest?.name ?? draft.slug} · schema orientativo`);
    startTransition(async () => {
      const result = await startPracticeAction({
        templateId,
        mode,
        dateFrom: draft.dateFrom!,
        dateTo: draft.dateTo!,
        title,
        destinationLabel: catalogDest?.name ?? draft.slug,
        allowFreeTrip: !curated,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      clearOrganizzaStorage();
    });
  }

  const stepNum = ORGANIZZA_STEPS.find((s) => s.id === step)?.index ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-tint)]/40 pb-16">
      <div className="nl-page w-full space-y-6 pt-6 sm:pt-8">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-3xl">
            Organizza il tuo viaggio
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Quattro passi lineari. Puoi tornare indietro senza perdere le scelte.
          </p>
        </div>

        <StepperBar step={step} draft={draft} onJump={goTo} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
              Passo {stepNum + 1} di {ORGANIZZA_STEPS.length}
            </p>

            {step === 'meta' ? (
              <div className="mt-3 space-y-5">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[var(--color-text)] sm:text-2xl">
                    Dove vuoi andare?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Una meta (default) oppure una combinazione classica di due paesi già
                    verificata. Coppie non in elenco non sono proposte: meglio non inventare
                    collegamenti.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                    Combinazioni multi-paese (curate)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {listCuratedMultiCountryPairs().map((pair) => {
                      const active =
                        isMultiCountryDraft(draft) &&
                        draft.slugs?.[0] === pair.slugs[0] &&
                        draft.slugs?.[1] === pair.slugs[1];
                      return (
                        <button
                          key={pair.id}
                          type="button"
                          onClick={() => selectMultiPair(pair)}
                          className={cn(
                            'rounded-2xl border px-4 py-3 text-left transition',
                            active
                              ? 'border-primary ring-2 ring-primary/20 bg-[var(--color-tint)]'
                              : 'border-[var(--color-border)] hover:border-primary/40'
                          )}
                          data-testid={`multi-pair-${pair.id}`}
                        >
                          <p className="font-semibold text-[var(--color-text)]">{pair.titleIt}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                            {pair.blurbIt}
                          </p>
                          <p className="mt-2 text-[11px] font-medium text-primary">
                            Open-jaw {pair.arrivalHubIata} → {pair.departureHubIata} ·{' '}
                            {pair.transfer.verified ? 'collegamento verificato' : 'da verificare'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Controlla visti e documenti per ogni paese su{' '}
                    <a
                      href="https://www.viaggiaresicuri.it/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Viaggiare Sicuri
                    </a>
                    .
                  </p>
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                  Una sola meta
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {published.map((dest, destIndex) => {
                    const budget = orientativeBudgetHint(dest.slug);
                    const active = !isMultiCountryDraft(draft) && draft.slug === dest.slug;
                    return (
                      <button
                        key={dest.slug}
                        type="button"
                        onClick={() => selectDestination(dest)}
                        className={cn(
                          'overflow-hidden rounded-2xl border text-left transition',
                          active
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-[var(--color-border)] hover:border-primary/40'
                        )}
                      >
                        <div className="relative h-28 w-full">
                          <Image
                            src={coverForDestination(dest.slug)}
                            alt={dest.name}
                            fill
                            priority={destIndex === 0}
                            className="object-cover"
                            sizes="(max-width:640px) 100vw, 40vw"
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-emerald-700/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Itinerario disponibile
                          </span>
                        </div>
                        <div className="space-y-1 p-3">
                          <p className="font-semibold text-[var(--color-text)]">
                            {dest.emoji} {dest.name}
                          </p>
                          <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                            {dest.vibe}
                          </p>
                          <p className="text-xs font-medium text-primary">
                            {dest.allowedDurations.join(' / ')} giorni
                            {budget != null
                              ? ` · ${COMPLIANCE_COPY.budgetLabel} · ${formatEuro(budget, { approx: false })}`
                              : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {otherDestinations.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                      Altre mete · schema orientativo
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {otherDestinations.map((dest) => {
                        const active = draft.slug === dest.slug;
                        return (
                          <button
                            key={dest.slug}
                            type="button"
                            onClick={() => selectDestination(dest)}
                            className={cn(
                              'rounded-xl border px-3 py-3 text-left transition',
                              active
                                ? 'border-primary bg-[var(--color-tint)] ring-2 ring-primary/15'
                                : 'border-dashed border-[var(--color-border)] bg-[var(--color-tint)]/50 hover:border-primary/40'
                            )}
                          >
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              {dest.emoji} {dest.name}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                              Piano base con lacune da verificare — non un itinerario curato.
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 'date' && template ? (
              <div className="mt-3 space-y-5">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[var(--color-text)] sm:text-2xl">
                    Quando parti?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Scegli le date: adattiamo l&apos;itinerario alla durata.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(isMultiCountryDraft(draft)
                    ? [10, 14, 21]
                    : templatesForDestination(template.destination_slug).length
                      ? templatesForDestination(template.destination_slug).map(
                          (t) => t.duration_days
                        )
                      : catalogDest?.allowedDurations ?? [draft.durationDays ?? 10]
                  ).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        update({ durationDays: days });
                        setWhenSelection(null);
                      }}
                      className={cn(
                        'inline-flex min-h-11 items-center rounded-full px-3.5 text-xs font-semibold transition',
                        days === draft.durationDays
                          ? 'bg-primary text-white'
                          : 'border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-primary/40'
                      )}
                    >
                      {days} giorni
                    </button>
                  ))}
                </div>
                {isMultiCountryDraft(draft) && multiPlan ? (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Ripartizione: {multiPlan.shares.map((s) => `${s.nameIt} ${s.days}g`).join(' · ')}{' '}
                    + 1 giorno trasferimento ({multiPlan.transfer.mode}
                    {multiPlan.transfer.durationHours != null
                      ? ` · ~${multiPlan.transfer.durationHours} h`
                      : ''}
                    ). Hub open-jaw {multiPlan.arrivalIata} → {multiPlan.departureIata}.
                  </p>
                ) : null}
                <TripWhenPicker
                  key={`${template.template_id}-${draft.durationDays}-${draft.slugs?.join('+') ?? 'single'}`}
                  destinationSlug={template.destination_slug}
                  baseTemplate={
                    findItineraryBySlug(template.destination_slug, draft.durationDays ?? undefined) ??
                    template
                  }
                  value={whenSelection}
                  onChange={onDatesChange}
                  showVibe
                  defaultExpanded
                />
                {template.destination_slug === THAILAND_DESTINATION_SLUG ? (
                  <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-tint)]/40 p-4">
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      Hub aeroportuali (opzionale)
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Se l&apos;aeroporto non è tra i hub curati Thailandia, compare un avviso — senza
                      inventare collegamenti.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="arrival-iata" className="text-xs font-semibold">
                          Arrivo (IATA)
                        </Label>
                        <Input
                          id="arrival-iata"
                          value={draft.arrivalIata ?? ''}
                          onChange={(e) =>
                            update({
                              arrivalIata: e.target.value.trim().toUpperCase().slice(0, 3) || null,
                            })
                          }
                          placeholder="BKK"
                          className="mt-1.5 h-11 rounded-[10px] uppercase"
                          maxLength={3}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <Label htmlFor="departure-iata" className="text-xs font-semibold">
                          Partenza (IATA)
                        </Label>
                        <Input
                          id="departure-iata"
                          value={draft.departureIata ?? ''}
                          onChange={(e) =>
                            update({
                              departureIata: e.target.value.trim().toUpperCase().slice(0, 3) || null,
                            })
                          }
                          placeholder="BKK"
                          className="mt-1.5 h-11 rounded-[10px] uppercase"
                          maxLength={3}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
                {isMultiCountryDraft(draft) && multiPlan ? (
                  <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-tint)]/40 px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                    Anteprima multi-paese nel riepilogo. Qui basta fissare le date (
                    {multiPlan.shares.map((s) => `${s.nameIt} ${s.days}g`).join(' + ')} + trasferimento).
                  </p>
                ) : draft.durationDays && draft.slug ? (
                  <DeterministicPlanPanel
                    destinationSlug={draft.slug}
                    tripDays={draft.durationDays}
                    vibe={draft.vibe}
                    travelMonth={
                      draft.dateFrom
                        ? Number(draft.dateFrom.slice(5, 7)) || null
                        : null
                    }
                    arrivalIata={draft.arrivalIata}
                    departureIata={draft.departureIata}
                  />
                ) : null}
              </div>
            ) : null}

            {step === 'con-chi' ? (
              <div className="mt-3 space-y-5">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-[var(--color-text)] sm:text-2xl">
                    Con chi parti?
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Da solo o con amici il viaggio resta privato. Puoi cambiare fino alla creazione.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        id: 'solo' as const,
                        label: 'Da solo',
                        hint: 'Il viaggio è solo tuo: itinerario, budget e prenotazioni.',
                        badge: 'Solo tuo, nessuno può unirsi',
                        BadgeIcon: Lock,
                        Icon: User,
                      },
                      {
                        id: 'amici' as const,
                        label: 'Con amici',
                        hint: 'Viaggio privato: entra solo chi riceve il tuo link.',
                        badge: 'Privato, ricevi un link da inviare',
                        BadgeIcon: Link2,
                        Icon: Users,
                      },
                    ] as const
                  ).map((opt) => {
                    const active = draft.company === opt.id;
                    const BadgeIcon = opt.BadgeIcon;
                    const Icon = opt.Icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectCompany(opt.id)}
                        className={cn(
                          'rounded-2xl border px-4 py-4 text-left transition',
                          active
                            ? 'border-primary bg-[var(--color-tint)] ring-2 ring-primary/15'
                            : 'border-[var(--color-border)] bg-white hover:border-primary/35'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            active ? 'text-primary' : 'text-[var(--color-text-secondary)]'
                          )}
                        />
                        <p className="mt-2 text-base font-bold text-[var(--color-text)]">
                          {opt.label}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{opt.hint}</p>
                        <span
                          className={cn(
                            'mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'bg-[var(--color-tint)] text-[var(--color-text-secondary)]'
                          )}
                        >
                          <BadgeIcon className="h-3.5 w-3.5" />
                          {opt.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Cerchi compagni di viaggio? Dopo la creazione puoi rendere il viaggio pubblico
                  come gruppo, oppure{' '}
                  <Link href="/gruppi" className="font-semibold text-primary underline-offset-2 hover:underline">
                    unirti a un gruppo esistente
                  </Link>
                  .
                </p>
                {(draft.company === 'solo' || draft.company === 'amici') && (
                  <div>
                    <Label htmlFor="trip-name" className="text-sm font-semibold">
                      Nome del viaggio{' '}
                      <span className="font-normal text-[var(--color-text-secondary)]">
                        (opzionale)
                      </span>
                    </Label>
                    <Input
                      id="trip-name"
                      value={draft.tripName}
                      onChange={(e) => update({ tripName: e.target.value.slice(0, 80) })}
                      placeholder={`Es. ${template?.destination_name ?? 'Thailandia'} con gli amici`}
                      className="mt-2 h-11 rounded-[10px]"
                      maxLength={80}
                    />
                    <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                      Se vuoto, usiamo il nome della meta.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {step === 'riepilogo' && template ? (
              <div className="mt-3 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={coverForDestination(template.destination_slug)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                      Riepilogo
                    </p>
                    <h2 className="font-display text-xl font-extrabold text-[var(--color-text)]">
                      {draft.tripName.trim() ||
                        `${template.destination_name}${
                          draft.company === 'amici' ? ' con gli amici' : ''
                        }`}
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {hasCuratedTemplate
                        ? `Itinerario curato ${BRAND_NAME} · disponibilità e prezzi da verificare`
                        : `Schema orientativo ${BRAND_NAME} · disponibilità e prezzi da verificare`}
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)]">
                  {(
                    [
                      {
                        id: 'meta' as const,
                        label: 'Meta',
                        value: template.destination_name,
                      },
                      {
                        id: 'date' as const,
                        label: 'Date',
                        value:
                          draft.dateFrom && draft.dateTo
                            ? `${formatPeriod(draft.dateFrom, draft.dateTo)} · ${
                                draft.durationDays
                                  ? tripDurationLabelIt(draft.durationDays)
                                  : '—'
                              }`
                            : '—',
                      },
                      {
                        id: 'con-chi' as const,
                        label: 'Con chi',
                        value:
                          draft.company === 'solo'
                            ? 'Da solo · Privato'
                            : 'Con amici · Privato: entra solo chi riceve il tuo link',
                      },
                    ] as const
                  ).map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-3 px-4 py-3.5"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                          {row.label}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">
                          {row.value}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => goTo(row.id)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifica
                      </button>
                    </li>
                  ))}
                </ul>

                {draft.durationDays && multiPlan ? (
                  <MultiCountryBudgetCard plan={multiPlan} />
                ) : draft.durationDays ? (
                  <BudgetBreakdownCard
                    destinationSlug={template.destination_slug}
                    tripDays={draft.durationDays}
                    vibe={draft.vibe}
                    company={draft.company}
                    days={
                      planFromMaster(
                        template.destination_slug,
                        draft.durationDays,
                        draft.vibe === 'relax' ||
                          draft.vibe === 'divertimento' ||
                          draft.vibe === 'avventura'
                          ? draft.vibe
                          : null
                      )?.template.days
                    }
                  />
                ) : null}

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-tint)]/50 p-4">
                  <p className="text-sm font-bold text-[var(--color-text)]">Cosa succede dopo</p>
                  <ol className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li>
                      <span className="font-semibold text-primary">1.</span> Ricevi il link
                      privato
                    </li>
                    <li>
                      <span className="font-semibold text-primary">2.</span> Ognuno prenota il
                      volo
                    </li>
                    <li>
                      <span className="font-semibold text-primary">3.</span> Scegliete l&apos;hotel
                    </li>
                  </ol>
                </div>

                {multiPlan ? (
                  <section
                    className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-4"
                    data-testid="multi-country-plan"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                      Itinerario multi-paese
                    </p>
                    <h3 className="font-display text-lg font-extrabold text-[var(--color-text)]">
                      {multiPlan.titleIt} · {tripDurationLabelIt(multiPlan.tripDays)}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Ordine: {multiPlan.orderedSlugs.map((s) => getMaster(s)?.nameIt ?? s).join(' → ')}.
                      Trasferimento: {multiPlan.transfer.notesIt}
                      {multiPlan.transferNeedsCheck ? ' · da verificare' : ''}.
                    </p>
                    <ol className="space-y-2">
                      {multiPlan.days.map((d) => (
                        <li
                          key={d.day_number}
                          className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
                        >
                          <p className="font-bold text-[var(--color-text)]">
                            Giorno {d.day_number}: {d.title}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {d.area_segment}
                            {d.transfer && d.transfer !== 'none' ? ` · ${d.transfer}` : ''}
                          </p>
                        </li>
                      ))}
                    </ol>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {multiPlan.visaNoticeIt}{' '}
                      <a
                        href={multiPlan.visaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        viaggiaresicuri.it
                      </a>
                    </p>
                  </section>
                ) : draft.slug && draft.durationDays ? (
                  <DeterministicPlanPanel
                    destinationSlug={draft.slug}
                    tripDays={draft.durationDays}
                    vibe={draft.vibe}
                    travelMonth={
                      draft.dateFrom
                        ? Number(draft.dateFrom.slice(5, 7)) || null
                        : null
                    }
                    arrivalIata={draft.arrivalIata}
                    departureIata={draft.departureIata}
                    company={draft.company}
                    showLegalDraft
                    hideBudget
                  />
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
                <Check className="h-3.5 w-3.5" />
                Scelte salvate su questo dispositivo
              </p>
              <div className="flex flex-wrap gap-2">
                {step !== 'meta' ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-[10px]"
                    onClick={goBack}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Indietro
                  </Button>
                ) : null}
                {step === 'riepilogo' ? (
                  <Button
                    type="button"
                    variant="cta"
                    size="lg"
                    className="min-h-11 rounded-[10px] px-6"
                    disabled={pending}
                    onClick={createTrip}
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Crea viaggio
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="cta"
                    size="lg"
                    className="min-h-11 rounded-[10px] px-6"
                    disabled={
                      (step === 'meta' && !draft.slug) ||
                      (step === 'date' && !(draft.dateFrom && draft.dateTo)) ||
                      (step === 'con-chi' && !draft.company)
                    }
                    onClick={goNext}
                  >
                    Continua
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <SummarySidebar draft={draft} onEdit={goTo} />
        </div>
      </div>
    </div>
  );
}
