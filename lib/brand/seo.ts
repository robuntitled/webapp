import { BRAND_IMAGES } from '@/lib/brand/images';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';

const DEFAULT_OG = BRAND_IMAGES.heroes.home;

export const BASE_OG = {
  siteName: BRAND_NAME,
  locale: 'it_IT' as const,
  type: 'website' as const,
  images: [
    {
      url: DEFAULT_OG,
      width: 1920,
      height: 1329,
      alt: 'Paesaggio di viaggio — Noivia',
    },
  ],
};

export function pageOpenGraph(path: string, title: string, description: string) {
  const url = `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  return {
    title,
    description,
    url,
    ...BASE_OG,
  };
}
