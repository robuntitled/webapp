import type { MetadataRoute } from 'next';

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
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
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
