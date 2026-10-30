import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';

/**
 * Wordmark Noivia — SVG con path (Plus Jakarta ExtraBold convertito),
 * indipendente dal font runtime. Route coral/lilac sopra le ı.
 */
export const LOGO_RATIO = 3.3;

export function BrandLogo({
  size,
  responsive = false,
  className,
  priority = false,
  elevated = false,
  variant = 'default',
}: {
  size?: number;
  responsive?: boolean;
  className?: string;
  priority?: boolean;
  elevated?: boolean;
  variant?: 'default' | 'white';
}) {
  const height = size ?? (responsive ? undefined : 44);
  const width =
    height != null ? Math.round(height * LOGO_RATIO) : undefined;
  const src =
    variant === 'white'
      ? '/assets/logoNoivia-white.svg'
      : '/assets/logoNoivia.svg';

  return (
    <span
      className={cn(
        'nl-brand-logo relative inline-block shrink-0',
        !responsive && size == null && 'h-11 w-[9rem]',
        className
      )}
      style={
        height != null
          ? ({ height, width: width ?? Math.round(height * LOGO_RATIO) } as const)
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={BRAND_NAME}
        width={width ?? 145}
        height={height ?? 44}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        className={cn(
          'h-full w-full object-contain object-left',
          elevated && 'drop-shadow-[0_1px_8px_rgba(0,0,0,0.22)]'
        )}
      />
    </span>
  );
}

export { BRAND_NAME } from '@/lib/brand';
