import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { EditionHostCard } from '@/components/itineraries/EditionTrust';
import { ShareTripLink } from '@/components/itineraries/ShareTripLink';
import { Button } from '@/components/ui/button';
import { getEditionByToken, getEditionHost } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { editionJoinReason } from '@/lib/itineraries/edition-present';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { accediHref } from '@/lib/auth/callback-url';
import { getSiteUrl } from '@/lib/brand';

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const edition = await getEditionByToken(token);
  if (!edition) return { title: 'Invito' };
  const template = findItineraryTemplate(edition.template_id);
  const name = template?.destination_name ?? 'viaggio con amici';
  return {
    title: `Invito — ${name}`,
    description: `Unisciti al viaggio: ${formatItDate(String(edition.date_from))} – ${formatItDate(String(edition.date_to))}.`,
    robots: { index: false, follow: false },
  };
}

export default async function InvitoPage({ params }: PageProps) {
  const session = await auth();
  const { token } = await params;
  const edition = await getEditionByToken(token);
  if (!edition) notFound();
  const template = findItineraryTemplate(edition.template_id);
  const host = await getEditionHost(edition.id);
  const shareUrl = `${getSiteUrl()}/invito/${token}`;
  const invitePath = `/invito/${token}`;
  const isLoggedIn = Boolean(session?.user?.id);
  const destination = template?.destination_name ?? 'Viaggio con amici';

  return (
    <div className="nl-page w-full space-y-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Invito privato
      </p>
      <h1 className="font-display text-3xl font-semibold">{destination}</h1>
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
        title={`Invito ${destination}`}
        message="Unisciti al nostro viaggio — stesso piano, voli separati."
      />
      {isLoggedIn ? (
        <JoinEditionButton editionId={edition.id} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
          <p className="text-sm text-stone-700">
            Accedi o registrati per unirti a questo viaggio. Tornerai qui dopo l’accesso.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={accediHref(invitePath, 'register')}>Unisciti — crea account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={accediHref(invitePath)}>Ho già un account</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
