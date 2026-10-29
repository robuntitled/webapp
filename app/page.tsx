import type { Metadata } from 'next';
import { PublicLanding } from '@/components/brand/PublicLanding';

const appName = process.env.LEGAL_TRADE_NAME ?? process.env.NEXT_PUBLIC_APP_NAME ?? 'Flygetr';
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it';

export const metadata: Metadata = {
  title: {
    absolute: `${appName} — Il tuo viaggio senza tour operator`,
  },
  description:
    'Scegli un itinerario ufficiale, forma il gruppo e prenota voli e hotel per conto proprio. Niente pacchetto, niente tour operator.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: `${appName} — Il tuo viaggio senza tour operator`,
    description:
      'Itinerario ufficiale, gruppo in formazione, ognuno prenota i servizi per conto proprio.',
    url: siteUrl,
    siteName: appName,
    locale: 'it_IT',
    type: 'website',
    images: [{ url: '/images/heroes/hero-login.jpg', width: 1920, height: 1080, alt: appName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appName} — Il tuo viaggio senza tour operator`,
    description:
      'Itinerario ufficiale, gruppo in formazione, ognuno prenota i servizi per conto proprio.',
    images: ['/images/heroes/hero-login.jpg'],
  },
};

export default function HomePage() {
  return <PublicLanding />;
}
