import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizzaFlow } from '@/components/itineraries/OrganizzaFlow';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';
import { listJoinableEditions } from '@/lib/data/editions';
import { editionDestinationSlug } from '@/lib/itineraries/public-destinations';
import { pageOpenGraph } from '@/lib/brand/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organizza',
  description:
    'Organizza il viaggio: destinazione, date, compagnia, voli consigliati e riepilogo.',
  alternates: { canonical: '/organizza' },
  openGraph: pageOpenGraph(
    '/organizza',
    'Organizza',
    'Dove, quando, con chi — poi voli e un riepilogo chiaro.'
  ),
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
        <div className="min-h-[80vh] w-full bg-[var(--color-tint)]/30" aria-busy="true" />
      }
    >
      <OrganizzaFlow
        destinations={destinations}
        groupEditionCountBySlug={groupEditionCountBySlug}
      />
    </Suspense>
  );
}
