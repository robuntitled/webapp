import { notFound } from 'next/navigation';
import { ItineraryView } from '@/components/itineraries/ItineraryView';
import { findItineraryBySlug, templatesForDestination } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const template = findItineraryBySlug(slug, parseDurationParam(d));
  if (!template) return { title: 'Itinerario' };
  return { title: `${template.destination_name} ${template.duration_days} giorni` };
}

export default async function ItinerarioPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const template = findItineraryBySlug(slug, parseDurationParam(d));
  if (!template) notFound();
  const durations = templatesForDestination(slug).map((t) => t.duration_days);
  return <ItineraryView template={template} durations={durations} />;
}
