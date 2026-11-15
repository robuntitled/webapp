import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/accedi',
          '/api/',
          '/onboarding',
          '/completa-registrazione',
          '/pratiche',
          '/pratica/',
          '/dashboard/',
          '/prenota/',
          '/invito/',
          '/dev/',
          '/dev',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
