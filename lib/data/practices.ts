import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { datesForDuration } from '@/lib/itineraries/dates';
import type { PracticeRow, PracticeStatus, TravelMode } from '@/lib/itineraries/types';

export type { PracticeRow };

function missing(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    Boolean(error?.message && /practices|editions/i.test(error.message))
  );
}

export async function findPracticeForEdition(userId: string, editionId: string) {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('*')
    .eq('user_id', userId)
    .eq('edition_id', editionId)
    .neq('status', 'cancelled')
    .maybeSingle();
  if (error || !data) return null;
  return data as PracticeRow;
}

export async function createPractice(input: {
  userId: string;
  templateId: string;
  mode: TravelMode;
  dateFrom: string;
  editionId?: string | null;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const template = findItineraryTemplate(input.templateId);
  if (!template) return { error: 'Template non trovato.' };
  const dates = datesForDuration(input.dateFrom, template.duration_days);

  const { data, error } = await supabaseAdmin
    .from('practices')
    .insert({
      user_id: input.userId,
      template_id: input.templateId,
      edition_id: input.editionId ?? null,
      mode: input.mode,
      date_from: dates.date_from,
      date_to: dates.date_to,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error || !data) {
    if (missing(error)) return { error: 'Catalogo pratiche non ancora applicato sul database.' };
    return { error: error?.message ?? 'Impossibile creare la pratica.' };
  }
  return { practice: data as PracticeRow };
}

export async function getPractice(id: string, userId: string): Promise<PracticeRow | null> {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PracticeRow;
}

export async function listUserPractices(userId: string): Promise<PracticeRow[]> {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as PracticeRow[];
}

export async function confirmPracticeFlight(practiceId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .update({
      status: 'confirmed',
      flight_confirmed_at: new Date().toISOString(),
    })
    .eq('id', practiceId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) return { error: error?.message ?? 'Conferma volo fallita.' };

  const practice = data as PracticeRow;
  if (practice.edition_id) {
    await supabaseAdmin
      .from('edition_members')
      .update({ status: 'confirmed' })
      .eq('edition_id', practice.edition_id)
      .eq('user_id', userId);
    await maybeFormEdition(practice.edition_id);
  }
  return { practice };
}

export async function confirmPracticeHotel(practiceId: string, userId: string) {
  const current = await getPractice(practiceId, userId);
  if (!current) return { error: 'Pratica non trovata.' };
  if (current.mode === 'group' && current.status === 'draft') {
    return { error: 'In gruppo l’hotel si sblocca dopo il volo confermato.' };
  }
  const nextStatus: PracticeStatus =
    current.flight_confirmed_at || current.status === 'confirmed' ? 'preparing' : current.status;
  const { error } = await supabaseAdmin
    .from('practices')
    .update({
      hotel_confirmed_at: new Date().toISOString(),
      status: current.activity_confirmed_at ? 'ready' : nextStatus,
    })
    .eq('id', practiceId)
    .eq('user_id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function confirmPracticeActivity(practiceId: string, userId: string) {
  const current = await getPractice(practiceId, userId);
  if (!current) return { error: 'Pratica non trovata.' };
  if (current.mode === 'group' && current.status === 'draft') {
    return { error: 'In gruppo le attività si sbloccano dopo il volo confermato.' };
  }
  const { error } = await supabaseAdmin
    .from('practices')
    .update({
      activity_confirmed_at: new Date().toISOString(),
      status: current.hotel_confirmed_at ? 'ready' : 'preparing',
    })
    .eq('id', practiceId)
    .eq('user_id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

async function maybeFormEdition(editionId: string) {
  const { data: edition } = await supabaseAdmin
    .from('editions')
    .select('id, min_confirmed, status')
    .eq('id', editionId)
    .maybeSingle();
  if (!edition || edition.status !== 'open') return;
  const { count } = await supabaseAdmin
    .from('edition_members')
    .select('*', { count: 'exact', head: true })
    .eq('edition_id', editionId)
    .eq('status', 'confirmed');
  if ((count ?? 0) >= Number(edition.min_confirmed)) {
    await supabaseAdmin.from('editions').update({ status: 'formed' }).eq('id', editionId);
  }
}
