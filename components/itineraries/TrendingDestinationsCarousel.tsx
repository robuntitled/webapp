'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DestinationNavCard } from '@/components/itineraries/DestinationNavCard';
import { coverForDestination } from '@/lib/composer/destination-covers';
import type { TrendingDestinationCarouselItem } from '@/lib/itineraries/trending-destinations';
import { cn } from '@/lib/utils';

function useVisibleCount() {
  const [count, setCount] = useState(4);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(max-width: 639px)').matches) setCount(2);
      else if (window.matchMedia('(max-width: 1023px)').matches) setCount(3);
      else setCount(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return count;
}

function PublicHubCard({
  label,
  ctaLabel,
  onClick,
}: {
  label: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  const cover = coverForDestination('thailandia');

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-accent/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={cover}
          alt={label}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 40vw, 180px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          <Globe className="h-3 w-3" aria-hidden />
          {label}
        </span>
      </div>
      <p className="px-2 py-2.5 text-center text-[clamp(0.82rem,0.25vw+0.78rem,0.95rem)] font-semibold text-accent">
        {ctaLabel}
      </p>
    </button>
  );
}

export function TrendingDestinationsCarousel({
  items,
  onDestinationClick,
  onPublicHubClick,
}: {
  items: TrendingDestinationCarouselItem[];
  onDestinationClick: (slug: string) => void;
  onPublicHubClick: () => void;
}) {
  const visibleCount = useVisibleCount();
  const pageCount = Math.max(1, Math.ceil(items.length / visibleCount));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  const pageItems = useMemo(() => {
    const start = page * visibleCount;
    return items.slice(start, start + visibleCount);
  }, [items, page, visibleCount]);

  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(pageCount - 1, p + 1)),
    [pageCount]
  );

  if (items.length === 0) return null;

  return (
    <section className="space-y-4" aria-label="Destinazioni più cercate">
      <header className="space-y-1 text-center sm:text-left">
        <h2 className="font-display text-[clamp(1.2rem,1.5vw,1.5rem)] font-semibold tracking-tight text-slate-900">
          Destinazioni più cercate
        </h2>
      </header>

      <div className="relative">
        <div className="overflow-hidden">
          <ul
            className="grid gap-3 sm:gap-4"
            style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}
          >
            {pageItems.map((item) => (
              <li key={item.kind === 'public-hub' ? 'public-hub' : item.slug} className="min-w-0">
                {item.kind === 'public-hub' ? (
                  <PublicHubCard
                    label={item.label}
                    ctaLabel={item.ctaLabel}
                    onClick={onPublicHubClick}
                  />
                ) : (
                  <DestinationNavCard
                    compact
                    name={item.name}
                    slug={item.slug}
                    onClick={() => onDestinationClick(item.slug)}
                    className="w-full max-w-none"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        {pageCount > 1 ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-white to-transparent sm:block" />
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white to-transparent sm:block" />
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-slate-200"
          onClick={goPrev}
          disabled={page === 0}
          aria-label="Pagina precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Pagine carosello">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`Pagina ${i + 1} di ${pageCount}`}
              onClick={() => setPage(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === page ? 'w-5 bg-primary' : 'w-2 bg-slate-300 hover:bg-slate-400'
              )}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-slate-200"
          onClick={goNext}
          disabled={page >= pageCount - 1}
          aria-label="Pagina successiva"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
