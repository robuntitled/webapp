import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import {
  PracticeChatCta,
  PracticeEditionMembers,
} from '@/components/itineraries/PracticeEditionPanel';
import { PracticeBookingHub } from '@/components/itineraries/PracticeBookingHub';
import { getPractice } from '@/lib/data/practices';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { isEditionChatUnlocked } from '@/lib/data/trip-chat';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import {
  getPracticeLifecyclePhase,
  LIFECYCLE_COPY,
} from '@/lib/itineraries/practice-lifecycle';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
};

const MODE_LABEL = { solo: 'Da solo', friends: 'Con amici', group: 'In gruppo' } as const;

export default async function PraticaPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const { step } = await searchParams;
  const practice = await getPractice(id, session.user.id);
  if (!practice) notFound();
  const template = findItineraryTemplate(practice.template_id);
  if (!template) notFound();
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;
  const members = practice.edition_id ? await listEditionMembers(practice.edition_id) : [];
  const chatUnlocked = practice.edition_id
    ? await isEditionChatUnlocked(practice.edition_id)
    : false;
  const phase = getPracticeLifecyclePhase(practice);
  const phaseCopy = LIFECYCLE_COPY[phase];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-6 py-10">
        <Link
          href="/pratiche"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          I miei viaggi
        </Link>
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {MODE_LABEL[practice.mode]} · {phaseCopy.badge}
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
            {template.destination_name} · {template.duration_days} giorni
          </h1>
          <p className="text-muted-foreground">
            {formatItDate(practice.date_from)} – {formatItDate(practice.date_to)}
          </p>
          <p className="text-sm text-muted-foreground">
            {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.budgetLabel}: stima, non prezzo del
            viaggio.
          </p>
        </header>
        {edition?.invite_token ? (
          <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">
            Invito amici:{' '}
            <Link href={`/invito/${edition.invite_token}`} className="font-semibold underline">
              /invito/{edition.invite_token}
            </Link>
          </p>
        ) : null}
        {practice.edition_id ? (
          <>
            <PracticeEditionMembers members={members} />
            <PracticeChatCta
              editionId={practice.edition_id}
              chatUnlocked={chatUnlocked}
            />
          </>
        ) : null}
        <PracticeBookingHub practice={practice} template={template} initialStep={step} />
      </div>
    </div>
  );
}
