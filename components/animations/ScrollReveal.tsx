'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

type ScrollRevealVariant = 'title' | 'card' | 'decor';

type ScrollRevealProps = {
  children: ReactNode;
  variant?: ScrollRevealVariant;
  /** Stagger index for cards (0-based). */
  stagger?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
};

/**
 * One-shot fade-in when the element enters the viewport.
 * Avoids view-timeline animations that can leave content stuck at low opacity.
 */
export function ScrollReveal({
  children,
  variant = 'title',
  stagger = 0,
  className,
  as: Tag = 'div',
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  const delayMs = Math.min(stagger, 6) * 70;
  const y = variant === 'title' ? 20 : variant === 'card' ? 14 : 8;

  const style: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate3d(0,0,0)' : `translate3d(0, ${y}px, 0)`,
    transition: `opacity 520ms ease ${delayMs}ms, transform 520ms ease ${delayMs}ms`,
  };

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement & HTMLLIElement & HTMLElement>}
      className={cn(className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
