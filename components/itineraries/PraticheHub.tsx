'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  History,
  Plane,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingRecap } from '@/components/itineraries/BookingRecap';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { itineraryPath } from '@/lib/itineraries/params';
import type { PracticeRow } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

const MODE_LABEL = { solo: 'Da solo', friends: 'Con amici', group: 'In gruppo' } as const;

type SectionId = 'liked' | 'interested' | 'booked' | 'past';

function isPast(dateTo: string) {
  return new Date(`${dateTo}T23:59:59`) < new Date();
}

function isBooked(p: PracticeRow) {
  return Boolean(p.flight_confirmed_at || p.flight_booking);
}

const SECTIONS: {
  id: SectionId;
  label: string;
  description: string;
  icon: typeof Heart;
}[] = [
  {
    id: 'liked',
    label: 'Itinerari salvati',
    description: 'Piani che ti interessano',
    icon: Heart,
  },
  {
    id: 'interested',
    label: 'In valutazione',
    description: 'Partenze a cui ti sei aggiunto, volo non ancora prenotato',
    icon: Sparkles,
  },
  {
    id: 'booked',
    label: 'Prenotati',
    description: 'Volo confermato — hotel e attività nel recap',
    icon: Plane,
  },
  {
    id: 'past',
    label: 'Viaggi passati',
    description: 'Partenze già concluse',
    icon: History,
  },
];

export function PraticheHub({
  practices,
  likedTemplateIds,
}: {
  practices: PracticeRow[];
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
    const interested = activePractices.filter((p) => !isBooked(p) && !isPast(p.date_to));
    const booked = activePractices.filter((p) => isBooked(p) && !isPast(p.date_to));
    const past = activePractices.filter((p) => isBooked(p) && isPast(p.date_to));
    return { liked, interested, booked, past };
  }, [activePractices, liked]);

  const [active, setActive] = useState<SectionId>(() => {
    if (buckets.interested.length) return 'interested';
    if (buckets.booked.length) return 'booked';
    if (buckets.liked.length) return 'liked';
    if (buckets.past.length) return 'past';
    return 'liked';
  });

  const counts = {
    liked: buckets.liked.length,
    interested: buckets.interested.length,
    booked: buckets.booked.length,
    past: buckets.past.length,
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Account
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-foreground">I miei viaggi</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Salva i piani che ti piacciono, prenota il volo quando sei pronto. Solo dopo la conferma
          del volo il viaggio compare tra i prenotati.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                isActive
                  ? 'border-accent bg-accent/10 shadow-sm'
                  : 'border-border bg-white hover:border-accent/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className={cn('h-5 w-5', isActive ? 'text-accent' : 'text-muted-foreground')} />
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {counts[section.id]}
                </span>
              </div>
              <p className="mt-3 font-display text-sm font-semibold text-foreground">
                {section.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
            </button>
          );
        })}
      </div>

      {active === 'liked' ? (
        liked.length === 0 ? (
          <Empty
            title="Nessun itinerario salvato"
            body="Apri un piano di viaggio e tocca il cuore a destra della scheda."
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {liked.map((tpl, i) => (
              <li key={tpl.template_id}>
                <Link
                  href={itineraryPath(tpl.destination_slug, tpl.duration_days)}
                  className="block overflow-hidden rounded-[28px] border border-border bg-white shadow-sm transition hover:border-accent/40"
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
                      <Heart className="h-3 w-3 fill-accent text-accent" /> Salvato
                    </p>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-display text-2xl font-semibold text-white">
                        {tpl.destination_name} · {tpl.duration_days} giorni
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-white/80">{tpl.summary}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <PracticeGrid items={buckets[active]} empty={active} />
      )}
    </div>
  );
}

function PracticeGrid({
  items,
  empty,
}: {
  items: PracticeRow[];
  empty: SectionId;
}) {
  if (items.length === 0) {
    const copy = {
      interested: [
        'Nessun viaggio in valutazione',
        'Unisciti a una partenza o crea un viaggio: finché non prenoti il volo resta qui.',
      ],
      booked: [
        'Nessun viaggio prenotato',
        'Dopo la conferma del volo trovi qui hotel, attività e recap completo.',
      ],
      past: ['Nessun viaggio passato', 'I viaggi conclusi compariranno qui.'],
      liked: ['', ''],
    }[empty];
    return <Empty title={copy[0]} body={copy[1]} />;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {items.map((p, i) => {
        const tpl = findItineraryTemplate(p.template_id);
        const booked = isBooked(p);
        return (
          <li key={p.id}>
            <Link
              href={
                booked
                  ? `/pratica/${p.id}`
                  : p.edition_id
                    ? `/partenze/${p.edition_id}`
                    : `/pratica/${p.id}`
              }
              className="block overflow-hidden rounded-[28px] border border-border bg-white shadow-sm transition hover:border-accent/40"
            >
              <div className="relative h-52">
                <Image
                  src={uniqueCover(tpl?.destination_slug ?? p.template_id, i)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                  {booked ? 'Prenotato' : MODE_LABEL[p.mode]}
                </p>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-display text-2xl font-semibold text-white">
                    {tpl?.destination_name ?? p.template_id}
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
                      Volo da confermare per completare l&apos;iscrizione
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

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-6 py-14 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-6 rounded-full">
        <Link href="/destinazioni">Scegli un itinerario</Link>
      </Button>
    </div>
  );
}
