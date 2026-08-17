import Link from 'next/link';
import Image from 'next/image';
import { TRIP_TEMPLATES } from '@/lib/composer/trip-templates';
import { coverForDestination } from '@/lib/composer/destination-covers';

export function LandingDestinations() {
  const featured = TRIP_TEMPLATES.filter((t) => t.featured).slice(0, 4);

  return (
    <div className="mt-8 grid grid-cols-2 gap-2 sm:max-w-md">
      {featured.map((tpl) => (
        <Link
          key={tpl.id}
          href="/dashboard"
          className="group overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-left backdrop-blur-sm transition hover:border-white/40"
        >
          <div className="relative h-16 sm:h-20">
            <Image
              src={coverForDestination(tpl.destinationId)}
              alt={tpl.label}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-white">
              {tpl.emoji} {tpl.label}
            </p>
            <p className="truncate text-[11px] text-white/80">{tpl.vibe}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
