import { ACTIVE_MASTERS, getActiveMaster } from '@/lib/itineraries/masters/active-batch';
import { BATCH2_MASTERS, getBatch2Master } from '@/lib/itineraries/masters/batch2';
import { BATCH3_MASTERS, getBatch3Master } from '@/lib/itineraries/masters/batch3';
import type { DestinationMaster } from '@/lib/itineraries/masters/types';

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
