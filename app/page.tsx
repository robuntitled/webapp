import type { Metadata } from 'next';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { PublicLanding } from '@/components/brand/PublicLanding';
import { listJoinableEditions } from '@/lib/data/editions';
import {
  findItineraryBySlug,
  findItineraryTemplate,
  minBudgetHintForDestination,
  publishedDestinations,
  wizardDestinationCards,
} from '@/lib/itineraries/catalog';

import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand/noivia';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? BRAND_NAME;
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://flygetr.it';

export const metadata: Metadata = {
  title: {
    absolute: `${appName} — ${BRAND_TAGLINE}`,
  },
  description:
    'Il tuo viaggio, senza tour operator. Organizzalo con i tuoi amici o unisciti a un gruppo in partenza.',
  alternates: { canonical: siteUrl },
  openGraph: {
    title: `${appName} — ${BRAND_TAGLINE}`,
    description:
      'Il tuo viaggio, senza tour operator. Organizzalo con i tuoi amici o unisciti a un gruppo in partenza.',
    url: siteUrl,
    siteName: appName,
    locale: 'it_IT',
    type: 'website',
    images: [{ url: '/images/heroes/hero-login.jpg', width: 1920, height: 1080, alt: appName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appName} — ${BRAND_TAGLINE}`,
    description:
      'Il tuo viaggio, senza tour operator. Organizzalo con i tuoi amici o unisciti a un gruppo in partenza.',
    images: ['/images/heroes/hero-login.jpg'],
  },
};

function durationFromDates(dateFrom: string, dateTo: string): number | null {
  try {
    const days =
      differenceInCalendarDays(
        parseISO(dateTo.slice(0, 10)),
        parseISO(dateFrom.slice(0, 10))
      ) + 1;
    return days > 0 ? days : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [editions, cards] = await Promise.all([
    listJoinableEditions().catch(() => []),
    Promise.resolve(wizardDestinationCards()),
  ]);

  const published = publishedDestinations().map((d) => ({
    slug: d.slug,
    name: d.name,
    vibe: d.vibe,
    emoji: d.emoji,
    published: true as const,
    allowedDurations: d.allowedDurations,
    budgetHint: minBudgetHintForDestination(d.slug),
  }));

  const comingSoon = cards
    .filter((c) => !c.published)
    .slice(0, 8)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      vibe: c.vibe,
      emoji: c.emoji,
      published: false as const,
    }));

  const thailandiaTpl = findItineraryBySlug('thailandia', 14);
  const thailandia = thailandiaTpl
    ? {
        durationDays: thailandiaTpl.duration_days,
        budgetHint: thailandiaTpl.budget_orientative_eur.total_hint,
      }
    : null;

  const openEditions = editions
    .filter((e) => e.edition_type !== 'private')
    .slice(0, 6)
    .map((e) => {
      const tpl = findItineraryTemplate(e.template_id);
      return {
        id: e.id,
        destinationName: tpl?.destination_name ?? e.template_id,
        dateFrom: String(e.date_from).slice(0, 10),
        dateTo: String(e.date_to).slice(0, 10),
        minConfirmed: e.min_confirmed,
        confirmedCount: e.confirmed_count ?? 0,
        durationDays:
          durationFromDates(String(e.date_from), String(e.date_to)) ??
          tpl?.duration_days ??
          null,
      };
    });

  return (
    <PublicLanding
      featured={published}
      comingSoon={comingSoon}
      openEditions={openEditions}
      thailandia={thailandia}
    />
  );
}
