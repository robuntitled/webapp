import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BedDouble, CalendarDays, Ticket, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { itineraryPath } from '@/lib/itineraries/params';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { ItineraryDaysWithMap } from '@/components/itineraries/ItineraryWorldMap';
import { cn } from '@/lib/utils';

function eur(n: number) {
  return `~${n.toLocaleString('it-IT')} €`;
}

export function ItineraryView({
  template,
  durations,
}: {
  template: ItineraryTemplate;
  durations: number[];
}) {
  const cover = coverForDestination(template.destination_slug);
  const slug = template.destination_slug;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[34vh] min-h-[240px] max-h-[340px] w-full">
        <Image src={cover} alt={template.destination_name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/20" />
        <div className="absolute top-20 left-0 right-0 mx-auto w-full max-w-4xl px-4">
          <Button
            asChild
            variant="ghost"
            className="rounded-full text-white/90 hover:bg-white/10 hover:text-white"
          >
            <Link href="/destinazioni">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Itinerari
            </Link>
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-4xl px-4 pb-6">
          <Badge className="mb-2 border-white/20 bg-white/15 text-white backdrop-blur-sm">
            Piano di riferimento · {template.duration_days} giorni
          </Badge>
          <h1 className="font-display text-3xl font-semibold text-white drop-shadow sm:text-4xl">
            {template.destination_name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{template.summary}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Durata</span>
          {durations.map((d) => (
            <Link
              key={d}
              href={itineraryPath(slug, d)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                d === template.duration_days
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              )}
            >
              {d} giorni
            </Link>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              {COMPLIANCE_COPY.budgetLabel}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <Wallet className="h-5 w-5 text-accent" />
              <p className="font-display text-2xl font-semibold">{eur(template.budget_orientative_eur.total_hint)}</p>
              <p className="text-sm text-muted-foreground">a persona, stima</p>
            </div>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li>Voli {eur(template.budget_orientative_eur.flights_hint)}</li>
              <li>Hotel {eur(template.budget_orientative_eur.hotel_hint)}</li>
              <li>Attività {eur(template.budget_orientative_eur.activities_hint)}</li>
              <li>Cibo {eur(template.budget_orientative_eur.food_hint)}</li>
            </ul>
            <p className="text-sm text-muted-foreground">{COMPLIANCE_COPY.budgetClarifier}</p>
            <p className="text-sm text-muted-foreground">
              {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
            </p>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Giorno per giorno</h2>
          <ItineraryDaysWithMap template={template} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <p className="flex items-center gap-2 font-semibold">
                <BedDouble className="h-4 w-4 text-accent" />
                Hotel suggeriti
              </p>
              <p className="text-sm text-muted-foreground">
                Stessa zona, camera propria. Ognuno prenota il proprio alloggio.
              </p>
              <ul className="space-y-2 text-sm">
                {template.hotels.map((h) => (
                  <li key={h.area_segment}>
                    <span className="font-medium">{h.area_segment}</span>
                    {' · '}
                    {h.name_or_zone}
                    <span className="block text-muted-foreground">{h.notes}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <p className="flex items-center gap-2 font-semibold">
                <Ticket className="h-4 w-4 text-accent" />
                Attività a pagamento
              </p>
              <ul className="space-y-2 text-sm">
                {template.paid_activities.map((a) => (
                  <li key={`${a.day_number}-${a.title}`}>
                    <span className="font-medium">Giorno {a.day_number}</span>
                    {' · '}
                    {a.title}
                    <span className="block text-muted-foreground">{a.hint}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {template.logistics_notes ? (
          <p className="text-sm text-muted-foreground">{template.logistics_notes}</p>
        ) : null}

        <section id="partire" className="rounded-[10px] border border-border bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Come vuoi partire
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Tre modi. Stesso piano.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            L’itinerario è fisso. Cambiano solo date e compagni. Niente checkout unico.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ModeCard
              href={`/itinerario/${slug}/partire?d=${template.duration_days}&mode=solo`}
              title="Da solo"
              body="Scegli le tue date. Pratica privata."
            />
            <ModeCard
              href={`/itinerario/${slug}/partire?d=${template.duration_days}&mode=friends`}
              title="Con amici"
              body="Stesse date, edizione privata + invito."
            />
            <ModeCard
              href={`/itinerario/${slug}/partenze?d=${template.duration_days}`}
              title="In gruppo"
              body="Solo partenze ufficiali già aperte."
              icon={<CalendarDays className="h-4 w-4" />}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ModeCard({
  href,
  title,
  body,
  icon,
}: {
  href: string;
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-[10px] border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:bg-muted"
    >
      <p className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
