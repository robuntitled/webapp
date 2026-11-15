import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizzaFlow } from '@/components/itineraries/OrganizzaFlow';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';
import { listJoinableEditions } from '@/lib/data/editions';
import { editionDestinationSlug } from '@/lib/itineraries/public-destinations';
import { pageOpenGraph } from '@/lib/brand/seo';

export const dynamic = 'force-dynamic';

const ORG_TITLE = 'Organizza il tuo viaggio fai da te — Noivia';
const ORG_DESCRIPTION =
  'Scegli meta, date e con chi partire. Parti da un itinerario pronto, scegli i voli e controlla il riepilogo prima di creare il viaggio.';

export const metadata: Metadata = {
  title: { absolute: ORG_TITLE },
  description: ORG_DESCRIPTION,
  alternates: { canonical: '/organizza' },
  openGraph: pageOpenGraph('/organizza', ORG_TITLE, ORG_DESCRIPTION),
};

export default async function OrganizzaPage() {
  const destinations = wizardDestinationCards();
  let groupEditionCountBySlug: Record<string, number> = {};
  try {
    const editions = await listJoinableEditions();
    for (const ed of editions) {
      const slug = editionDestinationSlug({
        ...ed,
        confirmed_count: ed.confirmed_count ?? 0,
        interested_count: ed.interested_count ?? 0,
      });
      if (!slug) continue;
      groupEditionCountBySlug[slug] = (groupEditionCountBySlug[slug] ?? 0) + 1;
    }
  } catch {
    groupEditionCountBySlug = {};
  }

  return (
    <Suspense
      fallback={
        <div
          className="min-h-[calc(100vh-4rem)] w-full bg-[var(--color-tint)]/50"
          aria-busy="true"
          aria-label="Caricamento Organizza"
        >
          <div className="nl-page space-y-5 pt-6 sm:pt-8">
            <div className="h-8 w-56 animate-pulse rounded-lg bg-white/70" />
            <div className="h-4 w-72 animate-pulse rounded bg-white/50" />
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-11 flex-1 animate-pulse rounded-2xl bg-white/70"
                />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-2xl bg-white/80" />
          </div>
        </div>
      }
    >
      <OrganizzaFlow
        destinations={destinations}
        groupEditionCountBySlug={groupEditionCountBySlug}
      />
    </Suspense>
  );
}
