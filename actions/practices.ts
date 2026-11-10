'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createOrReuseDraftPractice,
  createPractice,
  createPracticeFromFlightSearch,
  createPracticeFromHotelSearch,
  savePracticeSelectedFlightPlan,
} from '@/lib/data/practices';
import type { FlightSearchSeed, HotelSearchSeed } from '@/lib/itineraries/from-search';
import {
  createPrivateEdition,
  joinEdition,
  updateEditionTitle,
} from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import {
  confirmPracticeActivity,
  confirmPracticeHotel,
} from '@/lib/data/practices';
import {
  FREE_TRIP_TEMPLATE_ID,
  isFreeTripTemplateId,
  type PlannedLeg,
} from '@/lib/itineraries/free-trip';
import type { SelectedFlightPlanSnapshot } from '@/lib/itineraries/selected-flight-plan';
import { plannedLegsFromSelected } from '@/lib/itineraries/selected-flight-plan';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-confirmation';
import type { ActivityBookingRecap } from '@/lib/itineraries/bookings';
import type { TravelMode } from '@/lib/itineraries/types';

function requireUser() {
  return auth().then((session) => {
    if (!session?.user?.id) redirect('/');
    return session.user.id;
  });
}

/** Salva/riusa bozza e apre la pratica per vedere i voli (niente duplicati). */
export async function startPracticeAction(input: {
  templateId: string;
  mode: TravelMode;
  dateFrom: string;
  dateTo?: string;
  title?: string | null;
  destinationLabel?: string | null;
  /** Schema orientativo senza template curato (viaggio-libero). */
  allowFreeTrip?: boolean;
  /** Organizza Voli selections to persist on the practice. */
  selectedFlightPlan?: SelectedFlightPlanSnapshot | null;
  plannedLegs?: PlannedLeg[] | null;
}): Promise<{ error: string } | never> {
  const userId = await requireUser();
  const free =
    Boolean(input.allowFreeTrip) && isFreeTripTemplateId(input.templateId);
  if (!free && !findItineraryTemplate(input.templateId)) {
    return { error: 'Template non trovato.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateFrom)) {
    return { error: 'Scegli una data di partenza.' };
  }

  const flightSnap = input.selectedFlightPlan ?? null;
  const planned =
    input.plannedLegs?.length
      ? input.plannedLegs
      : plannedLegsFromSelected(flightSnap);

  async function attachFlights(practiceId: string) {
    if (!flightSnap) return;
    const saved = await savePracticeSelectedFlightPlan({
      practiceId,
      userId,
      selectedFlightPlan: flightSnap,
      plannedLegs: planned,
    });
    if ('error' in saved) {
      console.error('[startPracticeAction] selected_flight_plan', saved.error);
    }
  }

  if (input.mode === 'friends' || input.mode === 'group') {
    if (free) {
      // Private edition path requires curated template_id in DB; use free solo draft instead.
      const result = await createPractice({
        userId,
        templateId: FREE_TRIP_TEMPLATE_ID,
        mode: input.mode === 'group' ? 'friends' : input.mode,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        destinationLabel: input.destinationLabel ?? input.title ?? null,
        plannedLegs: planned,
        selectedFlightPlan: flightSnap,
      });
      if ('error' in result) {
        return { error: result.error ?? 'Impossibile creare il viaggio.' };
      }
      await attachFlights(result.practice.id);
      revalidatePath('/pratiche');
      revalidatePath('/organizza');
      redirect(`/pratica/${result.practice.id}/prossimo`);
    }
    const result = await createPrivateEdition({
      userId,
      templateId: input.templateId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      mode: input.mode,
      title: input.title,
    });
    if ('error' in result) {
      const raw = result.error ?? 'Impossibile creare il viaggio.';
      if (/schema cache|Could not find|PGRST|column/i.test(raw)) {
        console.error('[startPracticeAction] private edition', raw);
        return { error: 'Impossibile creare il viaggio. Riprova tra poco.' };
      }
      return { error: raw };
    }
    await attachFlights(result.practice.id);
    revalidatePath('/pratiche');
    revalidatePath('/partenze');
    revalidatePath('/gruppi');
    revalidatePath('/organizza');
    redirect(`/pratica/${result.practice.id}/prossimo`);
  }

  if (free) {
    const result = await createPractice({
      userId,
      templateId: FREE_TRIP_TEMPLATE_ID,
      mode: 'solo',
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      destinationLabel: input.destinationLabel ?? input.title ?? null,
      plannedLegs: planned,
      selectedFlightPlan: flightSnap,
    });
    if ('error' in result) {
      return { error: result.error ?? 'Impossibile creare il viaggio.' };
    }
    await attachFlights(result.practice.id);
    revalidatePath('/pratiche');
    revalidatePath('/organizza');
    redirect(`/pratica/${result.practice.id}/prossimo`);
  }

  const result = await createOrReuseDraftPractice({
    userId,
    templateId: input.templateId,
    mode: 'solo',
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });
  if ('error' in result) {
    return { error: result.error ?? 'Impossibile creare il viaggio.' };
  }
  await attachFlights(result.practice.id);
  revalidatePath('/pratiche');
  revalidatePath('/organizza');
  redirect(`/pratica/${result.practice.id}/prossimo`);
}

export async function joinEditionAction(editionId: string): Promise<{ error: string } | never> {
  const userId = await requireUser();
  const result = await joinEdition({ userId, editionId });
  if ('error' in result) {
    return { error: result.error ?? 'Impossibile unirsi al viaggio.' };
  }
  revalidatePath('/pratiche');
  redirect(`/pratica/${result.practice.id}`);
}

export async function confirmHotelAction(practiceId: string) {
  const userId = await requireUser();
  const result = await confirmPracticeHotel(practiceId, userId);
  if ('error' in result) return result;
  revalidatePath(`/pratica/${practiceId}`);
  return { ok: true as const };
}

export async function confirmActivityAction(
  practiceId: string,
  recap?: Omit<ActivityBookingRecap, 'bookedAt'>
) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const bookedAt = new Date().toISOString();
  const full = recap ? { ...recap, bookedAt } : undefined;
  const result = await confirmPracticeActivity(practiceId, session.user.id, full);
  if ('error' in result) return result;
  if (full && session.user.email && 'practice' in result && result.practice) {
    const dest =
      findItineraryTemplate(result.practice.template_id)?.destination_name ?? 'il tuo viaggio';
    void sendBookingConfirmationEmail({
      to: session.user.email,
      kind: 'activity',
      destinationName: dest,
      practiceId,
      bookingRef: full.bookingRef,
      amountEur: full.amountEur,
      currency: full.currency,
      activity: full,
    });
  }
  revalidatePath(`/pratica/${practiceId}`);
  revalidatePath('/pratiche');
  return { ok: true as const };
}

