'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ComposerTravelEmbeds } from '@/components/composer/plan/ComposerTravelEmbeds';

import {
  collectOriginsFromDraft,
  uniqueOriginsByIata,
} from '@/lib/composer/origins';
import {
  getPublicTravelWidgetId,
  hasTravelpayoutsEmbed,
} from '@/lib/travelpayouts/public-config';
import { buildWlFlightSearchPageUrl } from '@/lib/travelpayouts/wl-search-url';
import type { ComposerDraft, ComposerOrigin } from '@/types/composer';
import { Download, ExternalLink, Hotel, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

export type ImportedFlightQuote = {
  origin: ComposerOrigin;
  price: number | null;
  currency: string;
  airline: string | null;
  destination: string;
  destinationIata: string;
  affiliateUrl: string | null;
  fromCache: boolean;
};

type TravelSearchPanelProps = {
  draft: ComposerDraft;
  onAddFlight: (origin?: ComposerOrigin) => void;
  onImportFlights: (quotes: ImportedFlightQuote[]) => void;
  onAddHotel: () => void;
};

async function fetchFlightQuoteForOrigin(
  draft: ComposerDraft,
  origin: ComposerOrigin
): Promise<ImportedFlightQuote | null> {
  const params = new URLSearchParams({
    destination: draft.destination,
    startDate: draft.startDate,
    endDate: draft.endDate,
    origin: origin.iata,
  });

  const response = await fetch(`/api/travel/estimate?${params}`);
  const data = await response.json();
  const quote = data.quote;

  if (!response.ok && !data.affiliateUrl) return null;

  return {
    origin,
    price: quote?.price ?? null,
    currency: quote?.currency ?? 'EUR',
    airline: quote?.airline ?? null,
    destination: quote?.destination ?? draft.destination,
    destinationIata: quote?.destination ?? '',
    affiliateUrl: data.affiliateUrl ?? null,
    fromCache: Boolean(quote?.price),
  };
}

export function TravelSearchPanel({
  draft,
  onAddFlight,
  onImportFlights,
  onAddHotel,
}: TravelSearchPanelProps) {
  const [importing, setImporting] = useState(false);
  const embedEnabled = hasTravelpayoutsEmbed();
  const wlEnabled = Boolean(getPublicTravelWidgetId());
  const wlSearchUrl = draft.destination && draft.startDate && draft.endDate
    ? buildWlFlightSearchPageUrl(draft)
    : null;

  const importFlightsFromCache = async () => {
    setImporting(true);
    try {
      const origins = uniqueOriginsByIata(collectOriginsFromDraft(draft));
      const results = await Promise.all(origins.map((origin) => fetchFlightQuoteForOrigin(draft, origin)));
      const quotes = results.filter((q): q is ImportedFlightQuote => q != null);

      if (quotes.length === 0) {
        toast.error('Impossibile recuperare voli — verifica TRAVELPAYOUTS_API_TOKEN su Vercel.');
        return;
      }

      onImportFlights(quotes);

      const withPrice = quotes.filter((q) => q.price != null && q.price > 0);
      if (withPrice.length > 0) {
        toast.success(
          `${withPrice.length} volo/i importato/i dalla cache Travelpayouts`,
          { duration: 5000 }
        );
      } else {
        toast.info(
          'Nessun prezzo in cache per questa rotta — blocchi volo creati con link di ricerca.',
          { duration: 7000 }
        );
      }
    } catch {
      toast.error('Errore durante l\'import voli');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-1">
        Cerca &amp; prenota
      </p>

      {!embedEnabled && !wlEnabled && (
        <p className="text-[10px] text-white/40 px-1 leading-relaxed">
          Configura Travelpayouts su Vercel (TRS + marker o WL_ID) per attivare la ricerca voli.
        </p>
      )}

      {embedEnabled && <ComposerTravelEmbeds draft={draft} />}

      {wlEnabled && wlSearchUrl && (
        <div className="space-y-2 px-1">
          <p className="text-[10px] text-amber-200/80 rounded-xl border border-amber-400/20 bg-amber-500/10 px-2.5 py-2 leading-relaxed">
            Se si apre Booking.com: in Travelpayouts → WL Web → Content disattiva &quot;Show hotels&quot;.
          </p>
          <Button
            asChild
            size="sm"
            className="w-full h-9 rounded-xl text-xs bg-sky-600/90 hover:bg-sky-600 text-white border-0"
          >
            <Link href={wlSearchUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Ricerca completa con risultati in pagina
            </Link>
          </Button>
          <p className="text-[10px] text-white/35 leading-relaxed">
            Il White Label funziona solo su pagina dedicata (non nel composer). Apri il link,
            cerca i voli lì, poi torna qui e usa Importa volo.
          </p>
        </div>
      )}

      {embedEnabled && (
        <p className="text-[10px] text-white/35 px-1 leading-relaxed">
          Il form rapido apre Aviasales per prenotare. Usa{' '}
          <strong className="text-white/50 font-medium">Importa volo</strong> per salvare nel piano.
        </p>
      )}

      <div className="flex flex-col gap-2 px-1">
        <Button
          type="button"
          size="sm"
          className="w-full h-9 rounded-xl text-xs bg-white/10 hover:bg-white/15 text-white border border-white/15"
          onClick={() => void importFlightsFromCache()}
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Importa volo (automatico)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-9 rounded-xl text-xs border-sky-400/30 text-sky-100 hover:bg-sky-500/10"
          onClick={() => onAddFlight(draft.organizerOrigin)}
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Aggiungi volo vuoto al piano
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