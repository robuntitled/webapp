import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TripWorkspace } from '@/components/itineraries/workspace/TripWorkspace';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { findPracticeForEdition } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
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
  const title = `${destination} · ${range}`;
  const description = [
    `Gruppo in partenza per ${destination} (${range}).`,
    `${COMPLIANCE_COPY.budgetLabel}: stime, non un prezzo del gruppo.`,
    'Unisciti e prenota il tuo volo.',
  ].join(' ');

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
      backLabel="Torna a Unisciti"
      initialTab={tab}
      initialStay={stay}
    />
  );
}
