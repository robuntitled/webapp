import { AlertTriangle } from 'lucide-react';

/**
 * Travelpayouts WL con "Show hotels" attivo reindirizza la tab corrente a Booking.com
 * e apre i voli in un'altra tab. Va disattivato nel pannello WL → Content.
 */
export function TravelpayoutsWlHotelsNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed flex gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
      <p>
        Se alla ricerca si apre <strong>Booking.com</strong> o torni alla home, in Travelpayouts vai su{' '}
        <strong>White Label → WL Web → Content</strong> e disattiva{' '}
        <strong>&quot;Show hotels&quot;</strong>. Poi salva e riprova.
      </p>
    </div>
  );
}