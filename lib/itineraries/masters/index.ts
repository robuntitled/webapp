import { ACTIVE_MASTERS, getActiveMaster } from '@/lib/itineraries/masters/active-batch';
import { remapMasterToTemplate } from '@/lib/itineraries/masters/remap';
import type { DestinationMaster } from '@/lib/itineraries/masters/types';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { RemapVibe } from '@/lib/itineraries/masters/remap';

export { ACTIVE_MASTERS, getActiveMaster, ACTIVE_MASTER_SLUGS } from '@/lib/itineraries/masters/active-batch';
export { remapMasterToTemplate, remapMasterToDays } from '@/lib/itineraries/masters/remap';
export type { DestinationMaster } from '@/lib/itineraries/masters/types';

const MASTER_BY_SLUG = new Map(ACTIVE_MASTERS.map((m) => [m.slug, m]));

export function getMaster(slug: string): DestinationMaster | undefined {
  return MASTER_BY_SLUG.get(slug.trim().toLowerCase()) ?? getActiveMaster(slug);
}

export function hasCuratedMaster(slug: string): boolean {
  return Boolean(getMaster(slug));
}

/** Published duration templates derived from each master (catalog durations). */
export function templatesFromMasters(): ItineraryTemplate[] {
  const out: ItineraryTemplate[] = [];
  for (const master of ACTIVE_MASTERS) {
    const dest = findCatalogDestination(master.slug);
    const durations = dest?.allowedDurations?.length
      ? dest.allowedDurations
      : [7, 10, 14].filter((d) => d >= 5);
    for (const days of durations) {
      const { template } = remapMasterToTemplate(master, days, master.styleDefault);
      out.push({ ...template, status: 'published' });
    }
  }
  return out;
}

export function planFromMaster(
  slug: string,
  tripDays: number,
  vibe?: RemapVibe | null
) {
  const master = getMaster(slug);
  if (!master) return null;
  return remapMasterToTemplate(master, tripDays, vibe ?? master.styleDefault);
}
