import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Wordmark crop 955×366. */
export const LOGO_RATIO = 2.61;

/** Wordmark Flygetr — PNG con alpha, senza cornice. */
export function BrandLogo({
  size,
  responsive = false,
  className,
  priority = false,
}: {
  size?: number;
  /** Navbar: altezza guidata da --nl-logo-h (hero → collapsed). */
  responsive?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const dimensionStyle =
    size != null
      ? ({ height: size, width: Math.round(size * LOGO_RATIO) } as const)
      : undefined;

  return (
    <span
      className={cn(
        'nl-brand-logo relative inline-block shrink-0',
        !responsive && size == null && 'h-11 w-[7.2rem]',
        className
      )}
      style={dimensionStyle}
    >
      <Image
        src="/assets/logoFlygetr.png"
        alt="Flygetr"
        fill
        priority={priority}
        sizes={
          responsive
            ? '(max-width: 768px) 160px, (max-width: 1024px) 200px, 240px'
            : `${Math.round((size ?? 44) * LOGO_RATIO)}px`
        }
        className="object-contain object-center drop-shadow-[0_1px_10px_rgba(0,0,0,0.28)]"
      />
    </span>
  );
}

export const BRAND_NAME = 'Flygetr';
