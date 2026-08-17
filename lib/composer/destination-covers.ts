import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { findDestination } from '@/lib/composer/destinations';

/** Copertine Unsplash per i template seed (Pexels resta la scelta in creazione). */
export const DESTINATION_COVERS: Record<string, string> = {
  thailandia:
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
  giappone:
    'https://images.unsplash.com/photo-1493976040376-739cbbcdd232?auto=format&fit=crop&w=1200&q=80',
  grecia:
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  spagna:
    'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
  portogallo:
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
  croazia:
    'https://images.unsplash.com/photo-1555990793-da11153d385b?auto=format&fit=crop&w=1200&q=80',
  islanda:
    'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=80',
  marocco:
    'https://images.unsplash.com/photo-1489749798305-4bfb49fce963?auto=format&fit=crop&w=1200&q=80',
  dubai:
    'https://images.unsplash.com/photo-1512453979798-5eaedd4ef18b?auto=format&fit=crop&w=1200&q=80',
  'new-york':
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
  messico:
    'https://images.unsplash.com/photo-1518638150340-256906d72aa8?auto=format&fit=crop&w=1200&q=80',
  maldive:
    'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
  sicilia:
    'https://images.unsplash.com/photo-1523906834658-6e24ef23b743?auto=format&fit=crop&w=1200&q=80',
  sardegna:
    'https://images.unsplash.com/photo-1523906834658-6e24ef23b743?auto=format&fit=crop&w=1200&q=80',
  canarie:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  vietnam:
    'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
  australia:
    'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80',
  parigi:
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  londra:
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  amsterdam:
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80',
  kenya:
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
  peru: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&q=80',
  corea:
    'https://images.unsplash.com/photo-1546874177-9e66410726e6?auto=format&fit=crop&w=1200&q=80',
};

export function coverForDestination(idOrLabel: string): string {
  const dest = findDestination(idOrLabel);
  if (dest && DESTINATION_COVERS[dest.id]) return DESTINATION_COVERS[dest.id];
  const key = idOrLabel.trim().toLowerCase();
  return DESTINATION_COVERS[key] ?? DEFAULT_TRIP_IMAGE;
}
