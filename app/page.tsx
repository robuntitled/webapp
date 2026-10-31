import type { Metadata } from 'next';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { PublicLanding } from '@/components/brand/PublicLanding';
import { listJoinableEditions } from '@/lib/data/editions';
import {
  findItineraryTemplate,
  minBudgetHintForDestination,
  orientativeBudgetHint,
  publishedDestinations,
  wizardDestinationCards,
} from '@/lib/itineraries/catalog';
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE, getSiteUrl } from '@/lib/brand';
import { BRAND_IMAGES } from '@/lib/brand/images';

const siteUrl = getSiteUrl();
const HOME_OG = BRAND_IMAGES.heroes.home;

export const metadata: Metadata = {
  title: {
    absolute: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  },
  description: BRAND_DESCRIPTION,
  alternates: { canonical: siteUrl },
  openGraph: {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    url: siteUrl,
    siteName: BRAND_NAME,
    locale: 'it_IT',
    type: 'website',
    images: [
      {
        url: HOME_OG,
        width: 1920,
        height: 1329,
        alt: 'Barche longtail in Thailandia — paesaggio di viaggio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    images: [HOME_OG],
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

  // Stesso SoT di Organizza step 1: «da ~» = minimo tra le durate pubblicate.
  // (14g = 1700 solo su partenze/recap con quella durata; 10g = 1330.)
  const thaiMin = minBudgetHintForDestination('thailandia');
  const thailandia =
    thaiMin != null
      ? {
          durationDays: null as number | null,
          budgetHint: thaiMin,
          budgetHint14: orientativeBudgetHint('thailandia', 14),
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
