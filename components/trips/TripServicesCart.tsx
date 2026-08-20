'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BedDouble, Plane, ShoppingBag, Ticket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addCartItem,
  CART_KIND_LABEL,
  cartTotal,
  emptyTripCart,
  readTripCart,
  removeCartItem,
  type TripCart,
  type TripCartItem,
  type TripCartKind,
} from '@/lib/cart/trip-cart';
import { defaultTripServices, servicesFromItinerary } from '@/lib/cart/trip-services';
import type { ComposerDayRow } from '@/lib/data/composer';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<TripCartKind, typeof Plane> = {
  flight: Plane,
  hotel: BedDouble,
  activity: Ticket,
  attraction: Ticket,
  car: Ticket,
  transfer: Ticket,
};

type TripServicesCartProps = {
  tripId: string;
  destination: string;
  composerItinerary?: ComposerDayRow[] | null;
  className?: string;
  locked?: boolean;
  lockReason?: string;
};

export function TripServicesCart({
  tripId,
  destination,
  composerItinerary,
  className,
  locked = false,
  lockReason,
}: TripServicesCartProps) {
  const planned = useMemo(() => {
    const fromItinerary = servicesFromItinerary(tripId, composerItinerary);
    if (fromItinerary.length > 0) return fromItinerary;
    return defaultTripServices(tripId, destination);
  }, [tripId, destination, composerItinerary]);

  const [cart, setCart] = useState<TripCart>(() => emptyTripCart(tripId));

  useEffect(() => {
    setCart(readTripCart(tripId));
  }, [tripId]);

  const inCart = (id: string) => cart.items.some((i) => i.id === id);
  const total = cartTotal(cart);

  const add = (item: TripCartItem) => setCart(addCartItem(tripId, item));
  const remove = (id: string) => setCart(removeCartItem(tripId, id));

  return (
    <section
      id="carrello"
      className={cn(
        'scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]',
        className
      )}
    >
      <div className="border-b border-border/40 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Servizi suggeriti
        </p>
        <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight">
          Servizi di questo viaggio
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
        </p>
        {locked ? (
          <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            {lockReason ?? 'Prenoti i servizi solo a gruppo formato.'}
          </p>
        ) : null}
      </div>

      <ul className="divide-y divide-border/40">
        {planned.map((item) => {
          const Icon = KIND_ICON[item.kind];
          const added = inCart(item.id);
          return (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-accent">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {CART_KIND_LABEL[item.kind]} · {item.provider}
                  {item.subtitle ? ` · ${item.subtitle}` : ''}
                </p>
              </div>
              {typeof item.price === 'number' ? (
                <span className="shrink-0 text-sm font-semibold tabular-nums">{item.price}€</span>
              ) : null}
              {locked ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">In attesa</span>
              ) : added ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-full"
                  onClick={() => add(item)}
                >
                  Aggiungi
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border/40 bg-muted/20 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4 text-accent" />
            Servizi selezionati
          </p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {cart.items.length} {cart.items.length === 1 ? 'servizio' : 'servizi'}
            {total > 0 ? ` · somma ${total}€` : ''}
          </p>
        </div>
        {total > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {COMPLIANCE_COPY.priceIsSumOfServices} {COMPLIANCE_COPY.budgetClarifier}
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}{' '}
          {COMPLIANCE_COPY.responsibility}
        </p>
        {locked ? (
          <p className="text-xs text-muted-foreground">
            Le prenotazioni si aprono alla soglia del gruppo.
          </p>
        ) : cart.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aggiungi voli, hotel o attività. Ogni servizio si prenota separatamente con il suo
            fornitore.
          </p>
        ) : (
          <div className="space-y-2">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {item.title} · {item.provider}
                </span>
                <Button asChild size="sm" className="h-8 shrink-0 rounded-full text-xs">
                  <Link href={item.checkoutHref}>Prenota con {item.provider}</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
