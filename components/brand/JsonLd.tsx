import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TAGLINE,
  getSiteUrl,
} from '@/lib/brand';

/**
 * Organization + WebSite JSON-LD (no Offer / price markup).
 */
export function BrandJsonLd() {
  const siteUrl = getSiteUrl();
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: siteUrl,
    logo: `${siteUrl}/assets/logoNoivia.svg`,
    description: BRAND_DESCRIPTION,
    slogan: BRAND_TAGLINE,
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: siteUrl,
    description: BRAND_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: siteUrl,
    },
    inLanguage: 'it-IT',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
