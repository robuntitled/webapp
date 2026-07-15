'use client';

import { Button } from '@/components/ui/button';
import { MapPinned } from 'lucide-react';
import type { MapViewMode } from '@/lib/maps/map-view-mode';

type FullTripMapsCtaProps = {
  mode: MapViewMode;
  onToggle: () => void;
};

export function FullTripMapsCta({ mode, onToggle }: FullTripMapsCtaProps) {
  const active = mode === 'fullTrip';

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      className={`h-11 w-full rounded-2xl border-white/10 text-sm font-semibold shadow-sm transition ${
        active
          ? 'bg-white/10 text-amber-300 ring-2 ring-amber-400/20'
          : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
      }`}
    >
      <MapPinned className="mr-2 h-4 w-4" />
      {active ? 'Mostra solo il giorno attivo' : 'See Full Trip in Maps'}
    </Button>
  );
}
