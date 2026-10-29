import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/app/providers';
import { auth } from '@/auth';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { Footer } from '@/components/layout/Footer';
import { getCompanyProfile } from '@/lib/privacy/company';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const appName = process.env.LEGAL_TRADE_NAME ?? process.env.NEXT_PUBLIC_APP_NAME ?? 'Flygetr';
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: appName,
    template: `%s — ${appName}`,
  },
  description:
    'Crea un viaggio o unisciti a uno in formazione. Prenoti i servizi quando il gruppo è solido.',
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: appName,
    title: appName,
    description:
      'Crea un viaggio o unisciti a uno in formazione. Prenoti i servizi quando il gruppo è solido.',
    images: [{ url: '/images/heroes/hero-login.jpg', width: 1920, height: 1080, alt: appName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description:
      'Crea un viaggio o unisciti a uno in formazione. Prenoti i servizi quando il gruppo è solido.',
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
      <body className={`${inter.variable} font-sans`}>
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