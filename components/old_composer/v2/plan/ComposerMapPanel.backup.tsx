'use client';

import { motion } from 'framer-motion';
import { TripMap } from '@/components/maps/TripMap';
import { googleMapsItineraryUrl } from '@/lib/maps/google-maps-links';
import type { MapPin } from '@/lib/maps/pins';
import type { ComposerDraft } from '@/types/composer';
import { Button } from '@/components/ui/button';
import { ExternalLink, Map as MapIcon } from 'lucide-react';
import { useMemo } from 'react';

type ComposerMapPanelProps = {
  draft: ComposerDraft;
  pins: MapPin[];
  activeDayIndex: number;
  highlightedPinId: string | null;
  onPinClick: (pin: MapPin) => void;
  onMapClick: (lat: number, lng: number) => void;
};

export function ComposerMapPanel({
  draft,
  pins,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
}: ComposerMapPanelProps) {
  const googleMapsUrl = useMemo(() => googleMapsItineraryUrl(pins), [pins]);
  const stopCount = pins.filter((p) => p.id !== 'destination' && p.blockId).length;

  return (
    <motion.aside
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="composer-map-panel flex flex-col h-full min-h-0"
    >
      <div className="flex items-center justify-between gap-3 px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent shrink-0">
            <MapIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Mappa del giorno</p>
            <p className="text-[11px] text-white/40 truncate">
              Giorno {activeDayIndex} · {stopCount}{' '}
              {stopCount === 1 ? 'tappa' : 'tappe'}
            </p>
          </div>
        </div>
        {googleMapsUrl && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-white/55 hover:text-white hover:bg-white/8 shrink-0 text-xs"
          >
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Maps
            </a>
          </Button>
        )}
      </div>

      <div className="composer-map-frame flex-1 min-h-0">
        <TripMap
          destination={draft.destination}
          destinationMeta={draft.destinationMeta}
          pins={pins}
          activeDayIndex={activeDayIndex}
          highlightedPinId={highlightedPinId}
          showRoute
          animateFit
          className="h-full min-h-[320px] md:min-h-0 border-0 rounded-2xl"
          onPinClick={onPinClick}
          onMapClick={onMapClick}
        />
      </div>
    </motion.aside>
  );
}
