import Link from 'next/link';
import Image from 'next/image';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { publishedDestinations } from '@/lib/itineraries/catalog';
import { itineraryPath } from '@/lib/itineraries/params';

export function LandingDestinations() {
  const featured = publishedDestinations();

  return (
    <div className="mt-8 grid grid-cols-2 gap-2 sm:max-w-md">
      {featured.map((dest) => (
        <Link
          key={dest.slug}
          href={itineraryPath(dest.slug)}
          className="group overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-left backdrop-blur-sm transition hover:border-white/40"
        >
          <div className="relative h-16 sm:h-20">
            <Image
              src={coverForDestination(dest.slug)}
              alt={dest.name}
              fill
              className="object-cover"
              sizes="200px"
            />
          </div>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-white">
              {dest.emoji} {dest.name}
            </p>
            <p className="truncate text-[11px] text-white/80">{dest.vibe}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
