import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ItineraryDay, ItineraryHotel, ItineraryPaidActivity, ItineraryTemplate } from '@/lib/itineraries/types';

type TemplateRow = {
  id: string;
  destination_slug: string;
  destination_name: string;
  duration_days: number;
  style: string | null;
  title: string;
  summary: string | null;
  budget_orientative_eur: ItineraryTemplate['budget_orientative_eur'];
  logistics_notes: string | null;
  status: string;
  hub_iata: string | null;
  origin_iata_default: string | null;
  source_payload: Record<string, unknown> | null;
};

function fromPayload(row: TemplateRow): ItineraryTemplate | null {
  const payload = row.source_payload;
  if (payload && Array.isArray(payload.days)) {
    return {
      template_id: row.id,
      destination_slug: row.destination_slug,
      destination_name: row.destination_name,
      duration_days: row.duration_days,
      style: (row.style as ItineraryTemplate['style']) ?? undefined,
      title: row.title,
      summary: row.summary ?? '',
      budget_orientative_eur: row.budget_orientative_eur,
      days: payload.days as ItineraryDay[],
      hotels: (payload.hotels as ItineraryHotel[]) ?? [],
      paid_activities: (payload.paid_activities as ItineraryPaidActivity[]) ?? [],
      logistics_notes: row.logistics_notes ?? undefined,
      status: row.status === 'published' ? 'published' : 'draft',
      hub_iata: row.hub_iata ?? undefined,
      origin_iata_default: row.origin_iata_default ?? undefined,
    };
  }
  return null;
}

/** Template itinerario dal DB normalizzato (bundle Americas, ecc.). */
export async function listDbItineraryTemplates(opts?: {
  destinationSlug?: string;
  status?: 'published' | 'draft' | 'archived';
}): Promise<ItineraryTemplate[]> {
  let q = supabaseAdmin
    .from('itinerary_templates')
    .select(
      'id, destination_slug, destination_name, duration_days, style, title, summary, budget_orientative_eur, logistics_notes, status, hub_iata, origin_iata_default, source_payload'
    )
    .order('destination_slug', { ascending: true })
    .order('duration_days', { ascending: true });

  if (opts?.destinationSlug) q = q.eq('destination_slug', opts.destinationSlug);
  if (opts?.status) q = q.eq('status', opts.status);

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    console.error('[itinerary_templates]', error.message);
    return [];
  }

  return (data as TemplateRow[])
    .map(fromPayload)
    .filter((t): t is ItineraryTemplate => Boolean(t));
}

export async function getDbItineraryTemplate(templateId: string): Promise<ItineraryTemplate | null> {
  const { data, error } = await supabaseAdmin
    .from('itinerary_templates')
    .select(
      'id, destination_slug, destination_name, duration_days, style, title, summary, budget_orientative_eur, logistics_notes, status, hub_iata, origin_iata_default, source_payload'
    )
    .eq('id', templateId)
    .maybeSingle();

  if (error || !data) return null;
  return fromPayload(data as TemplateRow);
}

export async function countDbItineraryTemplates(): Promise<{
  templates: number;
  destinations: number;
} | null> {
  const { count, error } = await supabaseAdmin
    .from('itinerary_templates')
    .select('*', { count: 'exact', head: true });
  if (error) return null;

  const { data: dests } = await supabaseAdmin.from('itinerary_templates').select('destination_slug');
  const destinations = new Set((dests ?? []).map((r) => r.destination_slug as string)).size;
  return { templates: count ?? 0, destinations };
}
