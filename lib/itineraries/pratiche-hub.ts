import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { hasFlightBooked } from '@/lib/itineraries/practice-lifecycle';
import type { HubPracticeCard } from '@/lib/itineraries/pratiche-hub-types';
import type { PracticeRow } from '@/lib/itineraries/types';

export type { HubPracticeCard };

/**
 * Enrich user practices for I miei viaggi tabs:
 * - organizedByMe vs joined (edition.created_by)
 * - bookedSeats / totalSeats for owner status chips
 */
export async function enrichPracticesForHub(
  userId: string,
  practices: PracticeRow[]
): Promise<HubPracticeCard[]> {
  const editionIds = [
    ...new Set(practices.map((p) => p.edition_id).filter((id): id is string => Boolean(id))),
  ];
  const editionMeta = new Map<
    string,
    { created_by: string | null; title: string | null }
  >();
  if (editionIds.length) {
    const { data } = await supabaseAdmin
      .from('editions')
      .select('id, created_by, title')
      .in('id', editionIds);
    for (const row of data ?? []) {
      editionMeta.set(row.id as string, {
        created_by: (row.created_by as string | null) ?? null,
        title: (row.title as string | null) ?? null,
      });
    }
  }

  const peerCounts = new Map<string, { booked: number; total: number }>();
  if (editionIds.length) {
    const { data: peers } = await supabaseAdmin
      .from('practices')
      .select(
        'edition_id, user_id, flight_confirmed_at, flight_booking, flight_bookings'
      )
      .in('edition_id', editionIds);
    const byEdition = new Map<string, PracticeRow[]>();
    for (const row of peers ?? []) {
      const eid = row.edition_id as string;
      const list = byEdition.get(eid) ?? [];
      list.push(row as PracticeRow);
      byEdition.set(eid, list);
    }
    for (const [eid, list] of byEdition) {
      peerCounts.set(eid, {
        total: list.length,
        booked: list.filter((p) => hasFlightBooked(p)).length,
      });
    }
  }

  return practices.map((p) => {
    const meta = p.edition_id ? editionMeta.get(p.edition_id) : null;
    const organizedByMe = meta?.created_by
      ? meta.created_by === userId
      : p.user_id === userId && (p.mode === 'solo' || !p.edition_id || p.mode === 'friends');
    const seats = p.edition_id ? peerCounts.get(p.edition_id) : null;
    return {
      ...p,
      hubTitle: meta?.title ?? null,
      organizedByMe,
      bookedSeats: seats?.booked ?? (hasFlightBooked(p) ? 1 : 0),
      totalSeats: seats?.total ?? 1,
    };
  });
}
