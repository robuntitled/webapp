import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Wordmark Flygetr — senza cornice. Il bianco del JPEG sparisce con mix-blend-multiply. */
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
      ? ({ height: size, width: Math.round(size * 1.42) } as const)
      : undefined;

  return (
    <span
      className={cn(
        'nl-brand-logo relative inline-block shrink-0',
        !responsive && size == null && 'h-11 w-[3.9rem]',
        className
      )}
      style={dimensionStyle}
    >
      <Image
        src="/assets/logoFly.jpeg"
        alt="Flygetr"
        fill
        priority={priority}
        sizes={
          responsive
            ? '(max-width: 768px) 88px, (max-width: 1024px) 104px, 120px'
            : `${Math.round((size ?? 44) * 1.42)}px`
        }
        className="object-contain object-left mix-blend-multiply [filter:drop-shadow(0_1px_8px_rgba(0,0,0,0.28))]"
      />
    </span>
  );
}

export const BRAND_NAME = 'Flygetr';
