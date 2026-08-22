import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { findDestination } from '@/lib/composer/destinations';
import { GENERATED_DESTINATION_COVERS } from '@/lib/composer/destination-covers.generated';

/** Copertine Unsplash per i template seed (Pexels resta la scelta in creazione). */
export const DESTINATION_COVERS: Record<string, string> = {
  thailandia:
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
  giappone:
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
  grecia:
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  spagna:
    'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
  portogallo:
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
  croazia:
    'https://images.unsplash.com/photo-1509840841025-9088ba78a826?auto=format&fit=crop&w=1200&q=80',
  islanda:
    'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=80',
  marocco:
    'https://images.unsplash.com/photo-1489493887464-892be6d1daae?auto=format&fit=crop&w=1200&q=80',
  dubai:
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
  'new-york':
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
  messico:
    'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1200&q=80',
  maldive:
    'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
  sicilia:
    'https://images.unsplash.com/photo-1523365154888-8a758819b722?auto=format&fit=crop&w=1200&q=80',
  sardegna:
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
  canarie:
    'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1200&q=80',
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
    'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80',
  francia:
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
  germania:
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
  cina: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80',
  india:
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
  brasile:
    'https://images.unsplash.com/photo-1516211881327-e5120a941edc?auto=format&fit=crop&w=1200&q=80',
  italia:
    'https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=1200&q=80',
  'stati-uniti':
    'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=1200&q=80',
  'nuova-zelanda':
    'https://images.unsplash.com/photo-1469521669194-babb45599def?auto=format&fit=crop&w=1200&q=80',
  egitto:
    'https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1200&q=80',
  turchia:
    'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80',
  indonesia:
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80',
  'sri-lanka':
    'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=1200&q=80',
  uzbekistan:
    'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=80',
  filippine:
    'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
  malesia:
    'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80',
  cambogia:
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
  nepal:
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
  georgia:
    'https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=1200&q=80',
  albania:
    'https://images.unsplash.com/photo-1596484552834-6a58f850bb0b?auto=format&fit=crop&w=1200&q=80',
  lapponia:
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1200&q=80',
  baleari:
    'https://images.unsplash.com/photo-1518656307425-e47778b3ba05?auto=format&fit=crop&w=1200&q=80',
  azzorre:
    'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=80',
  'cammino-santiago':
    'https://images.unsplash.com/photo-1578306376271-47980ce7c9b1?auto=format&fit=crop&w=1200&q=80',
  inghilterra:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  scozia:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
  danimarca:
    'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=80',
  'faer-oer':
    'https://images.unsplash.com/photo-1527004013197-933c4bb611b5?auto=format&fit=crop&w=1200&q=80',
  olanda:
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1200&q=80',
  'repubblica-ceca':
    'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1200&q=80',
  giordania:
    'https://images.unsplash.com/photo-1548786746-1c48c0f8d6c4?auto=format&fit=crop&w=1200&q=80',
  sudafrica:
    'https://images.unsplash.com/photo-1484318571209-661cf29a69c3?auto=format&fit=crop&w=1200&q=80',
  namibia:
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80',
  oman:
    'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80',
  madagascar:
    'https://images.unsplash.com/photo-1621419816163-0f2cb72a1b1b?auto=format&fit=crop&w=1200&q=80',
  'emirati-arabi':
    'https://images.unsplash.com/photo-1512453979798-5e85decdb7c0?auto=format&fit=crop&w=1200&q=80',
  'capo-verde':
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  zanzibar:
    'https://images.unsplash.com/photo-1586861635167-e5223aadc9cf?auto=format&fit=crop&w=1200&q=80',
  uganda:
    'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80',
  tanzania:
    'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=1200&q=80',
  canada:
    'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80',
  colombia:
    'https://images.unsplash.com/photo-1536323760109-ca8c07450053?auto=format&fit=crop&w=1200&q=80',
  argentina:
    'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=1200&q=80',
  guatemala:
    'https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&w=1200&q=80',
  patagonia:
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1200&q=80',
  jamaica:
    'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1200&q=80',
  belize:
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
  fiji:
    'https://images.unsplash.com/photo-1437719417032-859c46eef3a3?auto=format&fit=crop&w=1200&q=80',
};

function unsplashPhotoId(url: string): string {
  const m = url.match(/photo-([a-z0-9-]+)/i);
  return (m?.[1] ?? url).toLowerCase();
}

function uniqueByPhotoId(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const id = unsplashPhotoId(url);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(url);
  }
  return out;
}

/** Mappa destinazione → copertina, senza URL duplicati tra mete. */
const UNIQUE_DESTINATION_COVERS: Record<string, string> = (() => {
  const used = new Set<string>();
  const out: Record<string, string> = {};
  for (const [slug, url] of Object.entries(DESTINATION_COVERS)) {
    const id = unsplashPhotoId(url);
    if (used.has(id)) continue;
    used.add(id);
    out[slug] = url;
  }
  return out;
})();

const PRIMARY_PHOTO_IDS = new Set(
  Object.values(UNIQUE_DESTINATION_COVERS).map(unsplashPhotoId)
);

export function coverForDestination(idOrLabel: string): string {
  const dest = findDestination(idOrLabel);
  const key = (dest?.id ?? idOrLabel).trim().toLowerCase();
  if (UNIQUE_DESTINATION_COVERS[key]) return UNIQUE_DESTINATION_COVERS[key];
  if (dest && UNIQUE_DESTINATION_COVERS[dest.id]) return UNIQUE_DESTINATION_COVERS[dest.id];

  const generated =
    (dest && GENERATED_DESTINATION_COVERS[dest.id]) || GENERATED_DESTINATION_COVERS[key];
  if (generated && !PRIMARY_PHOTO_IDS.has(unsplashPhotoId(generated))) {
    return generated;
  }
  return UNIQUE_DESTINATION_COVERS.thailandia ?? DEFAULT_TRIP_IMAGE;
}

const DESTINATION_POOLS: Record<string, string[]> = {
  thailandia: uniqueByPhotoId([
    UNIQUE_DESTINATION_COVERS.thailandia,
    'https://images.unsplash.com/photo-1528183429752-a91b0c5b0e6d?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1476512269419-b193e1ed1a87?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1400&q=80',
  ]).filter((url) => {
    const id = unsplashPhotoId(url);
    if (unsplashPhotoId(UNIQUE_DESTINATION_COVERS.thailandia ?? '') === id) return true;
    return !PRIMARY_PHOTO_IDS.has(id);
  }),
};

function destinationCoverPool(slug: string): string[] {
  const key = slug.trim().toLowerCase();
  const dest = findDestination(key);
  const id = dest?.id ?? key;
  const pool = DESTINATION_POOLS[id];
  if (pool?.length) return pool;
  const primary = coverForDestination(id);
  return [primary];
}

/** Stessa meta, date diverse: foto diverse dal pool della destinazione. Mai foto di un’altra meta. */
export function uniqueCover(seed: string, index = 0): string {
  const pool = destinationCoverPool(seed);
  return pool[index % pool.length] ?? coverForDestination(seed);
}

/** Una foto per slug, mai due slug con lo stesso URL. */
export function uniqueCoversForSlugs(slugs: string[]): string[] {
  const used = new Set<string>();
  return slugs.map((slug, i) => {
    const pool = destinationCoverPool(slug);
    const pick =
      pool.find((url) => !used.has(unsplashPhotoId(url))) ??
      coverForDestination(slug);
    used.add(unsplashPhotoId(pick));
    return pick;
  });
}
