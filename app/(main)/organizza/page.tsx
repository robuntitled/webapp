import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizzaWizard } from '@/components/itineraries/OrganizzaWizard';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';
import { pageOpenGraph } from '@/lib/brand/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organizza',
  description:
    'Organizza il tuo viaggio in pochi passi: meta, date e con chi. Privato da solo o con amici.',
  alternates: { canonical: '/organizza' },
  openGraph: pageOpenGraph(
    '/organizza',
    'Organizza',
    'Scegli meta, date e con chi partire. Itinerario pronto da adattare, riepilogo chiaro prima di creare il viaggio.'
  ),
};

type PageProps = {
  searchParams: Promise<{ slug?: string; d?: string }>;
};

export default async function OrganizzaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const destinations = wizardDestinationCards();
  const initialDuration = params.d ? Number(params.d) : undefined;
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] w-full bg-[var(--color-tint)]/30" aria-busy="true" />
      }
    >
      <OrganizzaWizard
        destinations={destinations}
        initialSlug={params.slug}
        initialDuration={
          initialDuration && Number.isFinite(initialDuration) ? initialDuration : undefined
        }
      />
    </Suspense>
  );
}
