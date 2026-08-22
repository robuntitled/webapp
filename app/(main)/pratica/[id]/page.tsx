import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { SlideshowWash } from '@/components/brand/SlideshowWash';
import { PracticeBookingHub } from '@/components/itineraries/PracticeBookingHub';
import { getPractice } from '@/lib/data/practices';
import { getEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ id: string }>;
};

const MODE_LABEL = { solo: 'Da solo', friends: 'Con amici', group: 'In gruppo' } as const;

export default async function PraticaPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const practice = await getPractice(id, session.user.id);
  if (!practice) notFound();
  const template = findItineraryTemplate(practice.template_id);
  if (!template) notFound();
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <SlideshowWash />
      <div className="relative z-10 container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Link
          href="/pratiche"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          I miei viaggi
        </Link>
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {MODE_LABEL[practice.mode]} · {practice.status}
          </p>
          <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">
            {template.destination_name} · {template.duration_days} giorni
          </h1>
          <p className="text-white/70">
            {formatItDate(practice.date_from)} – {formatItDate(practice.date_to)}
          </p>
          <p className="text-sm text-white/55">
            {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.budgetLabel}: stima, non prezzo del
            viaggio.
          </p>
        </header>
        {edition?.invite_token ? (
          <p className="rounded-2xl bg-[#161d2b] p-4 text-sm text-white/80">
            Invito amici:{' '}
            <Link href={`/invito/${edition.invite_token}`} className="font-semibold underline">
              /invito/{edition.invite_token}
            </Link>
          </p>
        ) : null}
        <PracticeBookingHub practice={practice} template={template} />
      </div>
    </div>
  );
}
