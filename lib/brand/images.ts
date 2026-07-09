/**
 * Percorsi immagini canonici — sostituisci i file mantenendo lo stesso nome.
 *
 * heroes/     → sfondi login, dashboard, carousel
 * trips/      → placeholder card viaggio
 * trips/{slug}/ → (futuro) foto per destinazione, es. trips/thailandia/cover.jpg
 */

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
    ],
  },
  trips: {
    placeholder: '/images/trips/placeholder.jpg',
  },
} as const;

export const DEFAULT_TRIP_IMAGE = BRAND_IMAGES.trips.placeholder;