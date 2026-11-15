import type { Metadata } from 'next';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { pageOpenGraph } from '@/lib/brand/seo';

const DESCRIPTION =
  'Cerca e confronta hotel senza account. Accedi solo quando salvi il viaggio o prenoti.';

export const metadata: Metadata = {
  title: { absolute: 'Hotel — Noivia' },
  description: DESCRIPTION,
  alternates: { canonical: '/prenota/hotel' },
  robots: { index: false, follow: false },
  openGraph: pageOpenGraph('/prenota/hotel', 'Hotel — Noivia', DESCRIPTION),
};

export default function PrenotaHotelPage() {
  return (
    <PrenotaPageShell
      title="Hotel"
      subtitle="Cerca e confronta senza account. Accedi solo quando salvi il viaggio o prenoti."
    >
      <LiteApiHotelSearch defaultAdults={1} cacheKey="hotels" />
    </PrenotaPageShell>
  );
}
