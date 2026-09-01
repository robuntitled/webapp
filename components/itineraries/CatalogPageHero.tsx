'use client';

import { useEffect, type ReactNode } from 'react';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

export function CatalogPageHero({
  title,
  subtitle,
  search,
}: {
  title: string;
  subtitle: string;
  search: ReactNode;
}) {
  useEffect(() => {
    window.dispatchEvent(new Event('nl-hero-change'));
    return () => window.dispatchEvent(new Event('nl-hero-change'));
  }, []);

  return (
    <section
      data-nl-hero
      className="relative isolate flex min-h-[21rem] flex-col overflow-visible -mt-[var(--nl-nav-height)] h-[min(54vh,34rem)] pt-[var(--nl-nav-height)] sm:min-h-[25rem] sm:h-[min(60vh,40rem)] md:h-[min(64vh,44rem)]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <HeroBackground
          images={BRAND_IMAGES.heroes.slideshow}
          overlay="dark"
          className="!z-0"
          intervalMs={6500}
        />
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-3 px-0 pb-16 pt-6 text-center sm:gap-4 sm:pb-[4.5rem] sm:pt-10 md:gap-5 md:pt-12">
        <div className="nl-page w-full">
          <h1 className="font-display text-[clamp(1.7rem,1.05rem+2.6vw,3.4rem)] font-semibold leading-[1.15] tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[clamp(1.02rem,0.92rem+0.42vw,1.32rem)] leading-relaxed text-white/92 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)] sm:mt-4">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-1/2">
        <div className="nl-page pointer-events-auto w-full">{search}</div>
      </div>
    </section>
  );
}