/** Fase 1: crea viaggio in bozza da un risultato volo (prima del pagamento). */
export async function createTripFromFlightAction(input: {
  seed: FlightSearchSeed;
}): Promise<{ practiceId: string } | { error: string }> {
  const userId = await requireUser();
  const origin = input.seed.origin?.trim();
  const destination = input.seed.destination?.trim();
  if (!origin || !destination) {
    return { error: 'Origine e destinazione del volo mancanti.' };
  }
  const result = await createPracticeFromFlightSearch({
    userId,
    seed: { ...input.seed, origin, destination },
  });
  if ('error' in result) {
    return { error: result.error ?? 'Impossibile creare il viaggio.' };
  }
  revalidatePath('/pratiche');
  revalidatePath('/organizza');
  return { practiceId: result.practice.id };
}

/** Fase 1: crea viaggio in bozza da un risultato hotel (prima del pagamento). */
export async function createTripFromHotelAction(input: {
  seed: HotelSearchSeed;
}): Promise<{ practiceId: string } | { error: string }> {
  const userId = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.seed.checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(input.seed.checkout)) {
    return { error: 'Date hotel non valide.' };
  }
  const result = await createPracticeFromHotelSearch({
    userId,
    seed: input.seed,
  });
  if ('error' in result) {
    return { error: result.error ?? 'Impossibile creare il viaggio.' };
  }
  revalidatePath('/pratiche');
  revalidatePath('/organizza');
  return { practiceId: result.practice.id };
}

export async function renameEditionAction(input: {
  editionId: string;
  title: string | null;
  practiceId?: string;
}): Promise<{ ok: true; title: string | null } | { error: string }> {
  const userId = await requireUser();
  const result = await updateEditionTitle({
    editionId: input.editionId,
    userId,
    title: input.title,
  });
  if ('error' in result) return result;
  revalidatePath('/pratiche');
  revalidatePath('/partenze');
  if (input.practiceId) revalidatePath(`/pratica/${input.practiceId}`);
  revalidatePath(`/partenze/${input.editionId}`);
  return result;
}
