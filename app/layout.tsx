import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/app/providers';
import { auth } from '@/auth';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { Footer } from '@/components/layout/Footer';
import { Analytics } from '@vercel/analytics/next';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const appName = process.env.LEGAL_TRADE_NAME ?? process.env.NEXT_PUBLIC_APP_NAME ?? 'NomadLink';

export const metadata: Metadata = {
  title: appName,
  description: 'Trova e crea viaggi di gruppo unici — fotografia e avventura nel mondo.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="it">
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans`}>
        <Providers session={session}>
          <div className="flex min-h-screen flex-col">
            {children}
            <Footer />
          </div>
          <CookieBanner />
          <Toaster richColors position="top-right" />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
