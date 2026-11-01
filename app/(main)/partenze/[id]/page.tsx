import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TripWorkspace } from '@/components/itineraries/workspace/TripWorkspace';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { findPracticeForEdition } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; stay?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (id.startsWith('seed-')) {
    return { title: 'Gruppo' };
  }

  const edition = await getEdition(id);
  if (!edition || edition.edition_type === 'private') {
    return { title: 'Gruppo' };
  }

  const template = findItineraryTemplate(edition.template_id);
  const destination = template?.destination_name ?? 'Gruppo';
  const dateFrom = String(edition.date_from).slice(0, 10);
  const dateTo = String(edition.date_to).slice(0, 10);
  const range = formatEditionDateRange(dateFrom, dateTo);
  let tripDays: number | null = null;
  try {
    tripDays =
      differenceInCalendarDays(parseISO(dateTo), parseISO(dateFrom)) + 1;
    if (tripDays <= 0) tripDays = null;
  } catch {
    tripDays = template?.duration_days ?? null;
  }
  const title = `${destination} · ${range}`;
  const description = `Partenza di gruppo per ${destination}, ${range}${
    tripDays ? ` (${tripDays} giorni)` : ''
  }: itinerario giorno per giorno, iscritti e budget orientativo.`;

  const canonical = `${getSiteUrl()}/partenze/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: BRAND_NAME,
      type: 'website',
      locale: 'it_IT',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PartenzeJoinPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { id } = await params;
  const { tab, stay } = await searchParams;
  if (id.startsWith('seed-')) {
    redirect('/gruppi');
  }

  const edition = await getEdition(id);
  if (!edition) redirect('/gruppi');
  if (edition.status === 'closed' || edition.status === 'locked') {
    redirect('/gruppi');
  }

  const template = findItineraryTemplate(edition.template_id);
  if (!template) notFound();

  if (session?.user?.id) {
    const existing = await findPracticeForEdition(session.user.id, id);
    if (existing) {
      const qs = new URLSearchParams();
      if (tab) qs.set('tab', tab);
      if (stay) qs.set('stay', stay);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      redirect(`/pratica/${existing.id}${suffix}`);
    }
  }

  // Private = solo via /invito/[token]. Niente Partecipa pubblico su /partenze/[id].
  if (edition.edition_type === 'private') {
    redirect('/gruppi');
  }

  const members = await listEditionMembers(id, { withRatings: true });
  const dateFrom = String(edition.date_from).slice(0, 10);
  const dateTo = String(edition.date_to).slice(0, 10);

  return (
    <TripWorkspace
      template={template}
      dateFrom={dateFrom}
      dateTo={dateTo}
      editionId={edition.id}
      editionType={edition.edition_type}
      members={members}
      isMember={false}
      canJoin
      backHref="/gruppi"
      backLabel="Torna ai gruppi"
      initialTab={tab}
      initialStay={stay}
    />
  );
}
