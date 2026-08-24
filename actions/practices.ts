'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createOrReuseDraftPractice, createPractice } from '@/lib/data/practices';
import { createPrivateEdition, joinEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import {
  confirmPracticeActivity,
  confirmPracticeFlight,
  confirmPracticeHotel,
} from '@/lib/data/practices';
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
}): Promise<{ error: string } | never> {
  const userId = await requireUser();
  if (input.mode === 'group') {
    return { error: 'In gruppo si entra solo su una partenza ufficiale.' };
  }
  if (!findItineraryTemplate(input.templateId)) {
    return { error: 'Template non trovato.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateFrom)) {
    return { error: 'Scegli una data di partenza.' };
  }

  if (input.mode === 'friends') {
    const result = await createPrivateEdition({
      userId,
      templateId: input.templateId,
      dateFrom: input.dateFrom,
    });
    if ('error' in result) return result;
    revalidatePath('/pratiche');
    redirect(`/pratica/${result.practice.id}`);
  }

  const result = await createOrReuseDraftPractice({
    userId,
    templateId: input.templateId,
    mode: 'solo',
    dateFrom: input.dateFrom,
  });
  if ('error' in result) return result;
  revalidatePath('/pratiche');
  redirect(`/pratica/${result.practice.id}`);
}

export async function joinEditionAction(editionId: string): Promise<{ error: string } | never> {
  const userId = await requireUser();
  const result = await joinEdition({ userId, editionId });
  if ('error' in result) return result;
  revalidatePath('/pratiche');
  redirect(`/pratica/${result.practice.id}`);
}

export async function confirmFlightAction(practiceId: string) {
  const userId = await requireUser();
  const result = await confirmPracticeFlight(practiceId, userId);
  if ('error' in result) return result;
  revalidatePath(`/pratica/${practiceId}`);
  return { ok: true as const };
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
