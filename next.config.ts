import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // geolocation=(self): indispensabile per "Usa la mia posizione" nel composer.
    // Non usare geolocation=() — il browser nega senza prompt.
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DEFAULT_ORIGIN_IATA:
      process.env.NEXT_PUBLIC_DEFAULT_ORIGIN_IATA ||
      process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA ||
      'ROM',
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      // --- AGGIUNGI QUESTO BLOCCO ---
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      // LiteAPI / Cupid hotel photos
      {
        protocol: 'https',
        hostname: 'static.cupid.travel',
      },
    ],
  },
};

export default nextConfig;