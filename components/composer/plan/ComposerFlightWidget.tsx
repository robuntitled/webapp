'use client';

import { useMemo } from 'react';
import { TravelpayoutsFlightWidget } from '@/components/travel/TravelpayoutsFlightWidget';
import { primaryOriginIata } from '@/lib/composer/origins';
import { buildFlightSearchCode } from '@/lib/travelpayouts/flight-search';
import { getPublicTravelWidgetId } from '@/lib/travelpayouts/public-config';
import type { ComposerDraft } from '@/types/composer';
import { Plane } from 'lucide-react';

type ComposerFlightWidgetProps = {
  draft: ComposerDraft;
};

export function ComposerFlightWidget({ draft }: ComposerFlightWidgetProps) {
  const wlId = getPublicTravelWidgetId();
  if (!wlId) return null;

  const originIata = primaryOriginIata(draft);
  const destLabel = draft.destinationMeta?.label ?? draft.destination;
  const adults =
    draft.planningMode === 'group' ? Math.min(Math.max(draft.maxParticipants, 1), 9) : 1;

  const flightSearch = useMemo(
    () =>
      buildFlightSearchCode({
        destination: draft.destination,
        startDate: draft.startDate,
        endDate: draft.endDate,
        originIata,
        adults,
      }),
    [draft.destination, draft.startDate, draft.endDate, originIata, adults]
  );

  return (
    <div className="composer-tpwl-shell space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Plane className="h-4 w-4 text-sky-600" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">Cerca voli in tempo reale</p>
          <p className="text-[10px] text-slate-500 truncate">
            {originIata} → {destLabel} · {draft.startDate} → {draft.endDate}
          </p>
        </div>
      </div>

      <TravelpayoutsFlightWidget
        key={`${wlId}-${flightSearch ?? 'search'}`}
        wlId={wlId}
        flightSearch={flightSearch}
        showSearch
        showResults
      />

      <p className="text-[10px] text-slate-500 px-1 leading-relaxed">
        Prezzi live da Aviasales — nessuna cache. Attiva &quot;Show hotels&quot; nel pannello WL per
        Booking.com dopo la ricerca volo.
      </p>
    </div>
  );
}