import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA:
      process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA || 'ROM',
    /** White Label Aviasales — override con env su Vercel se cambi wl_id */
    NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID: process.env.NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID || '19658',
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
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
      // -----------------------------
    ],
  },
};

export default nextConfig;