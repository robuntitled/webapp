'use client';

import Image from 'next/image';
import { ExternalLink, Landmark, Star, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PrenotaAffiliateCardItem = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  provider: 'viator' | 'getyourguide';
  rating?: number | null;
  ratingCount?: number | null;
  priceFrom?: number | null;
  currency?: string | null;
  durationMinutes?: number | null;
  metaRight?: string | null;
  bookingUrl: string;
  ctaLabel?: string;
};

function formatPrice(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return null;
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency || 'EUR'}`;
  }
}

function formatDuration(mins: number | null | undefined) {
  if (mins == null || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function providerLabel(p: PrenotaAffiliateCardItem['provider']) {
  return p === 'viator' ? 'Viator' : 'GetYourGuide';
}

export function PrenotaAffiliateResultCard({ item }: { item: PrenotaAffiliateCardItem }) {
  const price = formatPrice(item.priceFrom, item.currency);
  const duration = formatDuration(item.durationMinutes);
  const cta = item.ctaLabel ?? 'Prenota';

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="grid sm:grid-cols-[148px_1fr]">
        <div className="relative aspect-[16/11] bg-muted sm:aspect-auto sm:min-h-[168px]">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, 148px"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[140px] items-center justify-center text-muted-foreground/35">
              {item.provider === 'viator' ? (
                <Landmark className="h-9 w-9" />
              ) : (
                <Ticket className="h-9 w-9" />
              )}
            </div>
          )}
          <span
            className={cn(
              'absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm',
              item.provider === 'viator'
                ? 'bg-emerald-950/70 text-emerald-100'
                : 'bg-orange-950/70 text-orange-100'
            )}
          >
            {providerLabel(item.provider)}
          </span>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5 sm:p-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {duration ? <span>{duration}</span> : null}
              {duration && item.metaRight ? <span aria-hidden>·</span> : null}
              {item.metaRight ? <span>{item.metaRight}</span> : null}
            </div>
            <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight text-foreground sm:text-base">
              {item.title}
            </h3>
            {item.description ? (
              <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-border/40 pt-3">
            <div className="min-w-0">
              {item.rating != null ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  {item.rating.toFixed(1)}
                  {item.ratingCount != null ? (
                    <span className="font-normal text-muted-foreground">
                      ({item.ratingCount.toLocaleString('it-IT')})
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Senza valutazione</span>
              )}
              {price ? (
                <p className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
                  da {price}
                </p>
              ) : null}
            </div>
            <a
              href={item.bookingUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {cta}
              <ExternalLink className="h-3.5 w-3.5 opacity-90" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
