import 'server-only';

import { searchPexelsImages } from '@/actions/images';

export async function pickTripCoverImage(destination: string): Promise<string | null> {
  const query = destination.split('·')[0]?.trim() || destination;
  if (!query) return null;

  try {
    const page = Math.floor(Math.random() * 4) + 1;
    const images = await searchPexelsImages(`${query} travel landscape`, page);
    if (!images.length) return null;
    const pick = images[Math.floor(Math.random() * images.length)];
    return pick.urls.regular;
  } catch {
    return null;
  }
}