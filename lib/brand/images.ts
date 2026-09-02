/**
 * Percorsi media canonici — sostituisci i file mantenendo lo stesso nome.
 *
 * ## Immagini di sfondo (hero)
 * 1. Carica JPG/WebP in `public/images/heroes/` (consigliato 1920×1080+, landscape).
 * 2. Aggiorna l’array `slideshow` qui sotto (o sostituisci i file esistenti a parità di nome).
 * 3. Le pagine login, Destinazioni, Unisciti e onboarding usano questi path via `HeroBackground`.
 *
 * ## Video
 * Puoi aggiungere slide video MP4/WebM nell’array `slideshow`:
 * `{ type: 'video', src: '/images/heroes/nome.mp4', poster: '/images/heroes/nome-poster.jpg' }`
 * Il poster è l’immagine mostrata finché il video non è pronto (e con reduced-motion).
 */

export type HeroSlide =
  | string
  | {
      type: 'video';
      src: string;
      /** Anteprima statica (consigliata). */
      poster?: string;
    };

export const BRAND_IMAGES = {
  heroes: {
    login: '/images/heroes/hero-login.jpg',
    dashboard: '/images/heroes/hero-dashboard.jpg',
    slideshow: [
      '/images/heroes/hero-login.jpg',
      '/images/heroes/hero-02.jpg',
      '/images/heroes/hero-03.jpg',
      '/images/heroes/hero-04.jpg',
      '/images/heroes/hero-05.jpg',
      '/images/heroes/hero-06.jpg',
    ] satisfies HeroSlide[],
  },
  trips: {
    placeholder: '/images/trips/placeholder.jpg',
  },
} as const;

export const DEFAULT_TRIP_IMAGE = BRAND_IMAGES.trips.placeholder;