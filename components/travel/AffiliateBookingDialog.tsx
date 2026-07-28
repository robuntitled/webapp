'use client';

import Image from 'next/image';
import { ExternalLink, Star, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  GygDestinationWidget,
  ViatorDestinationWidget,
} from '@/components/travel/AffiliateDestinationWidgets';
import { cn } from '@/lib/utils';

export type AffiliateOfferPreview = {
  id: string;
  provider: 'viator' | 'getyourguide';
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  bookingUrl: string;
};

type Props = {
  offer: AffiliateOfferPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Città corrente (per widget correlati) */
  city?: string;
  startDate?: string;
  endDate?: string;
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

/**
 * Scheda in-app: dettaglio + widget partner.
 * Viator/GYG bloccano iframe sul checkout → niente schermo bianco; CTA esterna chiara.
 */
export function AffiliateBookingDialog({
  offer,
  open,
  onOpenChange,
  city,
  startDate,
  endDate,
}: Props) {
  if (!offer) return null;

  const price = formatPrice(offer.priceFrom, offer.currency);
  const providerLabel = offer.provider === 'viator' ? 'Viator' : 'GetYourGuide';
  const widgetTerm = offer.title || city || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-4 py-3 text-left sm:px-5">
          <div className="flex gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {offer.imageUrl ? (
                <Image
                  src={offer.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40">
                  <Ticket className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <p
                className={cn(
                  'mb-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                  offer.provider === 'viator'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                )}
              >
                {providerLabel}
              </p>
              <DialogTitle className="line-clamp-3 text-base leading-snug">
                {offer.title}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {offer.rating != null ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    {offer.rating.toFixed(1)}
                    {offer.ratingCount != null ? ` (${offer.ratingCount})` : ''}
                  </span>
                ) : null}
                {price ? <span className="font-semibold text-foreground">da {price}</span> : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {offer.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{offer.description}</p>
          ) : null}

          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Esperienze correlate · widget {providerLabel}
            </p>
            {offer.provider === 'viator' ? (
              <ViatorDestinationWidget
                searchTerm={widgetTerm}
                startDate={startDate}
                endDate={endDate}
              />
            ) : (
              <GygDestinationWidget
                query={city ? `${widgetTerm}, ${city}` : widgetTerm}
              />
            )}
            {!process.env.NEXT_PUBLIC_VIATOR_PARTNER_ID &&
            offer.provider === 'viator' ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Configura NEXT_PUBLIC_VIATOR_PARTNER_ID e WIDGET_REF per il widget in scheda.
              </p>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Il checkout sicuro è su {providerLabel} (accesso Affiliate). Con Basic Access non è
            possibile incorporare il pagamento dentro NomadLink.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[11px] text-muted-foreground">
            Pagamento e ticket gestiti da {providerLabel}.
          </p>
          <Button asChild className="rounded-xl">
            <a href={offer.bookingUrl} target="_blank" rel="noopener noreferrer sponsored">
              Prenota su {providerLabel}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
