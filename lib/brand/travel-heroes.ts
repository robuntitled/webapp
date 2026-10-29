import { coverForDestination } from '@/lib/composer/destination-covers';

/**
 * Hero pubblici: solo foto di viaggio (destinazioni), niente skyline notturni / aurora
 * dei JPG locali in `public/images/heroes/`.
 */
export const TRAVEL_HERO_IMAGES = [
  coverForDestination('thailandia'),
  coverForDestination('grecia'),
  coverForDestination('bali'),
  coverForDestination('vietnam'),
  coverForDestination('portogallo'),
  coverForDestination('spagna'),
] as const;
