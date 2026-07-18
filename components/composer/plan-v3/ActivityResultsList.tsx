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
  hint?: string | null;
  onAdd: (item: ActivityResultItem) => void;
};

export function ActivityResultsList({
  items,
  loading,
  query,
  hint,
  onAdd,
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
          {hint ??
            (query.trim().length < 2
              ? 'Caricamento luoghi nell’area della mappa…'
              : 'Nessun risultato. Prova un termine diverso.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ActivityResultCard key={item.id} item={item} onAdd={() => onAdd(item)} />
      ))}
    </div>
  );
}