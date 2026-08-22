import { notFound, redirect } from 'next/navigation';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

export default async function PartireRedirectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const template = findItineraryBySlug(slug, parseDurationParam(d));
  if (!template) notFound();
  redirect(`/itinerario/${slug}?d=${template.duration_days}`);
}
