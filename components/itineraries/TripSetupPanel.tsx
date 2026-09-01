'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, Globe, Loader2, Pencil, User, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { startPracticeAction } from '@/actions/practices';
import { ItineraryWorldMap } from '@/components/itineraries/ItineraryWorldMap';
import { PlanSaveButton } from '@/components/itineraries/PlanSaveButton';
import {
  TripWhenPicker,
  TRIP_VIBES,
  type TripWhenSelection,
} from '@/components/itineraries/TripWhenPicker';
import { Button } from '@/components/ui/button';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { templatesForDestination } from '@/lib/itineraries/catalog';
import { pickTemplateForTrip, templateWithFittedDays, type TripVibe } from '@/lib/itineraries/fit';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import type { ItineraryTemplate, TravelMode } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

const MODES: {
  id: TravelMode;
  label: string;
  hint: string;
  Icon: typeof User;
}[] = [
  { id: 'solo', label: 'Solo', hint: 'Parti in autonomia, sul tuo ritmo.', Icon: User },
  { id: 'friends', label: 'Con amici', hint: 'Invita chi vuoi sulla stessa partenza.', Icon: Users },
  { id: 'group', label: 'Gruppo aperto', hint: 'Altri viaggiatori possono unirsi.', Icon: Globe },
];

function routeStops(template: ItineraryTemplate): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const day of template.days) {
    const seg = day.area_segment.trim();
    if (!seg) continue;
    const key = seg.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(seg);
  }
  return out;
}

function formatPeriod(from: Date, to: Date) {
  return `${format(from, 'd MMM', { locale: it })} → ${format(to, 'd MMM yyyy', { locale: it })}`;
}

