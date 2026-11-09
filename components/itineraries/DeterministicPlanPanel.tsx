'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { planDestination } from '@/lib/itineraries/deterministic-planner/plan-destination';
import { AllegatoBLinkedNotice } from '@/components/legal/AllegatoBLinkedNotice';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { formatEuro } from '@/lib/format/euro';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { cn } from '@/lib/utils';

const ReactLeafletTripMap = dynamic(
  () => import('@/components/maps/ReactLeafletTripMap').then((m) => m.ReactLeafletTripMap),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-slate-100" /> }
);

export type DeterministicPlanPanelProps = {
  destinationSlug: string;
  tripDays: number;
  vibe?: string | null;
  travelMonth?: number | null;
  arrivalIata?: string | null;
  departureIata?: string | null;
  showLegalDraft?: boolean;
  /** Hide budget block when parent already shows the same orientative total. */
  hideBudget?: boolean;
  className?: string;
};

export function DeterministicPlanPanel({
  destinationSlug,
  tripDays,
  vibe,
  travelMonth,
  arrivalIata,
  departureIata,
  showLegalDraft = false,
  hideBudget = false,
  className,
}: DeterministicPlanPanelProps) {
  const [fontiOpen, setFontiOpen] = useState(false);
  const plan = useMemo(
    () =>
      planDestination({
        destinationSlug,
        tripDays,
        vibe,
        travelMonth,
        arrivalIata,
        departureIata,
      }),
    [destinationSlug, tripDays, vibe, travelMonth, arrivalIata, departureIata]
  );

  if (!plan.ok) {
    return (
      <section
        className={cn(
          'space-y-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4',
          className
        )}
        data-plan-panel="error"
      >
        <p className="text-sm font-bold text-amber-950">Piano non disponibile</p>
        <p className="text-sm text-amber-900/90">{plan.message}</p>
      </section>
    );
  }

  const mapPins = plan.days
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => ({
      id: `day-${d.dayNumber}`,
      blockId: `day-${d.dayNumber}`,
      lat: d.lat!,
      lng: d.lng!,
      label: `${d.title} · ${d.area}`,
      dayIndex: d.dayNumber,
      blockType: 'attraction',
      emoji: String(d.dayNumber),
    }));
  const center = mapPins[0] ?? { lat: plan.days[0]?.lat ?? 0, lng: plan.days[0]?.lng ?? 0 };

  const gapLines = [
    ...plan.gaps.transfers,
    ...plan.gaps.activities,
    ...plan.gaps.other,
  ];

  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5',
        // Keep content clear of cookie banner + chat FAB on mobile
        'mb-[max(1rem,var(--cookie-banner-pad,0px))]',
        className
      )}
      data-plan-panel={plan.quality}
    >
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          {plan.quality === 'curated' ? 'Itinerario curato' : 'Schema orientativo'}
        </p>
        <h3 className="font-display text-lg font-extrabold text-[var(--color-text)]">
          {plan.destinationName} · {tripDurationLabelIt(plan.durationDays)}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{plan.summary}</p>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          {plan.disclaimer}
        </p>
      </header>

      {mapPins.length >= 1 && center.lat !== 0 ? (
        <div className="h-52 overflow-hidden rounded-xl border border-[var(--color-border)] sm:h-64">
          <ReactLeafletTripMap
            destination={plan.destinationName}
            destinationMeta={{
              label: plan.destinationName,
              lat: center.lat,
              lng: center.lng,
            }}
            pins={mapPins}
            showRoute
            interactive={false}
            className="h-full w-full"
          />
        </div>
      ) : null}

      {!hideBudget && plan.budgetTotalHint != null && plan.budgetTotalHint > 0 ? (
        <div className="rounded-xl bg-[var(--color-tint)]/60 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {COMPLIANCE_COPY.budgetLabel}
          </p>
          <p className="mt-1 text-base font-extrabold text-[var(--color-text)]">
            {formatEuro(plan.budgetTotalHint, { approx: false })}{' '}
            <span className="text-sm font-semibold">a persona · stima</span>
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
              {' '}
              · {tripDurationLabelIt(plan.durationDays)}
            </span>
          </p>
        </div>
      ) : null}
      {!hideBudget && !(plan.budgetTotalHint != null && plan.budgetTotalHint > 0) ? (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Budget: stimalo con la ricerca voli e hotel — qui non inventiamo un totale.
        </p>
      ) : null}

      {gapLines.length > 0 ? (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-amber-950">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Da verificare prima di prenotare
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-amber-950/90">
            {gapLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <MapPin className="h-4 w-4 text-primary" />
          Giorno per giorno
        </p>
        <ol className="space-y-2">
          {plan.days.map((d) => (
            <li
              key={d.dayNumber}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Giorno {d.dayNumber}: {d.title}
                </p>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  {d.area}
                  {d.transferLabel ? ` · ${d.transferLabel}` : ''}
                </p>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{d.description}</p>
              {d.activities.length ? (
                <ul className="mt-2 space-y-0.5">
                  {d.activities.map((a) => (
                    <li key={`${d.dayNumber}-${a}`} className="text-xs text-[var(--color-text)]">
                      {a}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-[var(--color-border)]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm font-bold text-[var(--color-text)]"
          aria-expanded={fontiOpen}
          onClick={() => setFontiOpen((v) => !v)}
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            Fonti
          </span>
          {fontiOpen ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-text-secondary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)]" />
          )}
        </button>
        {fontiOpen ? (
          <ul className="space-y-2 border-t border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-text-secondary)]">
            {plan.attributions.map((a) => (
              <li key={`${a.sourceUrl}-${a.claimIt}`} className="leading-relaxed">
                <span className="font-semibold text-[var(--color-text)]">{a.attribution}</span>
                {' — '}
                {a.claimIt}{' '}
                <a
                  href={a.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  fonte
                </a>
                <span>
                  {' '}
                  · verificata {a.retrievedOn}
                </span>
              </li>
            ))}
            <li className="pt-1 text-[11px] text-[var(--color-text-secondary)]">
              Dati mappa: licenza ODbL OpenStreetMap. Nessuna copia di itinerari protetti da
              copyright.
            </li>
          </ul>
        ) : (
          <p className="border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
            Attributioni OSM/ODbL e fonti ufficiali (tocca Fonti per i dettagli).
          </p>
        )}
      </div>

      {plan.logisticsNotes ? (
        <p className="text-xs text-[var(--color-text-secondary)]">{plan.logisticsNotes}</p>
      ) : null}

      {showLegalDraft ? <AllegatoBLinkedNotice /> : null}
    </section>
  );
}
