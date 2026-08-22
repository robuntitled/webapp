import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { StartPracticeForm } from '@/components/itineraries/StartPracticeForm';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; mode?: string }>;
};

export default async function PartirePage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { slug } = await params;
  const { d, mode } = await searchParams;
  const template = findItineraryBySlug(slug, parseDurationParam(d));
  if (!template) notFound();

  if (mode === 'group') {
    redirect(`/itinerario/${slug}/partenze?d=${template.duration_days}`);
  }
  const travelMode = mode === 'friends' ? 'friends' : 'solo';
  if (!session?.user?.id) {
    redirect(`/?callbackUrl=/itinerario/${slug}/partire?d=${template.duration_days}&mode=${travelMode}`);
  }

  return (
    <div className="container mx-auto max-w-lg space-y-6 px-4 py-10">
      <Button asChild variant="ghost" className="-ml-2">
        <Link href={`/itinerario/${slug}?d=${template.duration_days}#partire`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Come vuoi partire
        </Link>
      </Button>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          {travelMode === 'friends' ? 'Con amici' : 'Da solo'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {template.destination_name} · {template.duration_days} giorni
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {travelMode === 'friends'
            ? 'Date condivise. Invito privato. Niente edizione pubblica con date libere.'
            : 'Scegli tu le date. La pratica è tua.'}{' '}
          {COMPLIANCE_COPY.separateBooking}
        </p>
      </header>
      <StartPracticeForm
        templateId={template.template_id}
        mode={travelMode}
        durationDays={template.duration_days}
      />
    </div>
  );
}
