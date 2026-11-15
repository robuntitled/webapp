import type { Metadata } from 'next';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaFlightsClient } from '@/components/travel/PrenotaFlightsClient';
import { pageOpenGraph } from '@/lib/brand/seo';

const DESCRIPTION =
  'Cerca e confronta voli senza account. Accedi solo quando salvi il viaggio o prenoti.';

export const metadata: Metadata = {
  title: { absolute: 'Voli — Noivia' },
  description: DESCRIPTION,
  alternates: { canonical: '/prenota/voli' },
  robots: { index: false, follow: false },
  openGraph: pageOpenGraph('/prenota/voli', 'Voli — Noivia', DESCRIPTION),
};

export default function PrenotaVoliPage() {
  return (
    <PrenotaPageShell
      title="Voli"
      subtitle="Cerca e confronta senza account. Accedi solo quando salvi il viaggio o prenoti."
    >
      <PrenotaFlightsClient />
    </PrenotaPageShell>
  );
}
