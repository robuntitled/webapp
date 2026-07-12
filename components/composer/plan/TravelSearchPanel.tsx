'use client';

import { Button } from '@/components/ui/button';
import { ComposerFlightWidget } from '@/components/composer/plan/ComposerFlightWidget';
import { ComposerTravelEmbeds } from '@/components/composer/plan/ComposerTravelEmbeds';
import {
  hasEmbeddedTravelWidget,
  hasTravelpayoutsEmbed,
} from '@/lib/travelpayouts/public-config';
import type { ComposerDraft, ComposerOrigin } from '@/types/composer';
import { Hotel, Search } from 'lucide-react';

type TravelSearchPanelProps = {
  draft: ComposerDraft;
  onAddFlight: (origin?: ComposerOrigin) => void;
  onAddHotel: () => void;
};

export function TravelSearchPanel({ draft, onAddFlight, onAddHotel }: TravelSearchPanelProps) {
  const embedEnabled = hasTravelpayoutsEmbed();
  const wlWidgetEnabled = hasEmbeddedTravelWidget() && !embedEnabled;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-1">
        Cerca &amp; prenota
      </p>

      {!embedEnabled && !wlWidgetEnabled && (
        <p className="text-[10px] text-white/40 px-1 leading-relaxed">
          Aggiungi su Vercel:{' '}
          <code className="text-[9px] text-accent/80">NEXT_PUBLIC_TRAVELPAYOUTS_TRS_ID=548437</code>{' '}
          e{' '}
          <code className="text-[9px] text-accent/80">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER</code> per
          attivare i widget integrati (search + mappa).
        </p>
      )}

      {embedEnabled && <ComposerTravelEmbeds draft={draft} />}
      {wlWidgetEnabled && <ComposerFlightWidget draft={draft} />}

      {(embedEnabled || wlWidgetEnabled) && (
        <p className="text-[10px] text-white/35 px-1 leading-relaxed">
          Cerca nel widget, poi salva la scelta nel piano con i pulsanti sotto. Hotel incluso nel
          widget voli (show_hotels).
        </p>
      )}

      <div className="flex flex-col gap-2 px-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-9 rounded-xl text-xs border-sky-400/30 text-sky-100 hover:bg-sky-500/10"
          onClick={() => onAddFlight(draft.organizerOrigin)}
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Aggiungi volo al piano
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-9 rounded-xl text-xs border-violet-400/30 text-violet-100 hover:bg-violet-500/10"
          onClick={onAddHotel}
        >
          <Hotel className="mr-1.5 h-3.5 w-3.5" />
          Aggiungi hotel al piano
        </Button>
      </div>
    </div>
  );
}