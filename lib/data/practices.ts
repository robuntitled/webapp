import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import {
  FLIGHT_ALREADY_BOOKED_ERROR,
  flightFingerprint,
  flightStatusConfirmsSeat,
  isSamePracticeFlightBooking,
  parseFlightStatus,
  type ActivityBookingRecap,
  type EditionPeerFlight,
  type FlightBookingRecap,
  type HotelBookingRecap,
} from '@/lib/itineraries/bookings';

export { FLIGHT_ALREADY_BOOKED_ERROR, isSamePracticeFlightBooking };
import { datesForDuration } from '@/lib/itineraries/dates';
import {
  FREE_TRIP_TEMPLATE_ID,
  isFreeTripTemplateId,
  type PlannedLeg,
} from '@/lib/itineraries/free-trip';
import {
  buildTripDraftFromFlight,
  buildTripDraftFromHotel,
  templateIdForInsert,
  type FlightSearchSeed,
  type HotelSearchSeed,
} from '@/lib/itineraries/from-search';
import { prepareFlightBookingPatch } from '@/lib/itineraries/practice-flights';
import type { PracticeRow, PracticeStatus, TravelMode } from '@/lib/itineraries/types';

export type { EditionPeerFlight, PracticeRow };

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

export async function findDraftPractice(input: {
  userId: string;
  templateId: string;
  mode: TravelMode;
}): Promise<PracticeRow | null> {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('*')
    .eq('user_id', input.userId)
    .eq('template_id', input.templateId)
    .eq('mode', input.mode)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PracticeRow;
}

