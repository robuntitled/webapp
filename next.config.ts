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
  // Post foto (FormData) — default Next = 1 MB, troppo basso per l'MVP social
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async redirects() {
    // IA v1.1 — path legacy → canonici (query string preservata)
    return [
      { source: '/dashboard', destination: '/scopri', permanent: false },
      { source: '/dashboard/cerca', destination: '/scopri/cerca', permanent: false },
      { source: '/dashboard/crea', destination: '/organizza', permanent: false },
      { source: '/dashboard/miei-viaggi', destination: '/i-miei', permanent: false },
      { source: '/dashboard/preferiti', destination: '/preferiti', permanent: false },
      { source: '/dashboard/profilo', destination: '/profilo', permanent: false },
      { source: '/dashboard/impostazioni', destination: '/impostazioni', permanent: false },
      { source: '/dashboard/costi', destination: '/costi', permanent: false },
      { source: '/dashboard/bacheca', destination: '/scopri', permanent: false },
    ];
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
      // Viator / Tripadvisor CDN
      {
        protocol: 'https',
        hostname: 'media.tacdn.com',
      },
      {
        protocol: 'https',
        hostname: 'hare-media-cdn.tripadvisor.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;