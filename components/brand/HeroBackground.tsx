'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type HeroBackgroundProps = {
  images: readonly string[];
  alt?: string;
  overlay?: 'light' | 'dark' | 'gradient';
  className?: string;
  intervalMs?: number;
};

export function HeroBackground({
  images,
  alt = 'Paesaggio di viaggio',
  overlay = 'gradient',
  className,
  intervalMs = 8000,
}: HeroBackgroundProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  const overlayClass = {
    light: 'bg-white/40',
    dark: 'bg-slate-950/65',
    gradient: 'bg-gradient-to-b from-slate-950/75 via-slate-950/50 to-slate-950/80',
  }[overlay];

  return (
    <div className={cn('absolute inset-0 -z-10 overflow-hidden', className)}>
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
            'object-cover transition-opacity duration-[2000ms] ease-in-out',
            i === index ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}
      <div className={cn('absolute inset-0', overlayClass)} />
    </div>
  );
}