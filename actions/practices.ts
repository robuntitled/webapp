'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createPractice } from '@/lib/data/practices';
import { createPrivateEdition, joinEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import {
  confirmPracticeActivity,
  confirmPracticeFlight,
  confirmPracticeHotel,
} from '@/lib/data/practices';
import type { TravelMode } from '@/lib/itineraries/types';

function requireUser() {
  return auth().then((session) => {
    if (!session?.user?.id) redirect('/');
    return session.user.id;
  });
}

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

  const result = await createPractice({
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

export async function confirmActivityAction(practiceId: string) {
  const userId = await requireUser();
  const result = await confirmPracticeActivity(practiceId, userId);
  if ('error' in result) return result;
  revalidatePath(`/pratica/${practiceId}`);
  return { ok: true as const };
}
