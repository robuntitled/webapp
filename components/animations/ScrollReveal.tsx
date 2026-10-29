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
 * Fade-in progressivo: contenuto VISIBILE di default (SSR, screenshot, no-JS).
 * L'animazione parte solo dopo mount + IntersectionObserver, con prefers-reduced-motion.
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
  const [visible, setVisible] = useState(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      setAnimate(false);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
          return;
        }
        // Solo se fuori viewport: prepara l'ingresso (mai opacity-0 prima del mount).
        setAnimate(true);
        setVisible(false);
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  const delayMs = Math.min(stagger, 6) * 70;
  const y = variant === 'title' ? 20 : variant === 'card' ? 14 : 8;

  const style: CSSProperties | undefined =
    animate && !reduced
      ? {
          opacity: visible ? 1 : 0.01,
          transform: visible ? 'translate3d(0,0,0)' : `translate3d(0, ${y}px, 0)`,
          transition: `opacity 520ms ease ${delayMs}ms, transform 520ms ease ${delayMs}ms`,
        }
      : undefined;

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement & HTMLLIElement & HTMLElement>}
      className={cn('opacity-100', className)}
      style={style}
    >
      {children}
    </Tag>
  );
}
