'use client';

import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

/** Slideshow foto brand dietro le pagine itinerario / partenze / viaggi. */
export function SlideshowWash() {
  return (
    <HeroBackground
      images={BRAND_IMAGES.heroes.slideshow}
      overlay="photo"
      className="z-0"
    />
  );
}
