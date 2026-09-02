'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JoinTripLinkDialog } from '@/components/itineraries/JoinTripLinkDialog';
import { EditionCard } from '@/components/itineraries/OfficialEditionsGrid';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { editionScarcity, editionThresholdProgress } from '@/lib/itineraries/edition-present';
import { editionDestinationSlug } from '@/lib/itineraries/public-destinations';
import type { OfficialEditionCard } from '@/lib/itineraries/types';
import type { CatalogFilterState } from '@/components/itineraries/CatalogFiltersBar';
import { formatItDate } from '@/lib/itineraries/dates';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

function durationFromId(templateId: string, fallback?: number | null) {
  if (fallback != null) return fallback;
  const m = templateId.match(/-(\d+)d(?:-|$)/i);
  return m ? Number(m[1]) : null;
}

export function PrivateTripsSection({
  editions,
  filters,
}: {
  editions: OfficialEditionCard[];
  filters: CatalogFilterState;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const pageStep = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const card = el.querySelector('li');
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 16;
    const cardW = card ? card.getBoundingClientRect().width : el.clientWidth * 0.8;
    const step = cardW + gap;
    const visible = Math.max(1, Math.round(el.clientWidth / step));
    return visible * step;
  }, []);

  const scrollByCard = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = pageStep();
    if (!step) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    if (dir === 1 && el.scrollLeft >= max - 8) {
      el.scrollTo({ left: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    if (dir === -1 && el.scrollLeft <= 8) {
      el.scrollTo({ left: max, behavior: reducedMotion ? 'auto' : 'smooth' });
      return;
    }
    el.scrollBy({ left: dir * step, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [pageStep, reducedMotion]);

  const items = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return editions
      .map((ed, i) => {
        const tpl = findItineraryTemplate(ed.template_id);
        const slug = editionDestinationSlug(ed);
        const dest = findCatalogDestination(slug) ?? findCatalogDestination(ed.template_id);
        const days = durationFromId(ed.template_id, tpl?.duration_days);
        return {
          ed,
          tpl,
          dest,
          days,
          scarcity: editionScarcity(ed),
          progress: editionThresholdProgress(ed.confirmed_count ?? 0, ed.min_confirmed),
          cover: uniqueCover(slug || ed.template_id, i + 80),
          name: (tpl?.destination_name ?? (slug || ed.template_id)).toLowerCase(),
          continent: dest?.continent ?? 'Asia',
        };
      })
      .filter(({ ed, tpl, dest, name, continent, days }) => {
        if (filters.continent !== 'Tutte' && continent !== filters.continent) return false;
        if (filters.duration != null && (days == null || days !== filters.duration)) return false;
        if (filters.priceMax != null) {
          const budget = tpl?.budget_orientative_eur.total_hint;
          if (budget != null && budget > filters.priceMax) return false;
        }
        if (!q) return true;
        return (
          name.includes(q) ||
          ed.template_id.toLowerCase().includes(q) ||
          (tpl?.destination_name ?? '').toLowerCase().includes(q) ||
          continent.toLowerCase().includes(q) ||
          (dest?.vibe ?? '').toLowerCase().includes(q) ||
          formatItDate(ed.date_from).toLowerCase().includes(q)
        );
      });
  }, [editions, filters]);

  const measurePages = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const count = max < 8 ? 1 : Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setPageCount(count);
    const nextPage = max < 8 ? 0 : Math.round((el.scrollLeft / max) * (count - 1));
    setPage(nextPage);
  }, []);

  useEffect(() => {
    measurePages();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measurePages);
    ro.observe(el);
    window.addEventListener('resize', measurePages);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measurePages);
    };
  }, [measurePages, items.length]);

  useEffect(() => {
    if (reducedMotion || paused || items.length <= 1 || pageCount <= 1) return;
    const id = window.setInterval(() => scrollByCard(1), 2500);
    return () => window.clearInterval(id);
  }, [items.length, pageCount, paused, reducedMotion, scrollByCard]);

  const scrollToPage = useCallback((index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = pageCount <= 1 ? 0 : (index / (pageCount - 1)) * max;
    el.scrollTo({ left, behavior: 'smooth' });
  }, [pageCount]);

  const empty = items.length === 0;
  const noPrivateAtAll = editions.length === 0;

  return (
    <section
      className="flex flex-col rounded-3xl border border-slate-200/80 bg-slate-50/70 px-4 pt-3 pb-4 sm:px-5 sm:pt-3.5 sm:pb-5"
      aria-labelledby="viaggi-privati-title"
    >
      <div className="shrink-0 space-y-1">
        <h2
          id="viaggi-privati-title"
          className="font-display text-[clamp(1.02rem,0.9vw+0.92rem,1.2rem)] font-semibold text-slate-900"
        >
          Viaggi privati
        </h2>
        <p className="text-sm text-slate-600">
          Solo su invito o link — non compaiono nel catalogo pubblico sotto.
        </p>
      </div>

      {empty ? (
        <div className="px-1 py-5 text-center">
          <p className="text-sm text-slate-600 sm:text-base">
            {noPrivateAtAll
              ? 'Non hai ancora viaggi privati disponibili.'
              : 'Nessun viaggio privato con questi filtri.'}
          </p>
          {noPrivateAtAll ? (
            <Button asChild className="mt-4 rounded-full px-6 font-semibold">
              <Link href="/destinazioni">Crea un viaggio privato</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div
          className="relative mt-2 min-h-0"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <ul
            ref={scrollerRef}
            onScroll={measurePages}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          >
            {items.map(({ dest: _d, name: _n, continent: _c, ...item }) => (
              <li
                key={item.ed.id}
                className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
              >
                <EditionCard {...item} compact carousel />
              </li>
            ))}
          </ul>
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Viaggi privati precedenti"
                className="absolute left-0 top-[42%] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-md hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:inline-flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Viaggi privati successivi"
                className="absolute right-0 top-[42%] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-md hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:inline-flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      )}

      <footer className="mt-2.5 shrink-0 border-t border-slate-200/70 pt-3">
        {!empty && pageCount > 1 ? (
          <div className="mb-2.5 flex items-center justify-center gap-2" aria-label="Posizione carosello">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Pagina ${i + 1} di ${pageCount}`}
                aria-current={i === page ? 'true' : undefined}
                onClick={() => scrollToPage(i)}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i === page ? 'w-6 bg-primary shadow-sm' : 'w-2.5 bg-slate-400/90 hover:bg-slate-500'
                )}
              />
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <p className="text-sm text-slate-600">Hai già il link di un viaggio?</p>
          <JoinTripLinkDialog triggerLabel="Inserisci link" inline />
        </div>
      </footer>
    </section>
  );
}
