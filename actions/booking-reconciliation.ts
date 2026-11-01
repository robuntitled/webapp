'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { resolveBookingReconciliation } from '@/lib/data/booking-reconciliation';

export async function resolveBookingReconciliationAction(input: {
  id: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return { ok: false, error: 'Non autorizzato.' };
  }
  const result = await resolveBookingReconciliation({
    id: input.id,
    adminUserId: session.user.id,
    note: input.note,
    status: 'resolved',
  });
  if (result.ok) revalidatePath('/dashboard/costi');
  return result;
}
