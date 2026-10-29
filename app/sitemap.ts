import type { MetadataRoute } from 'next';
import { PUBLISHED_TEMPLATES } from '@/lib/itineraries/catalog';
import { itineraryPath } from '@/lib/itineraries/params';

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${siteUrl}/destinazioni`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/partenze`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${siteUrl}/termini`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${siteUrl}/cookie`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  const itineraryEntries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const t of PUBLISHED_TEMPLATES) {
    const base = `${siteUrl}${itineraryPath(t.destination_slug)}`;
    const withDuration = `${siteUrl}${itineraryPath(t.destination_slug, t.duration_days)}`;
    itineraryEntries.set(base, {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
    itineraryEntries.set(withDuration, {
      url: withDuration,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return [...staticRoutes, ...itineraryEntries.values()];
}
