'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bookmark,
  CalendarDays,
  Heart,
  Plane,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingRecap } from '@/components/itineraries/BookingRecap';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { itineraryPath } from '@/lib/itineraries/params';
import { hasFlightBooked } from '@/lib/itineraries/practice-lifecycle';
import type { HubPracticeCard } from '@/lib/itineraries/pratiche-hub-types';
import { cn } from '@/lib/utils';

export type { HubPracticeCard };

const MODE_LABEL = { solo: 'Da solo', friends: 'Con amici', group: 'In gruppo' } as const;

type SectionId = 'organized' | 'joined' | 'bookings' | 'saved';

const SECTIONS: {
  id: SectionId;
  label: string;
  description: string;
  icon: typeof Heart;
}[] = [
  {
    id: 'organized',
    label: 'Organizzati da me',
    description: 'Viaggi che hai creato',
    icon: CalendarDays,
  },
  {
    id: 'joined',
    label: 'A cui partecipo',
    description: 'Inviti e gruppi uniti',
    icon: Users,
  },
  {
    id: 'bookings',
    label: 'Prenotazioni',
    description: 'Voli e hotel pagati',
    icon: Plane,
  },
  {
    id: 'saved',
    label: 'Salvati',
    description: 'Itinerari da trasformare',
    icon: Bookmark,
  },
];

