import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { buildPinsFromItineraryTemplate } from '@/lib/itineraries/geo';
import { cn } from '@/lib/utils';

type Pt = { x: number; y: number };

function project(points: { lat: number; lng: number }[]): Pt[] {
  if (!points.length) return [];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.12;
  const dLat = Math.max(maxLat - minLat, 0.08);
  const dLng = Math.max(maxLng - minLng, 0.08);
  return points.map((p) => ({
    x: ((p.lng - minLng) / dLng) * (1 - pad * 2) + pad,
    y: 1 - (((p.lat - minLat) / dLat) * (1 - pad * 2) + pad),
  }));
}

/** Miniatura SVG dell’itinerario (solo tappe con coordinate). */
export function ItineraryMiniSketch({
  slug,
  durationDays,
  className,
}: {
  slug: string;
  durationDays?: number;
  className?: string;
}) {
  const template = findItineraryBySlug(slug, durationDays);
  const raw = template
    ? buildPinsFromItineraryTemplate(template)
    : (() => {
        const dest = findCatalogDestination(slug);
        if (dest?.lat == null || dest?.lng == null) return [];
        return [{ lat: dest.lat, lng: dest.lng, id: 'd' }];
      })();

  const unique: { lat: number; lng: number }[] = [];
  for (const p of raw) {
    const prev = unique[unique.length - 1];
    if (prev && Math.abs(prev.lat - p.lat) < 1e-5 && Math.abs(prev.lng - p.lng) < 1e-5) continue;
    unique.push({ lat: p.lat, lng: p.lng });
  }

  if (unique.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[9px] text-slate-400',
          className
        )}
        aria-hidden
      >
        —
      </div>
    );
  }

  const pts = project(unique);
  const w = 120;
  const h = 64;
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x * w).toFixed(1)},${(p.y * h).toFixed(1)}`)
    .join(' ');

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200/80 bg-[#f4f7f6]',
        className
      )}
      aria-hidden
      title="Anteprima itinerario"
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <rect width={w} height={h} fill="#eef3f1" />
        <path
          d={path}
          fill="none"
          stroke="#0F766E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x * w}
              cy={p.y * h}
              r={i === 0 || i === pts.length - 1 ? 3.2 : 2.2}
              fill={i === 0 ? '#F97316' : '#0F766E'}
              stroke="#fff"
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