export function TripSetupPanel({
  template,
  duration,
  onDurationChange,
  favoriteTemplateIds,
  onBack,
}: {
  template: ItineraryTemplate;
  duration: number;
  onDurationChange: (days: number) => void;
  favoriteTemplateIds: string[];
  onBack: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [whenSelection, setWhenSelection] = useState<TripWhenSelection | null>(null);
  const [vibe, setVibe] = useState<TripVibe | null>(null);
  const [mode, setMode] = useState<TravelMode | null>(null);
  const [editingWhen, setEditingWhen] = useState(true);
  const [editingVibe, setEditingVibe] = useState(false);
  const [pending, startTransition] = useTransition();

  const overviewTemplate = whenSelection?.template ?? template;
  const cover = coverForDestination(overviewTemplate.destination_slug);
  const stops = useMemo(() => routeStops(overviewTemplate), [overviewTemplate]);
  const durations = templatesForDestination(template.destination_slug);

  const datesReady = Boolean(whenSelection);
  const vibeReady = vibe != null;
  const modeReady = mode != null;
  const canCreate = datesReady && vibeReady && modeReady;

  const missingHint = !datesReady
    ? 'Seleziona prima il periodo del viaggio.'
    : !vibeReady
      ? 'Scegli la vibe del viaggio.'
      : !modeReady
        ? 'Scegli come vuoi viaggiare.'
        : null;

  const vibeMeta = TRIP_VIBES.find((v) => v.id === vibe);
  const modeMeta = MODES.find((m) => m.id === mode);

  function onDatesChange(next: TripWhenSelection | null) {
    setWhenSelection(next);
    if (next) {
      setEditingWhen(false);
      if (!vibe) setEditingVibe(true);
    }
  }

  function pickVibe(next: TripVibe) {
    setVibe(next);
    setEditingVibe(false);
    if (whenSelection) {
      const picked =
        pickTemplateForTrip(template.destination_slug, whenSelection.tripDays, next) ??
        template;
      const fitted = templateWithFittedDays(picked, whenSelection.tripDays);
      setWhenSelection({
        ...whenSelection,
        vibe: next,
        template: fitted,
      });
    }
  }

  function createTrip() {
    if (!whenSelection || !vibe || !mode) {
      toast.error(missingHint ?? 'Completa la configurazione.');
      return;
    }
    if (!session?.user) {
      toast.error('Accedi per creare il viaggio.');
      router.push(
        `/?callbackUrl=${encodeURIComponent(
          `/itinerario/${template.destination_slug}?d=${template.duration_days}`
        )}`
      );
      return;
    }
    startTransition(async () => {
      const result = await startPracticeAction({
        templateId: whenSelection.template.template_id,
        mode,
        dateFrom: format(whenSelection.dateFrom, 'yyyy-MM-dd'),
        dateTo: format(whenSelection.dateTo, 'yyyy-MM-dd'),
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-8 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center rounded-md text-sm text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        ← Destinazioni
      </button>

      <section className="ws-widget rounded-2xl">
        <div className="relative aspect-[2.4/1] min-h-[8.5rem] w-full overflow-hidden rounded-t-2xl sm:min-h-[10rem]">
          <Image
            src={cover}
            alt={overviewTemplate.destination_name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-16 sm:bottom-5 sm:left-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              Configura il tuo viaggio
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-white drop-shadow sm:text-4xl">
              {overviewTemplate.destination_name}
            </h1>
          </div>
          <div className="absolute right-3 top-3">
            <PlanSaveButton
              templateId={template.template_id}
              initialSaved={favoriteTemplateIds.includes(template.template_id)}
              isLoggedIn={Boolean(session?.user)}
            />
          </div>
        </div>
        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            {overviewTemplate.summary}
          </p>
          {stops.length > 0 ? (
            <p className="text-sm font-medium leading-relaxed text-slate-800">
              {stops.join(' → ')}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
              <Wallet className="h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {COMPLIANCE_COPY.budgetLabel}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  ~{overviewTemplate.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a
                  persona
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {durations.map((t) => (
                <button
                  key={t.template_id}
                  type="button"
                  onClick={() => onDurationChange(t.duration_days)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    t.duration_days === duration
                      ? 'bg-primary text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40'
                  )}
                >
                  {t.duration_days} giorni
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-8">
        <section className="ws-widget min-w-0 space-y-4 rounded-2xl p-4 sm:p-6">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {datesReady ? (
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                )}
                Quando
              </p>
              {datesReady && whenSelection && !editingWhen ? (
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatPeriod(whenSelection.dateFrom, whenSelection.dateTo)} ·{' '}
                  {whenSelection.tripDays} giorni
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Quando parti?</p>
              )}
            </div>
            {datesReady && !editingWhen ? (
              <button
                type="button"
                onClick={() => setEditingWhen(true)}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifica
              </button>
            ) : null}
          </header>
          {editingWhen || !datesReady ? (
            <TripWhenPicker
              key={`${template.template_id}-${duration}`}
              destinationSlug={template.destination_slug}
              baseTemplate={template}
              value={whenSelection}
              onChange={onDatesChange}
              showVibe={false}
              vibe={vibe}
              defaultExpanded
            />
          ) : null}
        </section>

        <aside className="min-w-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <div className="ws-widget rounded-2xl">
            <p className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
              Dove andrai
            </p>
            <div className="p-3 sm:p-4">
              <ItineraryWorldMap
                template={overviewTemplate}
                staticMap
                compact
                className="rounded-xl border-0 shadow-none"
              />
            </div>
            <div className="space-y-2 px-4 pb-5 sm:px-5">
              {stops.length > 0 ? (
                <p className="text-sm leading-relaxed text-slate-700">{stops.join(' → ')}</p>
              ) : (
                <p className="text-sm leading-relaxed text-slate-700">
                  {overviewTemplate.destination_name}
                </p>
              )}
              <p className="text-xs leading-relaxed text-slate-500">
                {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.budgetLabel}: stima, non prezzo del
                viaggio.
              </p>
            </div>
          </div>
        </aside>

        {datesReady ? (
          <section className="ws-widget min-w-0 space-y-4 rounded-2xl p-4 sm:p-6">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {vibeReady ? (
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  )}
                  Vibe
                </p>
                {vibeReady && vibeMeta && !editingVibe ? (
                  <p className="mt-1 text-sm font-medium text-slate-800">{vibeMeta.label}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">Che vibe cerchi?</p>
                )}
              </div>
              {vibeReady && !editingVibe ? (
                <button
                  type="button"
                  onClick={() => setEditingVibe(true)}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifica
                </button>
              ) : null}
            </header>
            {editingVibe || !vibeReady ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {TRIP_VIBES.map((v) => {
                  const Icon = v.icon;
                  const active = vibe === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => pickVibe(v.id)}
                      className={cn(
                        'rounded-2xl border px-3 py-3 text-left transition',
                        active
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-slate-200 bg-white hover:border-primary/40'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-slate-400')} />
                      <p className="mt-2 text-sm font-semibold text-slate-900">{v.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{v.hint}</p>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {vibeReady ? (
          <section className="ws-widget min-w-0 space-y-4 rounded-2xl p-4 sm:p-6">
            <header>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {modeReady ? (
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                ) : (
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                )}
                Come vuoi viaggiare
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {modeMeta ? modeMeta.label : 'Scegli come vuoi vivere questo viaggio'}
              </p>
            </header>
            <div className="grid gap-3 sm:grid-cols-3">
              {MODES.map(({ id, label, hint, Icon }) => {
                const active = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-left transition',
                      active
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-slate-200 bg-white hover:border-primary/40'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-slate-400')} />
                    <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <section className="border-t border-slate-200/90 pt-8 text-center">
        <p className="text-sm font-medium text-slate-700">
          {canCreate ? 'Configurazione completata' : missingHint}
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-4 min-w-[12rem] rounded-full px-8 font-semibold"
          disabled={!canCreate || pending}
          onClick={createTrip}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Crea viaggio
        </Button>
      </section>
    </div>
  );
}
