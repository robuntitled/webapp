'use client';

import { Button } from '@/components/ui/button';
import { formatDistanceKm } from '@/lib/maps/distance';
import { MapPin, Plus } from 'lucide-react';

export type ActivityResultItem = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  imageHue?: number;
};

type ActivityResultCardProps = {
  item: ActivityResultItem;
  onAdd: () => void;
};

export function ActivityResultCard({ item, onAdd }: ActivityResultCardProps) {
  const hue = item.imageHue ?? ((item.title.length * 37) % 360);

  return (
    <article className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-sm transition hover:border-amber-400/30 hover:bg-white/[0.05]">
      <div
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 65% 65%), hsl(${(hue + 40) % 360} 55% 45%))`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-white/80">
          <MapPin className="h-6 w-6" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{item.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{item.subtitle}</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onAdd}
            className="h-8 shrink-0 rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-3 text-xs font-semibold text-white hover:brightness-110"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Aggiungi
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-medium text-white/70">
            {item.category}
          </span>
          {item.distanceKm != null && (
            <span className="font-medium text-white/40">{formatDistanceKm(item.distanceKm)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
