'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { PERKS } from '@/lib/commerce/points';
import { getPointsBalance, redeemPerkPoints } from '@/lib/commerce/points-ledger';
import { evaluateQualityGate } from '@/lib/composer/quality-gate';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { addDays, format } from 'date-fns';

const schema = z.object({
  perkId: z.enum([
    'trip_boost_7d',
    'trip_boost_14d',
    'premium_templates',
    'priority_explore',
    'early_access',
    'badge_founder',
  ]),
  tripId: z.string().uuid().optional(),
});

export async function redeemNomadPerk(input: {
  perkId: string;
  tripId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per riscattare.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Perk non valido.' };

  const perk = PERKS.find((p) => p.id === parsed.data.perkId);
  if (!perk) return { ok: false, error: 'Perk non trovato.' };

  if (perk.requiresTrip) {
    if (!parsed.data.tripId) return { ok: false, error: 'Scegli il Trip da boostare.' };
    const { data: trip } = await supabaseAdmin
      .from('trips')
      .select(
        'id, creator_id, title, destination, description, start_date, end_date, price, min_participants, max_participants, planning_mode'
      )
      .eq('id', parsed.data.tripId)
      .maybeSingle();
    if (!trip || trip.creator_id !== userId) {
      return { ok: false, error: 'Puoi boostare solo un tuo Trip.' };
    }
    const issues = evaluateQualityGate({
      title: String(trip.title ?? ''),
      destination: String(trip.destination ?? ''),
      startDate: String(trip.start_date ?? '').slice(0, 10),
      endDate: String(trip.end_date ?? '').slice(0, 10),
      description: String(trip.description ?? ''),
      budgetOrientativo: Number(trip.price) || 0,
      minParticipants: Number(trip.min_participants) || 0,
      maxParticipants: Number(trip.max_participants) || 0,
      planningMode: trip.planning_mode === 'solo' ? 'solo' : 'group',
    });
    if (issues.length) {
      return { ok: false, error: issues[0].message };
    }
  }

  const balance = await getPointsBalance(userId);
  if (balance < perk.cost) return { ok: false, error: 'Punti insufficienti.' };

  const ref = `${perk.id}:${parsed.data.tripId ?? userId}`;
  const spent = await redeemPerkPoints({
    userId,
    perkId: perk.id,
    cost: perk.cost,
    ref,
    meta: { tripId: parsed.data.tripId },
  });
  if (!spent.ok) return spent;

  if (perk.id === 'trip_boost_7d' || perk.id === 'trip_boost_14d' || perk.id === 'priority_explore') {
    const days = perk.id === 'trip_boost_14d' ? 14 : perk.id === 'priority_explore' ? 30 : 7;
    const until = format(addDays(new Date(), days), "yyyy-MM-dd'T'HH:mm:ssXXX");
    if (parsed.data.tripId) {
      await supabaseAdmin
        .from('trips')
        .update({ boost_until: until, boost_source: perk.id })
        .eq('id', parsed.data.tripId)
        .eq('creator_id', userId);
    }
  }

  await supabaseAdmin.from('user_perks').upsert({
    user_id: userId,
    perk_id: perk.id,
    expires_at:
      perk.id === 'early_access' || perk.id === 'premium_templates' || perk.id === 'badge_founder'
        ? null
        : format(addDays(new Date(), perk.id === 'priority_explore' ? 30 : 14), "yyyy-MM-dd'T'HH:mm:ssXXX"),
  });

  revalidatePath('/dashboard/punti');
  revalidatePath('/dashboard');
  return { ok: true };
}
