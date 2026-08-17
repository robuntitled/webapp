'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScrollParallax } from '@/hooks/useScrollParallax';

type HeroBackgroundProps = {
  images: readonly string[];
  alt?: string;
  overlay?: 'light' | 'dark' | 'gradient';
  className?: string;
  intervalMs?: number;
  /** Scroll-linked parallax on the hero imagery. */
  parallax?: boolean;
};

export function HeroBackground({
  images,
  alt = 'Paesaggio di viaggio',
  overlay = 'gradient',
  className,
  intervalMs = 8000,
  parallax = false,
}: HeroBackgroundProps) {
  const [index, setIndex] = useState(0);
  const [cssParallax, setCssParallax] = useState(false);
  const reduced = usePrefersReducedMotion();
  const parallaxStyle = useScrollParallax(parallax && !reduced && !cssParallax);

  useEffect(() => {
    setCssParallax(
      typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()')
    );
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  const overlayClass = {
    light: 'bg-white/40',
    dark: 'bg-slate-950/78',
    // Più opaco: evita titoli/testi scuri illeggibili sopra le foto
    gradient:
      'bg-gradient-to-b from-slate-950/92 via-slate-950/80 to-[#070b12]/96',
  }[overlay];

  const useParallax = parallax && !reduced;
  const jsParallaxTransform =
    useParallax && !cssParallax
      ? `translate3d(0, ${parallaxStyle.y}px, 0) scale(${parallaxStyle.scale})`
      : undefined;

  return (
    <div
      className={cn(
        'absolute inset-0 -z-10 overflow-hidden',
        useParallax && cssParallax && 'nl-scroll-parallax-hero',
        className
      )}
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          priority={i === 0}
          quality={85}
          sizes="100vw"
          className={cn(
            'nl-hero-slide object-cover transition-opacity duration-[2000ms] ease-in-out will-change-transform',
            i === index ? 'opacity-100 nl-hero-slide-active' : 'opacity-0'
          )}
          style={
            i === index && jsParallaxTransform
              ? { transform: jsParallaxTransform }
              : undefined
          }
        />
      ))}
      <div className={cn('absolute inset-0', overlayClass)} />
    </div>
  );
}