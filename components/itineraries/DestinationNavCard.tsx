import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { coverForDestination } from '@/lib/composer/destination-covers';

/** Card navigazione minimale: immagine + nome (carosello e griglie compatte). */
export function DestinationNavCard({
  name,
  slug,
  href,
  onClick,
  className,
  compact = false,
}: {
  name: string;
  slug: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const cover = coverForDestination(slug);
  const inner = (
    <>
      <div className={cn('relative w-full overflow-hidden', compact ? 'aspect-square' : 'aspect-[4/5]')}>
        <Image
          src={cover}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 40vw, 180px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>
      <p className="truncate px-2 py-2.5 text-center text-[clamp(0.82rem,0.25vw+0.78rem,0.95rem)] font-semibold text-slate-900">
        {name}
      </p>
    </>
  );

  const shellClass = cn(
    'group flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    compact ? 'max-w-[9.5rem]' : '',
    className
  );

  if (href) {
    return (
      <Link href={href} className={shellClass} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={shellClass} onClick={onClick}>
      {inner}
    </button>
  );
}
