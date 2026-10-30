import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProssimoPasso } from '@/components/itineraries/ProssimoPasso';
import { getPractice } from '@/lib/data/practices';
import { getEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProssimoPassoPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const practice = await getPractice(id, session.user.id);
  if (!practice) notFound();
  const template = findItineraryTemplate(practice.template_id);
  if (!template) notFound();
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;

  const inviteToken = edition?.invite_token ?? null;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it').replace(/\/$/, '');
  const inviteUrl = inviteToken ? `${appUrl}/invito/${inviteToken}` : null;

  return (
    <ProssimoPasso
      practiceId={practice.id}
      destinationName={template.destination_name}
      tripTitle={edition?.title ?? null}
      dateFrom={String(practice.date_from).slice(0, 10)}
      dateTo={String(practice.date_to).slice(0, 10)}
      mode={practice.mode}
      editionType={edition?.edition_type ?? null}
      inviteUrl={inviteUrl}
      isPrivate={edition?.edition_type === 'private' || practice.mode !== 'group'}
    />
  );
}