export function PraticheHub({
  practices,
  likedTemplateIds,
}: {
  practices: HubPracticeCard[];
  likedTemplateIds: string[];
}) {
  const activePractices = useMemo(
    () => practices.filter((p) => p.status !== 'cancelled'),
    [practices]
  );

  const liked = useMemo(
    () =>
      likedTemplateIds
        .map((id) => findItineraryTemplate(id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [likedTemplateIds]
  );

  const buckets = useMemo(() => {
    const organized: HubPracticeCard[] = [];
    const joined: HubPracticeCard[] = [];
    const bookings: HubPracticeCard[] = [];

    for (const p of activePractices) {
      if (p.organizedByMe === false) joined.push(p);
      else organized.push(p);
      if (hasFlightBooked(p) || (p.hotel_bookings?.length ?? 0) > 0) {
        bookings.push(p);
      }
    }

    return { organized, joined, bookings, saved: liked };
  }, [activePractices, liked]);

  const [active, setActive] = useState<SectionId>(() => {
    if (buckets.organized.length) return 'organized';
    if (buckets.joined.length) return 'joined';
    if (buckets.bookings.length) return 'bookings';
    return 'saved';
  });

  const counts = {
    organized: buckets.organized.length,
    joined: buckets.joined.length,
    bookings: buckets.bookings.length,
    saved: buckets.saved.length,
  };

  return (
    <div className="space-y-8" data-testid="pratiche-hub">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Account
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-foreground">I miei viaggi</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Organizzati da te, a cui partecipi, prenotazioni e salvati. Tocca un viaggio per aprire
          Itinerario, Voli, Hotel e Partecipanti.
        </p>
      </header>

      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        role="tablist"
        aria-label="Sezioni I miei viaggi"
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`pratiche-tab-${section.id}`}
              aria-controls={`pratiche-panel-${section.id}`}
              onClick={() => setActive(section.id)}
              data-testid={`pratiche-tab-${section.id}`}
              className={cn(
                'min-h-[5.5rem] rounded-2xl border p-4 text-left transition',
                isActive
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : 'border-border bg-white hover:border-accent/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon
                  className={cn('h-5 w-5', isActive ? 'text-accent' : 'text-muted-foreground')}
                  aria-hidden
                />
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {counts[section.id]}
                </span>
              </div>
              <p className="mt-3 font-display text-sm font-semibold text-foreground">
                {section.label}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {section.description}
              </p>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`pratiche-panel-${active}`}
        aria-labelledby={`pratiche-tab-${active}`}
        className="motion-safe:animate-[nl-landing-in_400ms_ease_forwards]"
      >
        {active === 'saved' ? (
          liked.length === 0 ? (
            <Empty
              title="Nessun itinerario salvato"
              body="Apri un piano di viaggio e tocca il cuore per ritrovarlo qui."
              ctaHref="/organizza"
              ctaLabel="Esplora itinerari"
            />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {liked.map((tpl, i) => (
                <li key={tpl.template_id}>
                  <div className="overflow-hidden rounded-[28px] border border-border bg-white shadow-sm">
                    <Link
                      href={itineraryPath(tpl.destination_slug, tpl.duration_days)}
                      className="block"
                    >
                      <div className="relative h-52">
                        <Image
                          src={uniqueCover(tpl.destination_slug, i)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="50vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                        <p className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                          <Heart className="h-3 w-3 fill-accent text-accent" aria-hidden /> Salvato
                        </p>
                        <div className="absolute bottom-4 left-4 right-4">
                          <p className="line-clamp-2 font-display text-2xl font-semibold text-white">
                            {tpl.destination_name} · {tpl.duration_days} giorni
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-white/80">{tpl.summary}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="border-t border-border p-3">
                      <Button asChild className="min-h-11 w-full rounded-full" variant="cta">
                        <Link href={`/organizza?slug=${encodeURIComponent(tpl.destination_slug)}`}>
                          Trasforma in viaggio
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <PracticeGrid
            items={buckets[active]}
            empty={active}
            showBookingStatus={active === 'organized'}
          />
        )}
      </div>
    </div>
  );
}

function PracticeGrid({
  items,
  empty,
  showBookingStatus,
}: {
  items: HubPracticeCard[];
  empty: Exclude<SectionId, 'saved'>;
  showBookingStatus?: boolean;
}) {
  if (items.length === 0) {
    const copy: Record<
      Exclude<SectionId, 'saved'>,
      { title: string; body: string; href: string; label: string }
    > = {
      organized: {
        title: 'Nessun viaggio organizzato',
        body: 'Crea un viaggio da Organizza: comparirà qui con lo stato delle prenotazioni.',
        href: '/organizza',
        label: 'Organizza un viaggio',
      },
      joined: {
        title: 'Nessun viaggio a cui partecipi',
        body: 'Quando accetti un invito o entri in un gruppo, il viaggio compare qui.',
        href: '/gruppi',
        label: 'Scopri le partenze',
      },
      bookings: {
        title: 'Nessuna prenotazione',
        body: 'I voli e hotel che hai pagato restano raccolti in questa sezione.',
        href: '/organizza',
        label: 'Organizza un viaggio',
      },
    };
    const c = copy[empty];
    return <Empty title={c.title} body={c.body} ctaHref={c.href} ctaLabel={c.label} />;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {items.map((p, i) => {
        const tpl = findItineraryTemplate(p.template_id);
        const booked = hasFlightBooked(p);
        const title =
          p.hubTitle?.trim() ||
          tpl?.destination_name ||
          p.destination_label ||
          'Il tuo viaggio';
        const seatLabel =
          showBookingStatus &&
          p.totalSeats != null &&
          p.totalSeats > 0 &&
          p.bookedSeats != null
            ? `${p.bookedSeats} su ${p.totalSeats} prenotati`
            : null;
        return (
          <li key={p.id}>
            <Link
              href={`/pratica/${p.id}`}
              className="block overflow-hidden rounded-[28px] border border-border bg-white shadow-sm transition hover:border-accent/40"
              data-testid={`pratiche-card-${p.id}`}
            >
              <div className="relative h-52">
                <Image
                  src={uniqueCover(
                    tpl?.destination_slug ?? p.destination_label ?? p.template_id ?? 'viaggio',
                    i
                  )}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                  {seatLabel ?? (booked ? 'Prenotato' : MODE_LABEL[p.mode])}
                </p>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="line-clamp-2 font-display text-xl font-semibold text-white sm:text-2xl">
                    {title}
                    {tpl ? ` · ${tpl.duration_days} giorni` : ''}
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    {formatItDate(p.date_from)} – {formatItDate(p.date_to)}
                  </p>
                  {booked ? (
                    <div className="mt-2">
                      <BookingRecap practice={p} compact />
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-white/70">
                      Apri Voli per vedere le tratte salvate
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({
  title,
  body,
  ctaHref = '/organizza',
  ctaLabel = 'Organizza un viaggio',
}: {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-6 min-h-11 rounded-full">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
