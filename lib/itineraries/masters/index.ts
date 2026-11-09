import { remapMasterToTemplate } from '@/lib/itineraries/masters/remap';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { RemapVibe } from '@/lib/itineraries/masters/remap';
import { allMasters, getMaster } from '@/lib/itineraries/masters/registry';

export { ACTIVE_MASTERS, getActiveMaster, ACTIVE_MASTER_SLUGS } from '@/lib/itineraries/masters/active-batch';
export { BATCH2_MASTERS } from '@/lib/itineraries/masters/batch2';
export { BATCH3_MASTERS, BATCH3_MASTER_SLUGS } from '@/lib/itineraries/masters/batch3';
export { remapMasterToTemplate, remapMasterToDays } from '@/lib/itineraries/masters/remap';
export type { DestinationMaster } from '@/lib/itineraries/masters/types';
export { getMaster, allMasters, hasCuratedMaster } from '@/lib/itineraries/masters/registry';

/** Published duration templates derived from each master (catalog durations). */
export function templatesFromMasters(): ItineraryTemplate[] {
  const out: ItineraryTemplate[] = [];
  for (const master of allMasters()) {
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
