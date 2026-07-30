'use client';

import { useRef, useEffect, useState, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScrollProgress } from '@/hooks/useScrollProgress';

type ScrollRevealVariant = 'title' | 'card' | 'decor';

type ScrollRevealProps = {
  children: ReactNode;
  variant?: ScrollRevealVariant;
  /** Stagger index for cards (0-based). */
  stagger?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
};

const VARIANT = {
  title: { y: 28, className: 'nl-scroll-reveal-title' },
  card: { y: 16, className: 'nl-scroll-reveal-card' },
  decor: { y: 10, className: 'nl-scroll-reveal-decor' },
} as const;

function supportsViewTimeline() {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'view()');
}

export function ScrollReveal({
  children,
  variant = 'title',
  stagger = 0,
  className,
  as: Tag = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [cssDriven, setCssDriven] = useState(true);
  const progress = useScrollProgress(ref, {
    start: 0.94 - stagger * 0.02,
    end: 0.62 - stagger * 0.02,
    enabled: !reduced && !cssDriven,
  });

  useEffect(() => {
    setCssDriven(supportsViewTimeline());
  }, []);

  const config = VARIANT[variant];

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  if (cssDriven) {
    return (
      <Tag
        ref={ref as Ref<HTMLDivElement & HTMLLIElement & HTMLElement>}
        className={cn(config.className, className)}
        data-stagger={stagger > 0 ? stagger : undefined}
        style={stagger > 0 ? ({ ['--nl-stagger' as string]: stagger } as React.CSSProperties) : undefined}
      >
        {children}
      </Tag>
    );
  }

  const y = config.y * (1 - progress);
  const opacity = 0.15 + progress * 0.85;

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement & HTMLLIElement & HTMLElement>}
      className={cn('nl-scroll-reveal-fallback', className)}
      style={{
        opacity,
        transform: `translate3d(0, ${y}px, 0)`,
      }}
    >
      {children}
    </Tag>
  );
}
