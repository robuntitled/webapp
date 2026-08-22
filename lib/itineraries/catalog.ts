import { THAILANDIA_TEMPLATES } from '@/lib/itineraries/thailandia';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { ItineraryTemplate, OfficialEditionSeed } from '@/lib/itineraries/types';

/** Solo itinerari published. Lancio: Thailandia 10/14/21. */
export const PUBLISHED_TEMPLATES: ItineraryTemplate[] = THAILANDIA_TEMPLATES.filter(
  (t) => t.status === 'published'
);

export function publishedDestinations() {
  const slugs = [...new Set(PUBLISHED_TEMPLATES.map((t) => t.destination_slug))];
  return slugs.map((slug) => {
    const dest = findCatalogDestination(slug);
    const templates = templatesForDestination(slug);
    return {
      slug,
      name: dest?.name ?? templates[0]?.destination_name ?? slug,
      continent: dest?.continent ?? 'Asia',
      emoji: dest?.emoji ?? '🇹🇭',
      vibe: dest?.vibe ?? templates[0]?.summary ?? '',
      allowedDurations: templates.map((t) => t.duration_days),
    };
  });
}

export function templatesForDestination(slug: string): ItineraryTemplate[] {
  return PUBLISHED_TEMPLATES.filter((t) => t.destination_slug === slug).sort(
    (a, b) => a.duration_days - b.duration_days
  );
}

export function findItineraryTemplate(templateId: string): ItineraryTemplate | undefined {
  return PUBLISHED_TEMPLATES.find((t) => t.template_id === templateId);
}

export function findItineraryBySlug(
  slug: string,
  durationDays?: number
): ItineraryTemplate | undefined {
  const list = templatesForDestination(slug);
  if (!list.length) return undefined;
  if (durationDays) return list.find((t) => t.duration_days === durationDays) ?? list[0];
  return list[Math.min(1, list.length - 1)] ?? list[0];
}

export function assertTemplateShape(t: ItineraryTemplate): string[] {
  const issues: string[] = [];
  if (t.days.length !== t.duration_days) {
    issues.push(`${t.template_id}: days ${t.days.length} != ${t.duration_days}`);
  }
  if (!t.days[0]?.is_arrival) issues.push(`${t.template_id}: day 1 must be arrival`);
  if (!t.days[t.days.length - 1]?.is_departure) {
    issues.push(`${t.template_id}: last day must be departure`);
  }
  if (t.paid_activities.length > 2) issues.push(`${t.template_id}: max 2 paid activities`);
  return issues;
}

/** Date ufficiali di lancio (seed manuale, niente admin). */
export const OFFICIAL_EDITION_SEEDS: OfficialEditionSeed[] = [
  { template_id: 'thailandia-10d', date_from: '2026-11-12', date_to: '2026-11-21', min_confirmed: 4 },
  { template_id: 'thailandia-14d', date_from: '2026-12-05', date_to: '2026-12-18', min_confirmed: 4 },
  { template_id: 'thailandia-21d', date_from: '2027-01-08', date_to: '2027-01-28', min_confirmed: 6 },
];
