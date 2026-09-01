'use client';

import { useMemo, useState, useTransition } from 'react';
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
import { WorkspaceHero, WorkspaceMetaChip } from '@/components/itineraries/workspace/WorkspaceHero';
import { Button } from '@/components/ui/button';
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

const STEPS = [
  { id: 'when', label: 'Quando' },
  { id: 'vibe', label: 'Vibe' },
  { id: 'mode', label: 'Modalità' },
] as const;

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

function SetupProgress({
  datesReady,
  vibeReady,
  modeReady,
}: {
  datesReady: boolean;
  vibeReady: boolean;
  modeReady: boolean;
}) {
  const done = [datesReady, vibeReady, modeReady];
  const activeIdx = done.findIndex((d) => !d);
  const current = activeIdx === -1 ? STEPS.length - 1 : activeIdx;

  return (
    <ol className="flex gap-2 sm:gap-3" aria-label="Progresso configurazione">
      {STEPS.map((step, i) => {
        const complete = done[i];
        const active = i === current && !complete;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                complete
                  ? 'bg-primary text-white'
                  : active
                    ? 'bg-primary/15 text-primary ring-2 ring-primary/25'
                    : 'bg-slate-100 text-slate-400'
              )}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                'hidden truncate text-xs font-semibold sm:block',
                complete || active ? 'text-slate-800' : 'text-slate-400'
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 ? (
              <div
                className={cn(
                  'ml-auto hidden h-px flex-1 sm:block',
                  complete ? 'bg-primary/40' : 'bg-slate-200'
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SetupSection({
  step,
  title,
  summary,
  complete,
  onEdit,
  children,
}: {
  step: number;
  title: string;
  summary?: string;
  complete: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="ws-widget overflow-hidden rounded-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/70 to-white px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              complete ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
            )}
          >
            {complete ? <Check className="h-4 w-4" /> : step}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>
            {summary ? (
              <p className="mt-0.5 text-sm text-slate-600">{summary}</p>
            ) : null}
          </div>
        </div>
        {complete && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifica
          </button>
        ) : null}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
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
  const stops = useMemo(() => routeStops(overviewTemplate), [overviewTemplate]);
  const durations = templatesForDestination(template.destination_slug);

  const datesReady = Boolean(whenSelection);
  const vibeReady = vibe != null;
  const modeReady = mode != null;
  const canCreate = datesReady && vibeReady && modeReady;

  const missingHint = !datesReady
    ? 'Seleziona il periodo del viaggio.'
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
    <div className="ws-surface space-y-5 pb-28 sm:space-y-6 sm:pb-10">
      <WorkspaceHero
        destinationSlug={overviewTemplate.destination_slug}
        destinationName={overviewTemplate.destination_name}
        eyebrow="Configura il tuo viaggio"
        backLabel="Destinazioni"
        onBack={onBack}
        action={
          <PlanSaveButton
            templateId={template.template_id}
            initialSaved={favoriteTemplateIds.includes(template.template_id)}
            isLoggedIn={Boolean(session?.user)}
          />
        }
        chips={
          <>
            <WorkspaceMetaChip icon={Wallet}>
              ~{overviewTemplate.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € ·{' '}
              {COMPLIANCE_COPY.budgetLabel.toLowerCase()}
            </WorkspaceMetaChip>
            <WorkspaceMetaChip>{overviewTemplate.duration_days} giorni</WorkspaceMetaChip>
          </>
        }
      />

      <div className="ws-widget rounded-2xl p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
          {overviewTemplate.summary}
        </p>
        {stops.length > 0 ? (
          <p className="mt-2 text-sm font-medium text-slate-800">{stops.join(' → ')}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {durations.map((t) => (
            <button
              key={t.template_id}
              type="button"
              onClick={() => onDurationChange(t.duration_days)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                t.duration_days === duration
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40'
              )}
            >
              {t.duration_days} giorni
            </button>
          ))}
        </div>
      </div>

      <SetupProgress datesReady={datesReady} vibeReady={vibeReady} modeReady={modeReady} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-6">
        <div className="space-y-5">
          <SetupSection
            step={1}
            title="Quando parti?"
            summary={
              datesReady && whenSelection && !editingWhen
                ? `${formatPeriod(whenSelection.dateFrom, whenSelection.dateTo)} · ${whenSelection.tripDays} giorni`
                : undefined
            }
            complete={datesReady && !editingWhen}
            onEdit={datesReady ? () => setEditingWhen(true) : undefined}
          >
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
          </SetupSection>

          {datesReady ? (
            <SetupSection
              step={2}
              title="Che vibe cerchi?"
              summary={vibeReady && vibeMeta && !editingVibe ? vibeMeta.label : undefined}
              complete={vibeReady && !editingVibe}
              onEdit={vibeReady ? () => setEditingVibe(true) : undefined}
            >
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
                          'rounded-2xl border px-3 py-3.5 text-left transition',
                          active
                            ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/15'
                            : 'border-slate-200/90 bg-white hover:border-primary/30 hover:shadow-sm'
                        )}
                      >
                        <Icon
                          className={cn('h-4 w-4', active ? 'text-primary' : 'text-slate-400')}
                        />
                        <p className="mt-2 text-sm font-semibold text-slate-900">{v.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{v.hint}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </SetupSection>
          ) : null}

          {vibeReady ? (
            <SetupSection
              step={3}
              title="Come vuoi viaggiare?"
              summary={modeMeta ? modeMeta.label : undefined}
              complete={modeReady}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {MODES.map(({ id, label, hint, Icon }) => {
                  const active = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      className={cn(
                        'rounded-2xl border px-3 py-3.5 text-left transition',
                        active
                          ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/15'
                          : 'border-slate-200/90 bg-white hover:border-primary/30 hover:shadow-sm'
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4', active ? 'text-primary' : 'text-slate-400')}
                      />
                      <p className="mt-2 text-sm font-semibold text-slate-900">{label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
                    </button>
                  );
                })}
              </div>
            </SetupSection>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--nl-nav-height)+1rem)] lg:self-start">
          <div className="ws-widget overflow-hidden rounded-2xl">
            <p className="border-b border-slate-100/90 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
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
            <div className="space-y-2 border-t border-slate-100/90 px-4 py-4 sm:px-5">
              {stops.length > 0 ? (
                <p className="text-sm leading-relaxed text-slate-700">{stops.join(' → ')}</p>
              ) : (
                <p className="text-sm leading-relaxed text-slate-700">
                  {overviewTemplate.destination_name}
                </p>
              )}
              <p className="text-xs leading-relaxed text-slate-500">
                {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.budgetLabel}: stima, non prezzo
                del viaggio.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/90 px-4 py-4 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 sm:max-w-none">
          <p className="text-center text-sm font-medium text-slate-700">
            {canCreate ? 'Tutto pronto — crea il viaggio' : missingHint}
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full min-w-[12rem] rounded-full px-8 font-semibold shadow-lg shadow-primary/15 sm:w-auto"
            disabled={!canCreate || pending}
            onClick={createTrip}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Crea viaggio
          </Button>
        </div>
      </div>
    </div>
  );
}
