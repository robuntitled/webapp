import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/brand';
import { listJoinableEditions } from '@/lib/data/editions';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${siteUrl}/organizza`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/gruppi`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
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

  // Solo URL pubblici reali (niente /destinazioni, /partenze index, /itinerario → redirect).
  let departureRoutes: MetadataRoute.Sitemap = [];
  try {
    const editions = await listJoinableEditions();
    departureRoutes = editions
      .filter((e) => e.edition_type === 'official' && !String(e.id).startsWith('seed-'))
      .map((e) => ({
        url: `${siteUrl}/partenze/${e.id}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
  } catch {
    departureRoutes = [];
  }

  return [...staticRoutes, ...departureRoutes];
}
