import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { EditionHostCard } from '@/components/itineraries/EditionTrust';
import { ShareTripLink } from '@/components/itineraries/ShareTripLink';
import { getEditionByToken, getEditionHost } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { editionJoinReason } from '@/lib/itineraries/edition-present';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitoPage({ params }: PageProps) {
  const session = await auth();
  const { token } = await params;
  const edition = await getEditionByToken(token);
  if (!edition) notFound();
  if (!session?.user?.id) {
    redirect(`/?callbackUrl=/invito/${token}`);
  }
  const template = findItineraryTemplate(edition.template_id);
  const host = await getEditionHost(edition.id);
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nomadlink.it'}/invito/${token}`;

  return (
    <div className="nl-page w-full space-y-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Invito privato
      </p>
      <h1 className="font-display text-3xl font-semibold">
        {template?.destination_name ?? 'Viaggio con amici'}
      </h1>
      <p className="text-muted-foreground">
        {formatItDate(String(edition.date_from))} – {formatItDate(String(edition.date_to))}
      </p>
      <p className="text-sm text-muted-foreground">
        {editionJoinReason({
          confirmed_count: 0,
          min_confirmed: edition.min_confirmed,
        })}
      </p>
      <p className="text-sm text-muted-foreground">{COMPLIANCE_COPY.separateBooking}</p>
      {host ? <EditionHostCard host={host} /> : null}
      <ShareTripLink
        url={shareUrl}
        title={`Invito ${template?.destination_name ?? 'viaggio'}`}
        message="Unisciti al nostro viaggio — stesso piano, voli separati."
      />
      <JoinEditionButton editionId={edition.id} />
    </div>
  );
}
