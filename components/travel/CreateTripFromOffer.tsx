'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createTripFromFlightAction,
  createTripFromHotelAction,
} from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { accediHref } from '@/lib/auth/callback-url';
import type { FlightSearchSeed, HotelSearchSeed } from '@/lib/itineraries/from-search';
import {
  saveFlightCheckoutDraft,
  type FlightCheckoutDraft,
} from '@/lib/travel/flight-checkout-draft';
import {
  saveHotelOfferDraft,
  type HotelOfferDraft,
} from '@/lib/travel/hotel-offer-draft';
import { saveTripFromSearchDraft } from '@/lib/travel/trip-from-search-draft';
import { cn } from '@/lib/utils';

type FlightProps = {
  kind: 'flight';
  seed: FlightSearchSeed;
  checkout: Omit<FlightCheckoutDraft, 'practiceId' | 'createdAt'> & {
    createdAt?: number;
  };
  className?: string;
};

type HotelProps = {
  kind: 'hotel';
  seed: HotelSearchSeed;
  checkout: Omit<HotelOfferDraft, 'practiceId' | 'savedAt'> & { savedAt?: number };
  className?: string;
};

/**
 * CTA Fase 1: crea il viaggio in bozza dal risultato, poi apre il checkout del singolo servizio.
 * Regola legale: un servizio alla volta ("prima paghi, poi scegli il prossimo").
 */
export function CreateTripFromOffer(props: FlightProps | HotelProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  const label =
    props.kind === 'flight'
      ? 'Crea il viaggio con questo volo'
      : 'Crea il viaggio con questo hotel';

  const onClick = () => {
    if (status === 'loading' || pending || busy) return;

    if (!session?.user?.id) {
      const createdAt = Date.now();
      if (props.kind === 'flight') {
        const checkout: FlightCheckoutDraft = {
          ...props.checkout,
          createdAt,
        };
        saveFlightCheckoutDraft(checkout);
        saveTripFromSearchDraft({
          kind: 'flight',
          seed: props.seed,
          checkout,
          createdAt,
        });
      } else {
        const checkout: HotelOfferDraft = {
          ...props.checkout,
          savedAt: createdAt,
        };
        saveHotelOfferDraft(checkout);
        saveTripFromSearchDraft({
          kind: 'hotel',
          seed: props.seed,
          checkout,
          createdAt,
        });
      }
      toast.message('Per salvare il viaggio ti chiederemo di creare un account.');
      router.push(
        accediHref(
          props.kind === 'flight' ? '/prenota/voli/checkout' : '/prenota/hotel/checkout',
          'register'
        )
      );
      return;
    }

    setBusy(true);
    start(async () => {
      try {
        if (props.kind === 'flight') {
          const result = await createTripFromFlightAction({ seed: props.seed });
          if ('error' in result) {
            toast.error(result.error);
            return;
          }
          saveFlightCheckoutDraft({
            ...props.checkout,
            practiceId: result.practiceId,
            createdAt: Date.now(),
          });
          router.push('/prenota/voli/checkout');
          return;
        }

        const result = await createTripFromHotelAction({ seed: props.seed });
        if ('error' in result) {
          toast.error(result.error);
          return;
        }
        saveHotelOfferDraft({
          ...props.checkout,
          practiceId: result.practiceId,
          savedAt: Date.now(),
        });
        router.push('/prenota/hotel/checkout');
      } catch {
        toast.error('Impossibile creare il viaggio. Riprova.');
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={pending || busy || status === 'loading'}
      className={cn(
        'h-11 w-full rounded-xl bg-[var(--color-cta)] font-semibold text-white hover:bg-[#A93720]',
        props.className
      )}
    >
      {pending || busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
