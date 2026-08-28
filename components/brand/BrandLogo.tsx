import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Logo Bradigo — rotondo, object-cover + leggero zoom per tagliare i bordi bianchi. */
export function BrandLogo({
  size = 48,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full shadow-sm ring-2 ring-white/80',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/assets/logoBradigo.jpeg"
        alt="Bradigo"
        fill
        priority={priority}
        sizes={`${size}px`}
        className="scale-110 object-cover object-center"
      />
    </span>
  );
}

export const BRAND_NAME = 'Bradigo';
