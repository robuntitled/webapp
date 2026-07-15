'use server';

import { auth } from '@/auth';
import { deleteComposerDraft } from '@/lib/data/planner-profile';
import { revalidatePath } from 'next/cache';

export async function discardComposerDraft(): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Non autenticato');
  }

  await deleteComposerDraft(session.user.id);
  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard/crea');

  return { ok: true };
}