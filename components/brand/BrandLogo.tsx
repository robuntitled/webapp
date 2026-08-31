import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGO_W = 952;
const LOGO_H = 389;
const RATIO = LOGO_W / LOGO_H;

/** Logo flygetr — wordmark orizzontale su sfondo trasparente. */
export function BrandLogo({
  size,
  responsive = false,
  className,
  priority = false,
}: {
  /** Altezza in px (la larghezza segue il rapporto del wordmark). */
  size?: number;
  /** Navbar: 32px mobile → 36px tablet → 40px desktop */
  responsive?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const height = size ?? 36;

  return (
    <Image
      src="/assets/flygetr-logo.png"
      alt="flygetr"
      width={LOGO_W}
      height={LOGO_H}
      priority={priority}
      sizes={
        responsive
          ? '(max-width: 768px) 80px, (max-width: 1024px) 90px, 100px'
          : `${Math.round(height * RATIO)}px`
      }
      className={cn(
        'w-auto object-contain',
        responsive ? 'h-8 md:h-9 lg:h-10' : undefined,
        className
      )}
      style={responsive ? undefined : { height }}
    />
  );
}

export const BRAND_NAME = 'Bradigo';
