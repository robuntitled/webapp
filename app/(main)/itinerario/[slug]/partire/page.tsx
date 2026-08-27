import { notFound, redirect } from 'next/navigation';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; mode?: string }>;
};

export default async function PartireRedirectPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d, mode } = await searchParams;
  const template = findItineraryBySlug(slug, parseDurationParam(d));
  if (!template) notFound();
  const qs = new URLSearchParams({ d: String(template.duration_days) });
  if (mode === 'solo' || mode === 'friends' || mode === 'group') qs.set('mode', mode);
  redirect(`/itinerario/${slug}?${qs.toString()}`);
}
