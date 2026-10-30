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
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Nuova IA Noivia
      { source: '/destinazioni', destination: '/organizza', permanent: false },
      { source: '/partenze', destination: '/gruppi', permanent: false },
      { source: '/punti', destination: '/organizza', permanent: true },
      { source: '/dashboard/punti', destination: '/pratiche', permanent: true },
      { source: '/dashboard/cashback', destination: '/pratiche', permanent: true },
      { source: '/dashboard', destination: '/organizza', permanent: true },
      { source: '/dashboard/cerca', destination: '/organizza', permanent: true },
      { source: '/dashboard/crea', destination: '/organizza', permanent: true },
      { source: '/dashboard/miei-viaggi', destination: '/pratiche', permanent: true },
      { source: '/prenota/voli/ricerca', destination: '/prenota/voli', permanent: true },
      { source: '/viaggi/:id', destination: '/pratiche', permanent: true },
      { source: '/viaggi/:id/prenota', destination: '/pratiche', permanent: true },
      { source: '/edizione/:id', destination: '/partenze/:id', permanent: true },
      { source: '/itinerario/:slug/partenze', destination: '/gruppi', permanent: true },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Evita richieste _next/image a w=3840 (spesso 400 / inutili su hero).
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
      // Cover mete per-paese (Wikimedia Commons)
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
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