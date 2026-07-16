'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { discardComposerDraft } from '@/actions/composer-draft';
import { summarizeComposerDraftWithStep } from '@/lib/composer/draft-utils';
import type { ComposerWizardStep } from '@/lib/composer/wizard-steps';
import type { ComposerDraft } from '@/types/composer';
import type { TripWithRelations } from '@/types/trip';
import { getTripStatus, isTripStarted } from '@/lib/utils/trip';
import {
  BookOpen,
  ChevronRight,
  Compass,
  FileEdit,
  Loader2,
  History,
  Palmtree,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type HubSection = 'drafts' | 'organizing' | 'relax' | 'past';

type ComposerDraftPayload = {
  draft: Partial<ComposerDraft>;
  currentStep: ComposerWizardStep;
  updatedAt: string | null;
} | null;

type MyTripsHubProps = {
  createdTrips: TripWithRelations[];
  joinedTrips: TripWithRelations[];
  composerDraft: ComposerDraftPayload;
};

const SECTIONS: {
  id: HubSection;
  label: string;
  description: string;
  icon: typeof BookOpen;
  accent: string;
}[] = [
  {
    id: 'drafts',
    label: 'Bozze',
    description: 'Non ancora pubblicati',
    icon: FileEdit,
    accent: 'hub-accent-amber',
  },
  {
    id: 'organizing',
    label: 'Organizzo io',
    description: 'Tu guidi il viaggio',
    icon: Compass,
    accent: 'hub-accent-sky',
  },
  {
    id: 'relax',
    label: 'Modalità relax',
    description: 'Ti sei unito alla crew',
    icon: Palmtree,
    accent: 'hub-accent-teal',
  },
  {
    id: 'past',
    label: 'Viaggi passati',
    description: 'Conclusi o già partiti',
    icon: History,
    accent: 'hub-accent-amber',
  },
];

function defaultSection(
  hasDraft: boolean,
  organizingCount: number,
  relaxCount: number
): HubSection {
  if (hasDraft) return 'drafts';
  if (organizingCount > 0) return 'organizing';
  if (relaxCount > 0) return 'relax';
  return 'organizing';
}

function DraftListItem({
  draft,
  currentStep,
  updatedAt,
  onRemoved,
}: {
  draft: Partial<ComposerDraft>;
  currentStep: ComposerWizardStep;
  updatedAt: string | null;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const summary = summarizeComposerDraftWithStep(draft, currentStep);
  const updatedLabel = updatedAt
    ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: it })
    : null;

  const handleDiscard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await discardComposerDraft();
        onRemoved();
        toast.message('Bozza eliminata');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore eliminazione');
      }
    });
  };

  return (
    <Link
      href="/dashboard/crea?resume=1"
      className="hub-list-item group flex items-center gap-4 p-4 md:p-5"
    >
      <div className="hub-list-icon hub-icon-amber shrink-0">
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/80 mb-0.5">
          {summary.stepLabel}
        </p>
        <p className="font-semibold text-foreground truncate">
          {draft.title?.trim() || summary.destinationLabel}
        </p>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {summary.destinationLabel}
          {summary.dateRange ? ` · ${summary.dateRange}` : ''}
          {summary.blockCount > 0 ? ` · ${summary.blockCount} tappe` : ''}
        </p>
        {updatedLabel && (
          <p className="text-xs text-muted-foreground/70 mt-1">Aggiornata {updatedLabel}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={pending}
          onClick={handleDiscard}
          aria-label="Elimina bozza"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  );
}

function TripListItem({
  trip,
  variant,
}: {
  trip: TripWithRelations;
  variant: 'organizing' | 'relax' | 'past';
}) {
  const status = getTripStatus(trip.startDate, trip.endDate);
  const imageUrl = trip.imageUrl || '/images/trips/placeholder.jpg';

  return (
    <Link href={`/viaggi/${trip.id}`} className="hub-list-item group flex items-center gap-4 p-4 md:p-5">
      <div className="relative h-14 w-14 md:h-16 md:w-16 rounded-xl overflow-hidden shrink-0 bg-muted">
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="64px" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              status.variant === 'default'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {status.text}
          </span>
          {variant === 'relax' && (
            <span className="text-[10px] font-medium text-muted-foreground">Relax</span>
          )}
        </div>
        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {trip.title}
        </p>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {trip.destination} · {format(new Date(trip.startDate), 'd MMM yyyy', { locale: it })}
          {trip.participantCount != null
            ? ` · ${trip.participantCount}/${trip.maxParticipants}`
            : ''}
        </p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-muted-foreground">da</p>
        <p className="text-lg font-bold text-primary tabular-nums">{trip.price}€</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
    </Link>
  );
}

function EmptyPanel({
  section,
}: {
  section: HubSection;
}) {
  if (section === 'drafts') {
    return (
      <div className="hub-empty py-16 px-6 text-center">
        <FileEdit className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-medium text-foreground">Nessuna bozza</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Inizia un nuovo viaggio: la bozza si salva automaticamente e la ritrovi qui.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/dashboard/crea">Nuovo viaggio</Link>
        </Button>
      </div>
    );
  }

  if (section === 'organizing') {
    return (
      <div className="hub-empty py-16 px-6 text-center">
        <Compass className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-medium text-foreground">Nessun viaggio organizzato</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Crea il primo, invita la crew e tieni tutto in un unico posto.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/dashboard/crea">Organizza il primo viaggio</Link>
        </Button>
      </div>
    );
  }

  if (section === 'past') {
    return (
      <div className="hub-empty py-16 px-6 text-center">
        <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-medium text-foreground">Nessun viaggio passato</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          I viaggi conclusi o già partiti compariranno qui.
        </p>
      </div>
    );
  }

  return (
    <div className="hub-empty py-16 px-6 text-center">
      <Palmtree className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
      <p className="font-medium text-foreground">Nessun viaggio in relax</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        Unisciti ai viaggi degli amici dalla dashboard — zero pianificazione.
      </p>
      <Button asChild variant="secondary" className="mt-6 rounded-full">
        <Link href="/dashboard">Scopri viaggi</Link>
      </Button>
    </div>
  );
}

export function MyTripsHub({
  createdTrips,
  joinedTrips,
  composerDraft,
}: MyTripsHubProps) {
  const hasDraft = Boolean(composerDraft?.draft?.destination?.trim());
  const [draftVisible, setDraftVisible] = useState(hasDraft);
  const upcomingCreated = useMemo(
    () => createdTrips.filter((t) => !isTripStarted(t.startDate)),
    [createdTrips]
  );
  const upcomingJoined = useMemo(
    () => joinedTrips.filter((t) => !isTripStarted(t.startDate)),
    [joinedTrips]
  );
  const pastTrips = useMemo(
    () =>
      [...createdTrips, ...joinedTrips].filter((t) => isTripStarted(t.startDate)),
    [createdTrips, joinedTrips]
  );

  const [active, setActive] = useState<HubSection>(() =>
    defaultSection(hasDraft, upcomingCreated.length, upcomingJoined.length)
  );

  const counts = useMemo(
    () => ({
      drafts: draftVisible && hasDraft ? 1 : 0,
      organizing: upcomingCreated.length,
      relax: upcomingJoined.length,
      past: pastTrips.length,
    }),
    [draftVisible, hasDraft, upcomingCreated.length, upcomingJoined.length, pastTrips.length]
  );

  const activeMeta = SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div>
          <p className="text-accent font-medium text-xs uppercase tracking-[0.2em] mb-2">
            Il tuo hub viaggi
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-white tracking-tight">
            I miei viaggi
          </h1>
          <p className="mt-3 text-white/65 max-w-lg text-base leading-relaxed">
            Bozze, viaggi che organizzi e modalità relax — tutto in un unico posto.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full shrink-0 gap-2 shadow-lg">
          <Link href="/dashboard/crea">
            <Plus className="h-4 w-4" />
            Nuovo viaggio
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          const count = counts[section.id];

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={`hub-category-card text-left p-5 md:p-6 rounded-2xl transition-all duration-200 ${
                isActive ? `hub-category-active ${section.accent}` : 'hub-category-idle'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`hub-category-icon ${isActive ? 'hub-category-icon-active' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {count}
                </span>
              </div>
              <p className="font-display text-lg font-semibold text-white mt-4">{section.label}</p>
              <p className="text-sm text-white/55 mt-1">{section.description}</p>
            </button>
          );
        })}
      </div>

      <div className="hub-panel rounded-3xl overflow-hidden">
        <div className="hub-panel-header px-6 py-5 flex items-center justify-between gap-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hub-panel-header-icon">
              <activeMeta.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {activeMeta.label}
              </h2>
              <p className="text-sm text-muted-foreground truncate">{activeMeta.description}</p>
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground tabular-nums shrink-0">
            {counts[active]} {counts[active] === 1 ? 'elemento' : 'elementi'}
          </span>
        </div>

        <div className="hub-panel-body divide-y divide-border/50">
          {active === 'drafts' && (
            <>
              {draftVisible && hasDraft && composerDraft ? (
                <DraftListItem
                  draft={composerDraft.draft}
                  currentStep={composerDraft.currentStep}
                  updatedAt={composerDraft.updatedAt}
                  onRemoved={() => setDraftVisible(false)}
                />
              ) : (
                <EmptyPanel section="drafts" />
              )}
            </>
          )}

          {active === 'organizing' && (
            <>
              {upcomingCreated.length > 0 ? (
                upcomingCreated.map((trip) => (
                  <TripListItem key={trip.id} trip={trip} variant="organizing" />
                ))
              ) : (
                <EmptyPanel section="organizing" />
              )}
            </>
          )}

          {active === 'relax' && (
            <>
              {upcomingJoined.length > 0 ? (
                upcomingJoined.map((trip) => (
                  <TripListItem key={trip.id} trip={trip} variant="relax" />
                ))
              ) : (
                <EmptyPanel section="relax" />
              )}
            </>
          )}

          {active === 'past' && (
            <>
              {pastTrips.length > 0 ? (
                pastTrips.map((trip) => (
                  <TripListItem key={trip.id} trip={trip} variant="past" />
                ))
              ) : (
                <EmptyPanel section="past" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}