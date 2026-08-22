'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScrollParallax } from '@/hooks/useScrollParallax';

type HeroBackgroundProps = {
  images: readonly string[];
  alt?: string;
  overlay?: 'light' | 'dark' | 'gradient' | 'photo';
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
    light: 'bg-[var(--color-bg)]/85',
    dark: 'bg-stone-950/50',
    gradient: 'bg-[var(--color-bg)]/85',
    photo: 'bg-gradient-to-r from-stone-950/70 via-stone-950/35 to-transparent',
  }[overlay];

  const useParallax = parallax && !reduced;
  const jsParallaxTransform =
    useParallax && !cssParallax
      ? `translate3d(0, ${parallaxStyle.y}px, 0)`
      : undefined;

  return (
    <div
      className={cn(
        'absolute inset-0 -z-10 overflow-hidden bg-[#0b1220]',
        useParallax && cssParallax && 'nl-scroll-parallax-hero',
        className
      )}
    >
      {images.map((src, i) => {
        const active = i === index;
        return (
          <div
            key={src}
            className={cn(
              'absolute inset-0 transition-opacity duration-[2000ms] ease-in-out',
              active ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden={!active}
          >
            {/* Riempie i bordi su viewport alti/stretti senza zoomare il soggetto. */}
            <Image
              src={src}
              alt=""
              fill
              priority={i === 0}
              quality={50}
              sizes="100vw"
              className="scale-110 object-cover blur-2xl brightness-[0.55] saturate-125"
            />
            {/* Foto completa su schermi alti; cover solo se il viewport è abbastanza largo. */}
            <Image
              src={src}
              alt={active ? alt : ''}
              fill
              priority={i === 0}
              quality={85}
              sizes="100vw"
              className={cn(
                'nl-hero-slide object-center will-change-transform',
                active && 'nl-hero-slide-active'
              )}
              style={active && jsParallaxTransform ? { transform: jsParallaxTransform } : undefined}
            />
          </div>
        );
      })}
      <div className={cn('absolute inset-0', overlayClass)} />
    </div>
  );
}
