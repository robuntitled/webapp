'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Compass, Link2, Users } from 'lucide-react';
import {
  CatalogHeroSearchBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { OfficialEditionsGrid } from '@/components/itineraries/OfficialEditionsGrid';
import { JoinTripLinkDialog } from '@/components/itineraries/JoinTripLinkDialog';
import { Button } from '@/components/ui/button';
import type { OfficialEditionCard } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

const HOW = [
  {
    n: 1,
    title: 'Scegli una partenza',
    body: 'Date, itinerario e budget orientativo sono già decisi.',
  },
  {
    n: 2,
    title: 'Unisciti e conosci il gruppo',
    body: 'Entra in chat e vedi chi parte con te.',
  },
  {
    n: 3,
    title: 'Prenota il tuo volo',
    body: 'Il gruppo parte quando si raggiunge la soglia di voli confermati.',
  },
] as const;

export function GruppiHub({ editions }: { editions: OfficialEditionCard[] }) {
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);

  const durationOptions = useMemo(() => {
    const days = editions.map((e) => {
      const m = e.template_id.match(/-(\d+)d(?:-|$)/i);
      return m ? Number(m[1]) : null;
    });
    return [...new Set(days.filter((d): d is number => d != null))].sort((a, b) => a - b);
  }, [editions]);

  const publicEditions = useMemo(
    () => editions.filter((e) => e.edition_type !== 'private'),
    [editions]
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="nl-page w-full space-y-8 pt-8 sm:pt-10">
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-4xl">
            Unisciti a un gruppo
          </h1>
          <p className="mt-2 text-base text-[var(--color-text-secondary)] sm:text-lg">
            Partenze già fissate da altri viaggiatori. Scegli le date, unisciti e prenota il tuo
            volo.
          </p>
        </header>

        <ol className="grid gap-3 sm:grid-cols-3">
          {HOW.map((step) => (
            <li
              key={step.n}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-tint)]/50 px-4 py-4"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {step.n}
              </span>
              <p className="mt-3 text-sm font-bold text-[var(--color-text)]">{step.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="max-w-xl">
          <CatalogHeroSearchBar
            value={filters}
            onChange={setFilters}
            placeholder="Cerca meta"
            resultsId="risultati-gruppi"
            durationOptions={durationOptions}
          />
        </div>

        <OfficialEditionsGrid
          editions={publicEditions}
          filters={filters}
          onFiltersChange={setFilters}
          showFiltersBar={false}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div
            className={cn(
              'flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-tint)]/40 p-5'
            )}
          >
            <Users className="h-6 w-6 text-primary" />
            <p className="font-bold text-[var(--color-text)]">Nuove partenze in arrivo</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Ti avvisiamo quando si apre un nuovo gruppo.
            </p>
            <Button type="button" variant="outline" className="mt-auto w-fit rounded-[10px]" disabled>
              Avvisami
            </Button>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-5">
            <Compass className="h-6 w-6 text-primary" />
            <p className="font-bold text-[var(--color-text)]">Non trovi le date giuste?</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Organizza il tuo viaggio e rendilo pubblico come gruppo.
            </p>
            {/* Unico coral della pagina Gruppi */}
            <Button
              asChild
              className="mt-auto w-fit rounded-[10px] bg-accent hover:bg-[var(--color-accent-hover)]"
            >
              <Link href="/organizza">Organizza</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-[var(--color-text)]">Hai un link di invito?</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Se un amico ti ha mandato un link a un viaggio privato, aprilo o incollalo nella barra
                indirizzi.
              </p>
            </div>
          </div>
          <JoinTripLinkDialog triggerLabel="Inserisci link" />
        </div>
      </div>
    </div>
  );
}
