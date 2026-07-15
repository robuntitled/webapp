'use client';

import {
  ActivityResultCard,
  type ActivityResultItem,
} from '@/components/composer/plan-v3/ActivityResultCard';
import { Loader2 } from 'lucide-react';

type ActivityResultsListProps = {
  items: ActivityResultItem[];
  loading: boolean;
  query: string;
  onAdd: (item: ActivityResultItem) => void;
  onAddCustom: () => void;
};

export function ActivityResultsList({
  items,
  loading,
  query,
  onAdd,
  onAddCustom,
}: ActivityResultsListProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cerco luoghi…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-white/50">
          {query.length < 2
            ? 'Cerca un luogo o aggiungi una tappa custom.'
            : 'Nessun risultato. Prova un’altra ricerca o aggiungi custom.'}
        </p>
        <button
          type="button"
          onClick={onAddCustom}
          className="text-sm font-semibold text-amber-400 hover:underline"
        >
          Aggiungi “{query || 'tappa custom'}”
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ActivityResultCard key={item.id} item={item} onAdd={() => onAdd(item)} />
      ))}
      {query.trim() && (
        <button
          type="button"
          onClick={onAddCustom}
          className="w-full rounded-2xl border border-dashed border-white/10 py-3 text-sm font-medium text-white/50 transition hover:border-amber-400/30 hover:text-amber-400"
        >
          Oppure aggiungi custom: “{query.trim()}”
        </button>
      )}
    </div>
  );
}