/** Riusa una bozza esistente (stesso template+mode) invece di creare duplicati. */
export async function createOrReuseDraftPractice(input: {
  userId: string;
  templateId: string;
  mode: TravelMode;
  dateFrom: string;
  dateTo?: string;
  editionId?: string | null;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const template = findItineraryTemplate(input.templateId);
  if (!template) return { error: 'Template non trovato.' };
  const dates = input.dateTo
    ? { date_from: input.dateFrom.slice(0, 10), date_to: input.dateTo.slice(0, 10) }
    : datesForDuration(input.dateFrom, template.duration_days);

  const existing = await findDraftPractice({
    userId: input.userId,
    templateId: input.templateId,
    mode: input.mode,
  });
  if (existing) {
    if (
      existing.date_from === dates.date_from &&
      existing.date_to === dates.date_to &&
      (input.editionId == null || existing.edition_id === input.editionId)
    ) {
      return { practice: existing };
    }
    const { data, error } = await supabaseAdmin
      .from('practices')
      .update({
        date_from: dates.date_from,
        date_to: dates.date_to,
        edition_id: input.editionId ?? existing.edition_id,
      })
      .eq('id', existing.id)
      .eq('user_id', input.userId)
      .select('*')
      .single();
    if (!error && data) return { practice: data as PracticeRow };
  }

  return createPractice(input);
}

export async function createPractice(input: {
  userId: string;
  templateId: string | null;
  mode: TravelMode;
  dateFrom: string;
  dateTo?: string;
  editionId?: string | null;
  destinationLabel?: string | null;
  destinationIata?: string | null;
  plannedLegs?: PlannedLeg[] | null;
  selectedFlightPlan?: import('@/lib/itineraries/selected-flight-plan').SelectedFlightPlanSnapshot | null;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const free = isFreeTripTemplateId(input.templateId);
  const template = free ? undefined : findItineraryTemplate(input.templateId);
  if (!free && !template) return { error: 'Template non trovato.' };

  const dates = input.dateTo
    ? { date_from: input.dateFrom.slice(0, 10), date_to: input.dateTo.slice(0, 10) }
    : datesForDuration(input.dateFrom, template?.duration_days ?? 10);

  const templateId =
    free || !input.templateId ? FREE_TRIP_TEMPLATE_ID : input.templateId;

  const baseRow: Record<string, unknown> = {
    user_id: input.userId,
    template_id: templateId,
    edition_id: input.editionId ?? null,
    mode: input.mode,
    date_from: dates.date_from,
    date_to: dates.date_to,
    status: 'draft',
  };

  // M2 / 047 columns (optional until migrations applied).
  const withExtras: Record<string, unknown> = {
    ...baseRow,
    ...(input.destinationLabel ? { destination_label: input.destinationLabel } : {}),
    ...(input.destinationIata ? { destination_iata: input.destinationIata } : {}),
    ...(input.plannedLegs?.length ? { planned_legs: input.plannedLegs } : {}),
    ...(input.selectedFlightPlan
      ? { selected_flight_plan: input.selectedFlightPlan }
      : {}),
  };

  let { data, error } = await supabaseAdmin
    .from('practices')
    .insert(withExtras)
    .select('*')
    .single();

  // Schema senza selected_flight_plan: riprova senza quella colonna.
  if (
    error &&
    (error.code === '42703' || /selected_flight_plan/i.test(error.message ?? ''))
  ) {
    const { selected_flight_plan: _drop, ...withoutPlan } = withExtras;
    void _drop;
    ({ data, error } = await supabaseAdmin
      .from('practices')
      .insert(withoutPlan)
      .select('*')
      .single());
  }

  // Schema senza M2: riprova senza colonne nuove.
  if (
    error &&
    (error.code === '42703' ||
      /destination_label|planned_legs|destination_iata|selected_flight_plan/i.test(
        error.message ?? ''
      ))
  ) {
    ({ data, error } = await supabaseAdmin
      .from('practices')
      .insert(baseRow)
      .select('*')
      .single());
  }

  // Schema con template_id NULL (M2): se vogliamo null al posto del sentinel.
  if (
    !error &&
    data &&
    free &&
    input.templateId === null
  ) {
    // Already inserted as viaggio-libero; fine until null is preferred post-M2.
  }

  if (error || !data) {
    if (missing(error)) return { error: 'Catalogo pratiche non ancora applicato sul database.' };
    return { error: error?.message ?? 'Impossibile creare la pratica.' };
  }
  return { practice: data as PracticeRow };
}

/** Crea un viaggio in bozza da un risultato ricerca voli (Fase 1). */
export async function createPracticeFromFlightSearch(input: {
  userId: string;
  seed: FlightSearchSeed;
  mode?: TravelMode;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const draft = buildTripDraftFromFlight(input.seed);
  return createPractice({
    userId: input.userId,
    templateId: templateIdForInsert(draft),
    mode: input.mode ?? 'solo',
    dateFrom: draft.dateFrom,
    dateTo: draft.dateTo,
    destinationLabel: draft.destinationLabel,
    destinationIata: draft.destinationIata,
    plannedLegs: draft.plannedLegs,
  });
}

/** Crea un viaggio in bozza da un risultato ricerca hotel (Fase 1). */
export async function createPracticeFromHotelSearch(input: {
  userId: string;
  seed: HotelSearchSeed;
  mode?: TravelMode;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const draft = buildTripDraftFromHotel(input.seed);
  return createPractice({
    userId: input.userId,
    templateId: templateIdForInsert(draft),
    mode: input.mode ?? 'solo',
    dateFrom: draft.dateFrom,
    dateTo: draft.dateTo,
    destinationLabel: draft.destinationLabel,
    destinationIata: draft.destinationIata,
    plannedLegs: draft.plannedLegs,
  });
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
    const { notifyEditionFlightConfirmed } = await import('@/lib/notifications/edition');
    const { countConfirmedEditionMembers, postFirstFlightChatUnlock, postJoinRequestChatPing } =
      await import('@/lib/data/trip-chat');
    void notifyEditionFlightConfirmed({ editionId: practice.edition_id, userId });
    const confirmed = await countConfirmedEditionMembers(practice.edition_id);
    if (confirmed === 1) {
      void postFirstFlightChatUnlock(practice.edition_id, userId);
    } else if (confirmed > 1) {
      void postJoinRequestChatPing(practice.edition_id, userId);
    }
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

export async function confirmPracticeActivity(
  practiceId: string,
  userId: string,
  recap?: ActivityBookingRecap
) {
  const current = await getPractice(practiceId, userId);
  if (!current) return { error: 'Pratica non trovata.' };
  if (current.mode === 'group' && current.status === 'draft') {
    return { error: 'In gruppo le attività si sbloccano dopo il volo confermato.' };
  }
  const next = recap ? [...(current.activity_bookings ?? []), recap] : current.activity_bookings;
  const { error } = await supabaseAdmin
    .from('practices')
    .update({
      activity_confirmed_at: new Date().toISOString(),
      status: current.hotel_confirmed_at ? 'ready' : 'preparing',
      ...(recap ? { activity_bookings: next } : {}),
    })
    .eq('id', practiceId)
    .eq('user_id', userId);
  if (error) {
    if (missing(error) && recap) {
      return confirmPracticeActivity(practiceId, userId);
    }
    return { error: error.message };
  }
  return { ok: true as const, practice: current, recap };
}

export async function savePracticeFlightBooking(input: {
  practiceId: string;
  userId: string;
  recap: FlightBookingRecap;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const current = await getPractice(input.practiceId, input.userId);
  if (!current) return { error: 'Pratica non trovata.' };

  const kind = parseFlightStatus(input.recap.status);
  // Solo lo stato provider "confirmed" conferma pratica/posto gruppo.
  // Pending / failed / cancelled / unknown: salva il recap senza promuovere a confirmed.
  const isConfirmed = flightStatusConfirmsSeat(input.recap.status);

  // Prova prima con M1 (flight_bookings[]). Se la colonna manca, fallback legacy + blocco A1.
  const trySave = async (multiFlightSupported: boolean) => {
    const prepared = prepareFlightBookingPatch(
      current,
      input.recap,
      multiFlightSupported
    );
    if (!prepared.ok) return prepared;

    const patch: Record<string, unknown> = { ...prepared.patch };
    if (isConfirmed) {
      patch.status = 'confirmed';
      patch.flight_confirmed_at = input.recap.bookedAt;
    } else if (kind === 'failed' || kind === 'cancelled') {
      patch.flight_confirmed_at = null;
      if (
        current.status === 'confirmed' ||
        current.status === 'preparing' ||
        current.status === 'ready'
      ) {
        patch.status = 'draft';
      }
    }

    const { data, error } = await supabaseAdmin
      .from('practices')
      .update(patch)
      .eq('id', input.practiceId)
      .eq('user_id', input.userId)
      .select('*')
      .single();
    return { ok: true as const, data, error };
  };

  let result = await trySave(true);
  if (
    result.ok &&
    result.error &&
    (result.error.code === '42703' || /flight_bookings/i.test(result.error.message ?? ''))
  ) {
    result = await trySave(false);
  }
  if (!result.ok) return { error: result.error };

  const { data, error } = result;
  if (error || !data) {
    if (missing(error)) {
      // Schema legacy senza flight_booking: conferma solo se provider confirmed.
      if (isConfirmed) return confirmPracticeFlight(input.practiceId, input.userId);
      return { error: error?.message ?? 'Salvataggio volo fallito.' };
    }
    return { error: error?.message ?? 'Salvataggio volo fallito.' };
  }
  const practice = data as PracticeRow;
  if (practice.edition_id) {
    if (isConfirmed) {
      await supabaseAdmin
        .from('edition_members')
        .update({ status: 'confirmed' })
        .eq('edition_id', practice.edition_id)
        .eq('user_id', input.userId);
      await maybeFormEdition(practice.edition_id);
      const { notifyEditionFlightConfirmed } = await import('@/lib/notifications/edition');
      const { countConfirmedEditionMembers, postFirstFlightChatUnlock, postJoinRequestChatPing } =
        await import('@/lib/data/trip-chat');
      void notifyEditionFlightConfirmed({
        editionId: practice.edition_id,
        userId: input.userId,
      });
      const confirmed = await countConfirmedEditionMembers(practice.edition_id);
      if (confirmed === 1) {
        void postFirstFlightChatUnlock(practice.edition_id, input.userId);
      } else if (confirmed > 1) {
        void postJoinRequestChatPing(practice.edition_id, input.userId);
      }
    } else if (kind === 'failed' || kind === 'cancelled') {
      // Posto gruppo non conta come confermato se il volo non lo è.
      await supabaseAdmin
        .from('edition_members')
        .update({ status: 'interested' })
        .eq('edition_id', practice.edition_id)
        .eq('user_id', input.userId)
        .eq('status', 'confirmed');
      await maybeFormEdition(practice.edition_id);
    }
  }
  return { practice };
}

export async function savePracticeHotelBooking(input: {
  practiceId: string;
  userId: string;
  recap: HotelBookingRecap;
}): Promise<{ practice: PracticeRow } | { error: string }> {
  const current = await getPractice(input.practiceId, input.userId);
  if (!current) return { error: 'Pratica non trovata.' };
  if (current.mode === 'group' && current.status === 'draft') {
    return { error: 'In gruppo l’hotel si sblocca dopo il volo confermato.' };
  }
  const nextStatus: PracticeStatus =
    current.flight_confirmed_at || current.status === 'confirmed' ? 'preparing' : current.status;
  const hotels = [...(current.hotel_bookings ?? []), input.recap];
  const { data, error } = await supabaseAdmin
    .from('practices')
    .update({
      hotel_confirmed_at: input.recap.bookedAt,
      hotel_bookings: hotels,
      status: current.activity_confirmed_at ? 'ready' : nextStatus,
    })
    .eq('id', input.practiceId)
    .eq('user_id', input.userId)
    .select('*')
    .single();
  if (error || !data) {
    if (missing(error)) {
      const fallback = await confirmPracticeHotel(input.practiceId, input.userId);
      if (fallback && 'error' in fallback && fallback.error) {
        return { error: fallback.error };
      }
      return { practice: current };
    }
    return { error: error?.message ?? 'Salvataggio hotel fallito.' };
  }
  return { practice: data as PracticeRow };
}

export async function listEditionPeerFlights(
  editionId: string,
  excludeUserId: string
): Promise<EditionPeerFlight[]> {
  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('user_id, flight_booking')
    .eq('edition_id', editionId)
    .not('flight_booking', 'is', null)
    .neq('user_id', excludeUserId);
  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((r) => r.user_id as string))];
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, first_name')
    .in('id', userIds);
  const names = new Map((users ?? []).map((u) => [u.id as string, u.first_name as string | null]));

  const grouped = new Map<string, EditionPeerFlight>();
  for (const row of data) {
    const recap = row.flight_booking as FlightBookingRecap | null;
    if (!recap?.outbound) continue;
    const fingerprint = flightFingerprint(recap);
    const existing = grouped.get(fingerprint);
    const booker = {
      userId: row.user_id as string,
      firstName: names.get(row.user_id as string) ?? null,
    };
    if (existing) {
      existing.bookers.push(booker);
    } else {
      grouped.set(fingerprint, { fingerprint, recap, bookers: [booker] });
    }
  }
  return [...grouped.values()];
}

/** Apre o riapre l'edizione in base ai voli confermati (formed ↔ open). */
async function maybeFormEdition(editionId: string) {
  const { data: edition } = await supabaseAdmin
    .from('editions')
    .select('id, min_confirmed, status')
    .eq('id', editionId)
    .maybeSingle();
  if (!edition) return;
  if (edition.status !== 'open' && edition.status !== 'formed') return;
  const { count } = await supabaseAdmin
    .from('edition_members')
    .select('*', { count: 'exact', head: true })
    .eq('edition_id', editionId)
    .eq('status', 'confirmed');
  const confirmed = count ?? 0;
  const min = Number(edition.min_confirmed);
  if (confirmed >= min && edition.status === 'open') {
    await supabaseAdmin.from('editions').update({ status: 'formed' }).eq('id', editionId);
  } else if (confirmed < min && edition.status === 'formed') {
    await supabaseAdmin.from('editions').update({ status: 'open' }).eq('id', editionId);
  }
}

/** Persist Organizza Voli selections (migration 047 optional). */
export async function savePracticeSelectedFlightPlan(input: {
  practiceId: string;
  userId: string;
  selectedFlightPlan: import('@/lib/itineraries/selected-flight-plan').SelectedFlightPlanSnapshot;
  plannedLegs?: PlannedLeg[] | null;
}): Promise<{ ok: true } | { error: string }> {
  const withPlan: Record<string, unknown> = {
    selected_flight_plan: input.selectedFlightPlan,
    ...(input.plannedLegs?.length ? { planned_legs: input.plannedLegs } : {}),
  };
  let { error } = await supabaseAdmin
    .from('practices')
    .update(withPlan)
    .eq('id', input.practiceId)
    .eq('user_id', input.userId);
  if (error && (error.code === '42703' || /selected_flight_plan/i.test(error.message ?? ''))) {
    if (input.plannedLegs?.length) {
      ({ error } = await supabaseAdmin
        .from('practices')
        .update({ planned_legs: input.plannedLegs })
        .eq('id', input.practiceId)
        .eq('user_id', input.userId));
    } else {
      return { ok: true };
    }
  }
  if (error) {
    if (error.code === '42703') return { ok: true };
    return { error: error.message };
  }
  return { ok: true };
}

/** Exported for unit tests (A8). */
export const __testMaybeFormEdition = maybeFormEdition;
