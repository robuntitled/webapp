import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizzaFlow } from '@/components/itineraries/OrganizzaFlow';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';
import { pageOpenGraph } from '@/lib/brand/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organizza',
  description:
    'Organizza il viaggio: destinazione e date libere, voli consigliati, riepilogo compatto.',
  alternates: { canonical: '/organizza' },
  openGraph: pageOpenGraph(
    '/organizza',
    'Organizza',
    'Destinazione e date, voli consigliati, itinerario e budget in un riepilogo chiaro.'
  ),
};

export default async function OrganizzaPage() {
  const destinations = wizardDestinationCards();
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] w-full bg-[var(--color-tint)]/30" aria-busy="true" />
      }
    >
      <OrganizzaFlow destinations={destinations} />
    </Suspense>
  );
}
