'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TripCard } from '@/components/trips/TripCard';
import { useDiscoverTripPins } from '@/components/dashboard/useDiscoverTripPins';
import type { TripWithRelations } from '@/types/trip';
import type { Session } from 'next-auth';
import { Compass } from 'lucide-react';

const HotelsResultsMap = dynamic(
  () => import('@/components/travel/HotelsResultsMap').then((m) => m.HotelsResultsMap),
  { ssr: false }
);

type DiscoverResultsSplitProps = {
  trips: TripWithRelations[];
  session: Session | null;
  emptyTitle?: string;
  emptyBody?: string;
};

export function DiscoverResultsSplit({
  trips,
  session,
  emptyTitle = 'Nessun viaggio trovato',
  emptyBody,
}: DiscoverResultsSplitProps) {
  const router = useRouter();
  const pins = useDiscoverTripPins(trips);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  if (trips.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
          <Compass className="h-7 w-7 text-accent" />
        </div>
        <h3 className="font-display text-xl text-white font-semibold">{emptyTitle}</h3>
        {emptyBody ? (
          <p className="mt-2 text-white/60 max-w-md mx-auto text-sm">{emptyBody}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <ul className="lg:col-span-6 space-y-4">
        {trips.map((trip) => (
          <li
            key={trip.id}
            onMouseEnter={() => setHighlightedId(trip.id)}
            onMouseLeave={() => setHighlightedId((id) => (id === trip.id ? null : id))}
          >
            <TripCard trip={trip} session={session} discover />
          </li>
        ))}
      </ul>
      <div className="hidden lg:block lg:col-span-6 lg:sticky lg:top-24 h-[min(72vh,720px)]">
        <HotelsResultsMap
          pins={pins}
          highlightedId={highlightedId}
          onPinClick={setHighlightedId}
          onBookClick={(id) => router.push(`/viaggi/${id}`)}
          className="h-full min-h-[480px]"
          emptyLabel="Mappa in arrivo — manca la geolocalizzazione di queste destinazioni"
        />
      </div>
    </div>
  );
}
