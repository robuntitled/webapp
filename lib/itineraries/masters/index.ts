import { ACTIVE_MASTERS, getActiveMaster } from '@/lib/itineraries/masters/active-batch';
import { BATCH2_MASTERS, getBatch2Master } from '@/lib/itineraries/masters/batch2';
import { BATCH3_MASTERS, getBatch3Master } from '@/lib/itineraries/masters/batch3';
import { remapMasterToTemplate } from '@/lib/itineraries/masters/remap';
import type { DestinationMaster } from '@/lib/itineraries/masters/types';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { RemapVibe } from '@/lib/itineraries/masters/remap';

export { ACTIVE_MASTERS, getActiveMaster, ACTIVE_MASTER_SLUGS } from '@/lib/itineraries/masters/active-batch';
export { BATCH2_MASTERS } from '@/lib/itineraries/masters/batch2';
export { BATCH3_MASTERS, BATCH3_MASTER_SLUGS } from '@/lib/itineraries/masters/batch3';
export { remapMasterToTemplate, remapMasterToDays } from '@/lib/itineraries/masters/remap';
export type { DestinationMaster } from '@/lib/itineraries/masters/types';

const ALL_MASTERS: DestinationMaster[] = [
  ...ACTIVE_MASTERS,
  ...BATCH2_MASTERS,
  ...BATCH3_MASTERS,
];
const MASTER_BY_SLUG = new Map(ALL_MASTERS.map((m) => [m.slug, m]));

export function getMaster(slug: string): DestinationMaster | undefined {
  const key = slug.trim().toLowerCase();
  return (
    MASTER_BY_SLUG.get(key) ??
    getActiveMaster(key) ??
    getBatch2Master(key) ??
    getBatch3Master(key)
  );
}

export function allMasters(): DestinationMaster[] {
  return ALL_MASTERS;
}

export function hasCuratedMaster(slug: string): boolean {
  return Boolean(getMaster(slug));
}

/** Published duration templates derived from each master (catalog durations). */
export function templatesFromMasters(): ItineraryTemplate[] {
  const out: ItineraryTemplate[] = [];
  for (const master of ALL_MASTERS) {
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
