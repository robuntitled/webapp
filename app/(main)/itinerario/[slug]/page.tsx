import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { d } = await searchParams;
  const duration = parseDurationParam(d);
  const template = findItineraryBySlug(slug, duration);
  if (!template) return { title: 'Itinerario' };
  const days = duration ?? template.duration_days;
  const title = `${template.destination_name} in ${days} giorni`;
  const description = `${template.summary?.slice(0, 140) || template.destination_name}. ${COMPLIANCE_COPY.budgetLabel}: stime, non un pacchetto.`;
  // Title senza brand (template root aggiunge "— Noivia"). No OG title a mano.
  return {
    title,
    description,
    openGraph: { description },
  };
}

/** Legacy deep-link → stepper Organizza. */
export default async function ItinerarioPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const duration = parseDurationParam(d);
  if (!findItineraryBySlug(slug, duration)) notFound();
  const q = new URLSearchParams({ slug });
  if (duration) q.set('d', String(duration));
  redirect(`/organizza?${q.toString()}`);
}
