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
      className={`h-10 w-full rounded-2xl border-slate-200 bg-white text-sm font-semibold shadow-sm transition ${
        active
          ? 'border-sky-300 text-sky-700 ring-2 ring-sky-100'
          : 'text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <MapPinned className="mr-2 h-4 w-4" />
      {active ? 'Mostra solo il giorno attivo' : 'See Full Trip in Maps'}
    </Button>
  );
}
