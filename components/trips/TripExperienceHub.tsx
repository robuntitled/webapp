'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ComposerItineraryView } from '@/components/composer/ComposerItineraryView';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromItinerary } from '@/lib/maps/pins';
import type { ComposerDayRow } from '@/lib/data/composer';
import { Card, CardContent } from '@/components/ui/card';
import { Map, List } from 'lucide-react';

type TripExperienceHubProps = {
  destination: string;
  description: string;
  composerItinerary: ComposerDayRow[] | null;
};

type Tab = 'itinerary' | 'map';

export function TripExperienceHub({
  destination,
  description,
  composerItinerary,
}: TripExperienceHubProps) {
  const [tab, setTab] = useState<Tab>('itinerary');
  const [activeDay, setActiveDay] = useState(1);

  const pins =
    composerItinerary && composerItinerary.length > 0
      ? buildPinsFromItinerary(destination, composerItinerary)
      : [];

  const tabs = [
    { id: 'itinerary' as const, label: 'Itinerario', icon: List },
    { id: 'map' as const, label: 'Mappa', icon: Map },
  ];

  return (
    <div className="space-y-4">
      <div className="flex rounded-full bg-muted/60 p-1 gap-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="trip-hub-tab"
                className="absolute inset-0 bg-background shadow-sm rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <t.icon className="h-4 w-4" />
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {tab === 'itinerary' &&
        (composerItinerary && composerItinerary.length > 0 ? (
          <ComposerItineraryView days={composerItinerary} />
        ) : (
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-8">
              <h2 className="font-display text-2xl font-semibold mb-4">L&apos;esperienza</h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{description}</p>
            </CardContent>
          </Card>
        ))}

      {tab === 'map' && (
        <div className="space-y-4">
          <TripMap
            destination={destination}
            pins={pins}
            activeDayIndex={activeDay}
            className="h-[420px] md:h-[480px]"
            onPinClick={(pin) => setActiveDay(pin.dayIndex)}
          />
          {pins.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(pins.map((p) => p.dayIndex))).sort().map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`text-xs rounded-full px-3 py-1.5 border transition ${
                    activeDay === day
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  Giorno {day}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}