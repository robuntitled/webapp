'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Loader2, Star, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
 * Scheda attività in-app: anteprima + iframe partner (se il sito lo consente).
 * Checkout resta sul dominio Viator/GYG (affiliate).
 */
export function AffiliateBookingDialog({ offer, open, onOpenChange }: Props) {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (!open || !offer) return;
    setIframeBlocked(false);
    setIframeLoading(true);
    // Molti siti partner bloccano iframe (X-Frame-Options). Timeout → fallback CTA.
    const t = window.setTimeout(() => {
      setIframeLoading((loading) => {
        if (loading) setIframeBlocked(true);
        return false;
      });
    }, 4500);
    return () => window.clearTimeout(t);
  }, [open, offer?.id, offer?.bookingUrl]);

  if (!offer) return null;

  const price = formatPrice(offer.priceFrom, offer.currency);
  const providerLabel = offer.provider === 'viator' ? 'Viator' : 'GetYourGuide';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-4 py-3 text-left sm:px-5">
          <div className="flex gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {offer.imageUrl ? (
                <Image
                  src={offer.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40">
                  <Ticket className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
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
              <DialogTitle className="line-clamp-2 text-base leading-snug">
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
          {offer.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
          ) : null}
        </DialogHeader>

        <div className="relative min-h-[min(55vh,420px)] flex-1 bg-muted/30">
          {!iframeBlocked ? (
            <>
              {iframeLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Carico prenotazione {providerLabel}…
                </div>
              ) : null}
              <iframe
                title={`Prenota su ${providerLabel}`}
                src={offer.bookingUrl}
                className="h-[min(55vh,420px)] w-full border-0"
                onLoad={() => {
                  setIframeLoading(false);
                  setIframeBlocked(false);
                }}
                // sandbox permissive enough for partner checkout UI
                referrerPolicy="no-referrer-when-downgrade"
              />
            </>
          ) : (
            <div className="flex h-[min(55vh,420px)] flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                {providerLabel} non consente l’embed in pagina. Apri la prenotazione nel loro sito
                sicuro — resti tracciato come affiliate NomadLink.
              </p>
              <Button asChild className="rounded-xl">
                <a
                  href={offer.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  Continua su {providerLabel}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 px-4 py-3 sm:px-5">
          <p className="text-[11px] text-muted-foreground">
            Pagamento e ticket gestiti da {providerLabel}.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <a href={offer.bookingUrl} target="_blank" rel="noopener noreferrer sponsored">
              Apri in nuova scheda
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
