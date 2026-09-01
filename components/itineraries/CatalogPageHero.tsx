import type { ReactNode } from 'react';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { cn } from '@/lib/utils';

export function CatalogPageHero({
  title,
  subtitle,
  search,
  compact = false,
}: {
  title: string;
  subtitle: string;
  search: ReactNode;
  /** Meno altezza — utile su Unisciti per mostrare subito il contenuto sotto. */
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        'relative isolate flex flex-col overflow-visible',
        compact
          ? 'min-h-[13.75rem] h-[min(18vh,14.75rem)] sm:min-h-[14.25rem] sm:h-[min(20vh,15.25rem)]'
          : 'min-h-[16.7rem] h-[min(22vh,17.8rem)] sm:min-h-[17.55rem] sm:h-[min(24vh,19rem)] md:h-[min(25vh,19.55rem)]'
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        <HeroBackground
          images={BRAND_IMAGES.heroes.slideshow}
          overlay="dark"
          className="!z-0"
          intervalMs={6500}
        />
      </div>

      <div
        className={cn(
          'absolute inset-x-0 top-0 z-10 flex items-center justify-center px-4 text-center',
          compact ? 'bottom-[1.85rem] sm:bottom-[2rem]' : 'bottom-[2rem] sm:bottom-[2.125rem]'
        )}
      >
        <div>
          <h1 className="max-w-3xl font-display text-[clamp(1.35rem,1.05rem+1.1vw,2.15rem)] font-semibold leading-[1.15] tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
            {title}
          </h1>
          <p className="mx-auto mt-1.5 max-w-2xl text-[clamp(0.88rem,0.82rem+0.25vw,1.05rem)] leading-snug text-white/92 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
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
