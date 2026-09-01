import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Logo Flygetr — rotondo, object-cover + leggero zoom per tagliare i bordi bianchi. */
export function BrandLogo({
  size,
  responsive = false,
  className,
  priority = false,
}: {
  size?: number;
  /** Navbar: 52px mobile → 60px tablet → 64px desktop */
  responsive?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const dimensionStyle =
    size != null ? ({ width: size, height: size } as const) : undefined;

  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-white/80',
        responsive
          ? 'h-[3.25rem] w-[3.25rem] md:h-[3.75rem] md:w-[3.75rem] lg:h-16 lg:w-16'
          : 'h-12 w-12',
        className
      )}
      style={dimensionStyle}
    >
      <Image
        src="/assets/logoFly.jpeg"
        alt="Flygetr"
        fill
        priority={priority}
        sizes={responsive ? '(max-width: 768px) 52px, (max-width: 1024px) 60px, 64px' : `${size ?? 48}px`}
        className="scale-110 object-cover object-center"
      />
    </span>
  );
}

export const BRAND_NAME = 'Flygetr';
