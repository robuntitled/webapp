import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/app/providers';
import { auth } from '@/auth';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { Footer } from '@/components/layout/Footer';
import { getCompanyProfile } from '@/lib/privacy/company';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand/noivia';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

// UI brand = Noivia. LEGAL_* / domini restano env (TODO cutover — vedi BRAND_TODO).
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? BRAND_NAME;
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${appName} — ${BRAND_TAGLINE}`,
    template: `%s — ${appName}`,
  },
  description:
    'Scegli la meta, le date e con chi partire. Itinerario pronto, chat del viaggio, voli e hotel prenotati da te — senza tour operator.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: '/icons/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: appName,
    title: `${appName} — ${BRAND_TAGLINE}`,
    description:
      'Organizza il tuo viaggio o unisciti a un gruppo. Ognuno prenota voli e hotel per conto proprio.',
    images: [{ url: '/images/heroes/hero-login.jpg', width: 1920, height: 1080, alt: appName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appName} — ${BRAND_TAGLINE}`,
    description:
      'Organizza il tuo viaggio o unisciti a un gruppo. Ognuno prenota voli e hotel per conto proprio.',
    images: ['/images/heroes/hero-login.jpg'],
  },
  // Omio / Impact affiliate site verification
  other: {
    'impact-site-verification': '177e37a3-3cd3-490f-9407-6af80805e74b',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const company = getCompanyProfile();

  return (
    <html lang="it">
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans pb-[var(--cookie-banner-pad,0px)]`}
      >
        <Providers session={session}>
          <div className="flex min-h-dvh flex-col">
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <Footer company={company} />
          </div>
          <CookieBanner />
          <Toaster richColors position="top-right" />
          {/* Evita 404 console su preview senza Analytics/Insights abilitati */}
          {process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production' ? (
            <>
              <Analytics />
              <SpeedInsights />
            </>
          ) : null}
        </Providers>
      </body>
    </html>
  );
}