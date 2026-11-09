'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, BookOpen, Info, MapPin } from 'lucide-react';
import { buildThailandPilotPlan } from '@/lib/itineraries/thailand-pilot/ui-plan';
import { AllegatoBLinkedNotice } from '@/components/legal/AllegatoBLinkedNotice';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { formatEuro } from '@/lib/format/euro';
import { cn } from '@/lib/utils';

const ReactLeafletTripMap = dynamic(
  () => import('@/components/maps/ReactLeafletTripMap').then((m) => m.ReactLeafletTripMap),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse rounded-xl bg-slate-100" /> }
);

export type ThailandPilotPlanPanelProps = {
  destinationSlug: string;
  tripDays: number;
  vibe?: string | null;
  travelMonth?: number | null;
  arrivalIata?: string | null;
  departureIata?: string | null;
  /** Show Allegato B BOZZA notice (riepilogo / pre-create). */
  showLegalDraft?: boolean;
  className?: string;
};

function warningTone(code: string): string {
  if (code === 'budget_orientative_only') return 'border-sky-200 bg-sky-50 text-sky-950';
  if (code === 'seasonality_hint_only') return 'border-amber-200 bg-amber-50 text-amber-950';
  return 'border-amber-300 bg-amber-50 text-amber-950';
}

export { buildThailandPilotPlan };

/**
 * Piano Thailandia deterministico: percorso giorno per giorno, fonti e incertezze.
 * Disponibilità e prezzi da verificare; non è fattibilità garantita.
 */
export function ThailandPilotPlanPanel({
  destinationSlug,
  tripDays,
  vibe,
  travelMonth,
  arrivalIata,
  departureIata,
  showLegalDraft = false,
  className,
}: ThailandPilotPlanPanelProps) {
  const plan = useMemo(
    () =>
      buildThailandPilotPlan({
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
          'space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4',
          className
        )}
        data-thailand-pilot="unsupported"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-950">Piano deterministico non disponibile</p>
            <p className="mt-1 text-sm text-amber-900/90">{plan.message}</p>
            <p className="mt-2 text-xs text-amber-800/80">
              Restano gli itinerari curati in catalogo dove presenti; nessuna destinazione inventata.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const mapPins = plan.days
    .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map((d) => ({
      id: `day-${d.day_number}`,
      blockId: `day-${d.day_number}`,
      lat: d.lat!,
      lng: d.lng!,
      label: `${d.title} · ${d.area_segment}`,
      dayIndex: d.day_number,
      blockType: 'attraction',
      emoji: String(d.day_number),
    }));

  const center = mapPins[0] ?? { lat: 13.7563, lng: 100.5018 };

  return (
    <section
      className={cn('space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5', className)}
      data-thailand-pilot="ok"
    >
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          Piano Thailandia (pilot)
        </p>
        <h3 className="font-display text-lg font-extrabold text-[var(--color-text)]">
          Percorso su {plan.durationDays} giorni
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{plan.summary}</p>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Output di pianificazione da template curati + vincoli (date, ritmo, hub). Disponibilità
          e prezzi da verificare; non è una fattibilità garantita di voli o traghetti. Prenotazioni
          restano servizi separati a mercato.
        </p>
      </header>

      {mapPins.length >= 1 ? (
        <div className="h-52 overflow-hidden rounded-xl border border-[var(--color-border)] sm:h-64">
          <ReactLeafletTripMap
            destination="Thailandia"
            destinationMeta={{ label: 'Thailandia', lat: center.lat, lng: center.lng }}
            pins={mapPins}
            showRoute
            interactive={false}
            className="h-full w-full"
          />
        </div>
      ) : null}

      <div className="rounded-xl bg-[var(--color-tint)]/60 px-3 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          {COMPLIANCE_COPY.budgetLabel}
        </p>
        <p className="mt-1 text-base font-extrabold text-[var(--color-text)]">
          {formatEuro(plan.budgetOrientativeEur.total_hint, { approx: false })}{' '}
          <span className="text-sm font-semibold">a persona · stima</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          Orientativo del template — non un prezzo del viaggio né un pacchetto pagabile.
        </p>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Avvisi e incertezze
        </p>
        <ul className="space-y-2">
          {plan.warnings.map((w, i) => (
            <li
              key={`${w.code}-${w.dayNumber ?? 'x'}-${i}`}
              className={cn('rounded-xl border px-3 py-2 text-xs leading-relaxed', warningTone(w.code))}
            >
              <span className="font-semibold uppercase tracking-wide opacity-80">{w.code}</span>
              <p className="mt-0.5">{w.message}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <MapPin className="h-4 w-4 text-primary" />
          Giorno per giorno
        </p>
        <ol className="space-y-2">
          {plan.days.map((d) => (
            <li
              key={d.day_number}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Giorno {d.day_number}: {d.title}
                </p>
                <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  {d.area_segment}
                  {d.transfer && d.transfer !== 'none' ? ` · ${d.transfer}` : ''}
                </p>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{d.description}</p>
              {d.pois.length ? (
                <ul className="mt-2 space-y-1">
                  {d.pois.map((p) => (
                    <li key={`${d.day_number}-${p.name}`} className="text-xs text-[var(--color-text)]">
                      <span className="font-semibold">{p.name}</span>
                      {p.unknown ? (
                        <span className="ml-1 text-amber-700">(fonte non verificata in pilot)</span>
                      ) : p.provenance ? (
                        <span className="ml-1 text-[var(--color-text-secondary)]">
                          · {p.provenance.attribution}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!d.transferTimingVerified ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
                  <Info className="h-3 w-3" />
                  Timing trasferimento non verificato
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <BookOpen className="h-4 w-4 text-primary" />
          Fonti e attribuzioni
        </p>
        <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
          {plan.attributions.map((a) => (
            <li key={a.id} className="rounded-lg bg-[var(--color-tint)]/50 px-2.5 py-1.5">
              <span className="font-semibold text-[var(--color-text)]">{a.attribution}</span>
              {' — '}
              {a.claim}{' '}
              <a
                href={a.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                fonte
              </a>
              <span className="text-[var(--color-text-secondary)]">
                {' '}
                · verificata {a.retrievedOn}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[var(--color-text-secondary)]">
          Dettaglio licenze nel repo: <code>docs/THAILAND-ITINERARY-PROVENANCE.md</code>.
          Wikivoyage non ingestato in questo pilot.
        </p>
      </div>

      {plan.logisticsNotes ? (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Note logistiche (template): {plan.logisticsNotes}
        </p>
      ) : null}

      {showLegalDraft ? <AllegatoBLinkedNotice /> : null}
    </section>
  );
}
