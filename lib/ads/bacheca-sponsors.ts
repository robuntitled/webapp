import { BRAND_IMAGES } from '@/lib/brand/images';
import type { SponsoredCreative } from '@/lib/ads/types';

/**
 * Creatività native per la bacheca.
 * Preferisci link interni /prenota (affiliate) rispetto a banner esterni.
 * Aggiungi o riordina voci senza toccare il feed.
 */
export const BACHECA_SPONSORS: SponsoredCreative[] = [
  {
    id: 'nl-taxi',
    advertiser: 'NomadLink · Taxi',
    headline: 'Transfer aeroporto senza stress',
    body: 'Confronta i prezzi e prenota un taxi privato con prezzo fisso prima di arrivare.',
    cta: 'Prenota transfer',
    href: '/prenota/trasporti/taxi',
    imageUrl: BRAND_IMAGES.heroes.slideshow[1] ?? BRAND_IMAGES.heroes.dashboard,
    avatarInitial: 'T',
  },
  {
    id: 'nl-treni',
    advertiser: 'NomadLink · Treni',
    headline: 'Treni e bus in Europa',
    body: 'Cerca collegamenti e biglietti in un click. Ideale per spostarti tra città senza voli.',
    cta: 'Cerca treni',
    href: '/prenota/trasporti/treni',
    imageUrl: BRAND_IMAGES.heroes.slideshow[2] ?? BRAND_IMAGES.heroes.dashboard,
    avatarInitial: 'R',
  },
  {
    id: 'nl-bus',
    advertiser: 'NomadLink · Bus',
    headline: 'Viaggia low cost in bus',
    body: 'Confronta le tratte bus e parti quando vuoi. Perfetto per itinerari flessibili.',
    cta: 'Cerca bus',
    href: '/prenota/trasporti/bus',
    imageUrl: BRAND_IMAGES.heroes.slideshow[3] ?? BRAND_IMAGES.heroes.dashboard,
    avatarInitial: 'B',
  },
  {
    id: 'nl-viaggio',
    advertiser: 'NomadLink',
    headline: 'Organizza il prossimo viaggio',
    body: 'Crea un viaggio, invita i compagni e tieni tutto — tappe, chat e foto — in un unico posto.',
    cta: 'Crea viaggio',
    href: '/dashboard/crea?new=1',
    imageUrl: BRAND_IMAGES.heroes.slideshow[4] ?? BRAND_IMAGES.trips.placeholder,
    avatarInitial: 'N',
  },
];

/** Dopo quanti post mostrare il primo ad (mai nei primi 2). */
export const BACHECA_AD_FIRST_AFTER = 3;

/** Un ad ogni N post dopo il primo. */
export const BACHECA_AD_EVERY = 7;
