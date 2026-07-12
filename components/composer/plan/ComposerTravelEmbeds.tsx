'use client';

import { useMemo } from 'react';
import { TravelpayoutsEmbedWidget } from '@/components/travel/TravelpayoutsEmbedWidget';
import { primaryOriginIata } from '@/lib/composer/origins';
import {
  buildFlightMapEmbedUrl,
  buildFlightSearchEmbedUrl,
} from '@/lib/travelpayouts/embed-config';
import type { ComposerDraft } from '@/types/composer';
import { Map, Plane } from 'lucide-react';

type ComposerTravelEmbedsProps = {
  draft: ComposerDraft;
};

export function ComposerTravelEmbeds({ draft }: ComposerTravelEmbedsProps) {
  const originIata = primaryOriginIata(draft);
  const destLabel = draft.destinationMeta?.label ?? draft.destination;

  const ctx = useMemo(
    () => ({
      destination: draft.destination,
      destinationMeta: draft.destinationMeta,
      startDate: draft.startDate,
      endDate: draft.endDate,
      originIata,
    }),
    [
      draft.destination,
      draft.destinationMeta,
      draft.startDate,
      draft.endDate,
      originIata,
    ]
  );

  const searchUrl = useMemo(() => buildFlightSearchEmbedUrl(ctx), [ctx]);
  const mapUrl = useMemo(() => buildFlightMapEmbedUrl(ctx), [ctx]);
  const embedKey = `${originIata}-${draft.startDate}-${draft.endDate}-${destLabel}`;

  return (
    <div className="space-y-3">
      <div className="composer-tpwl-shell space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Plane className="h-4 w-4 text-sky-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">Cerca voli + hotel</p>
            <p className="text-[10px] text-slate-500 truncate">
              {originIata} → {destLabel} · {draft.startDate} → {draft.endDate}
            </p>
          </div>
        </div>
        <TravelpayoutsEmbedWidget
          key={`search-${embedKey}`}
          embedUrl={searchUrl}
          minHeight={140}
        />
      </div>

      {mapUrl && (
        <div className="composer-tpwl-shell space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Map className="h-4 w-4 text-sky-600 shrink-0" />
            <p className="text-xs font-semibold text-slate-800">Mappa prezzi voli</p>
          </div>
          <TravelpayoutsEmbedWidget
            key={`map-${embedKey}`}
            embedUrl={mapUrl}
            minHeight={200}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}