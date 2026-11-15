import type { Metadata } from 'next';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { BRAND_NAME, getSiteUrl } from '@/lib/brand';

const DEFAULT_OG = BRAND_IMAGES.heroes.home;
/** Brand OG 1200×630 from deep-review mockup (copied to public). */
const SITE_OG = '/brand/og-noivia-1200x630.png';

export const BASE_OG = {
  siteName: BRAND_NAME,
  locale: 'it_IT' as const,
  type: 'website' as const,
  images: [
    {
      url: SITE_OG,
      width: 1200,
      height: 630,
      alt: 'Noivia — organizza il viaggio o unisciti a un gruppo',
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

/** Title + description + OG + Twitter in one place (seo-copy P1-7 / P1-23). */
export function pageMetadata(opts: {
  path: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
  ogImage?: string;
}): Metadata {
  const og = pageOpenGraph(opts.path, opts.title, opts.description);
  const image = opts.ogImage ?? SITE_OG;
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: {
      canonical: `${getSiteUrl()}${opts.path.startsWith('/') ? opts.path : `/${opts.path}`}`,
    },
    ...(opts.noIndex
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph: {
      ...og,
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

/** Fallback hero still available for destination pages. */
export const HERO_OG_FALLBACK = DEFAULT_OG;
