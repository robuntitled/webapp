import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrganizzaWizard } from '@/components/itineraries/OrganizzaWizard';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';
import { BRAND_NAME } from '@/lib/brand/noivia';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organizza',
  description:
    'Organizza il tuo viaggio in pochi passi: meta, date e con chi. Privato da solo o con amici.',
  openGraph: {
    title: `Organizza — ${BRAND_NAME}`,
    description:
      'Stepper lineare: scegli meta, date e compagni. Il viaggio resta privato finché non lo rendi pubblico.',
  },
};

type PageProps = {
  searchParams: Promise<{ slug?: string; d?: string }>;
};

export default async function OrganizzaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const destinations = wizardDestinationCards();
  const initialDuration = params.d ? Number(params.d) : undefined;
  return (
    <Suspense fallback={null}>
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
