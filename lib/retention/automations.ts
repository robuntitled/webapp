import 'server-only';

import { differenceInCalendarDays, parseISO } from 'date-fns';
import { createNotification, type NotificationType } from '@/lib/data/notifications';
import { sendTransactionalEmail } from '@/lib/email/send';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPoints } from '@/lib/commerce/points-ledger';
import { grantExploreBoostForUser } from '@/lib/commerce/trip-milestones';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

function isMissing(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === '42703';
}

async function alreadySent(kind: string, userId: string, ref: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('automation_sends')
    .select('id')
    .eq('kind', kind)
    .eq('user_id', userId)
    .eq('ref', ref)
    .maybeSingle();
  if (error && !isMissing(error)) console.error('[automation_sends read]', error.message);
  return Boolean(data?.id);
}

async function markSent(kind: string, userId: string, ref: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('automation_sends').insert({
    kind,
    user_id: userId,
    ref,
  });
  if (error?.code === '23505') return false;
  if (error) {
    if (!isMissing(error)) console.error('[automation_sends insert]', error.message);
    return false;
  }
  return true;
}

async function notify(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  subject: string;
  emailText: string;
}) {
  await createNotification({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: opts.link,
  });
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, email_verified_at')
    .eq('id', opts.userId)
    .maybeSingle();
  const email = user?.email?.trim();
  if (!email || !user?.email_verified_at) return;
  const base = getAppBaseUrl();
  void sendTransactionalEmail({
    to: email,
    subject: opts.subject,
    text: opts.emailText,
    html: `<p>${opts.emailText.replace(/\n/g, '<br/>')}</p><p><a href="${base}${opts.link}">Apri NomadLink</a></p><p style="color:#64748b;font-size:12px">${COMPLIANCE_COPY.pointsNoMoney}</p>`,
  }).catch((e) => console.error('[retention email]', e));
}

async function tripMembers(tripId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id')
    .eq('trip_id', tripId);
  return (data ?? []).map((r) => r.user_id as string);
}

export async function runRetentionAutomations(now = new Date()): Promise<{
  feedback: number;
  secondTrip: number;
  day90: number;
  dormant: number;
  near: number;
  reached: number;
  departedInvites: number;
}> {
  const stats = {
    feedback: 0,
    secondTrip: 0,
    day90: 0,
    dormant: 0,
    near: 0,
    reached: 0,
    departedInvites: 0,
  };

  const { data: trips, error } = await supabaseAdmin
    .from('trips')
    .select('id, title, creator_id, start_date, end_date, min_participants')
    .in('status', ['forming', 'confirmed', 'published']);
  if (error && !isMissing(error)) console.error('[retention trips]', error.message);

  for (const trip of trips ?? []) {
    const title = String(trip.title ?? 'Trip');
    const min = Number(trip.min_participants) || 1;
    const members = await tripMembers(trip.id as string);
    const count = members.length;
    const start = parseISO(String(trip.start_date));
    const end = parseISO(String(trip.end_date));

    if (count >= min) {
      for (const userId of members) {
        const ref = trip.id as string;
        if (await alreadySent('threshold_reached', userId, ref)) continue;
        if (!(await markSent('threshold_reached', userId, ref))) continue;
        await notify({
          userId,
          type: 'threshold_reached',
          title: 'Soglia del gruppo raggiunta',
          body: `«${title}» ha il minimo. Ora ognuno prenota i propri servizi.`,
          link: `/viaggi/${trip.id}`,
          subject: 'Soglia del gruppo raggiunta',
          emailText: `Il gruppo di «${title}» ha raggiunto la soglia. Aprite la chat, poi ognuno prenota voli e hotel per conto proprio.`,
        });
        stats.reached += 1;
      }
    } else if (min - count <= 2 && min - count > 0) {
      const creatorId = trip.creator_id as string | null;
      if (creatorId && !(await alreadySent('threshold_near', creatorId, trip.id as string))) {
        if (await markSent('threshold_near', creatorId, trip.id as string)) {
          await notify({
            userId: creatorId,
            type: 'threshold_near',
            title: 'Vicini alla soglia del gruppo',
            body: `A «${title}» mancano ${min - count} posti al minimo.`,
            link: `/viaggi/${trip.id}`,
            subject: 'Quasi alla soglia del gruppo',
            emailText: `Mancano ${min - count} persone a «${title}». Invita chi è indeciso.`,
          });
          stats.near += 1;
        }
      }
    }

    if (!Number.isNaN(end.getTime())) {
      const hoursAfterEnd = (now.getTime() - end.getTime()) / 36e5;
      if (hoursAfterEnd >= 48 && hoursAfterEnd <= 80) {
        for (const userId of members) {
          const ref = trip.id as string;
          if (await alreadySent('trip_feedback', userId, ref)) continue;
          if (!(await markSent('trip_feedback', userId, ref))) continue;
          await notify({
            userId,
            type: 'trip_feedback',
            title: 'Com’è andato il tuo Trip?',
            body: `Lascia un feedback su «${title}». +40 punti se è completo e utile.`,
            link: `/viaggi/${trip.id}`,
            subject: 'Com’è andato il tuo Trip?',
            emailText: `Com’è andato «${title}»? Lascia il tuo feedback. Se è completo e utile: +40 NomadPoints (non sono denaro).`,
          });
          stats.feedback += 1;
        }
      }
    }

    if (!Number.isNaN(start.getTime()) && start.getTime() <= now.getTime()) {
      const { data: invites } = await supabaseAdmin
        .from('trip_invites')
        .select('id, from_user_id, to_user_id')
        .eq('trip_id', trip.id)
        .eq('status', 'accepted');
      for (const inv of invites ?? []) {
        if (!inv.from_user_id || !inv.to_user_id) continue;
        if (!members.includes(inv.to_user_id as string)) continue;
        const awarded = await awardPoints({
          userId: inv.from_user_id as string,
          action: 'invite_trip_departed',
          ref: inv.id as string,
        });
        if (awarded > 0) stats.departedInvites += 1;
      }
    }
  }

  const { data: reviews } = await supabaseAdmin
    .from('user_reviews')
    .select('reviewer_id, rating, body, created_at')
    .gte('rating', 4);
  for (const row of reviews ?? []) {
    const bodyLen = String(row.body ?? '').trim().length;
    if (bodyLen < 40) continue;
    const userId = row.reviewer_id as string;
    if (await alreadySent('second_trip', userId, 'positive')) continue;
    if (!(await markSent('second_trip', userId, 'positive'))) continue;
    await notify({
      userId,
      type: 'second_trip',
      title: 'Crea il tuo Trip o unisciti',
      body: 'Esperienza positiva: punti moltiplicati in finestra lancio e più visibilità.',
      link: '/dashboard',
      subject: 'Crea il tuo Trip, o unisciti',
      emailText:
        'Bello sapere che il Trip è andato. Crea il tuo Trip o unisciti a uno nuovo: in finestra lancio i punti invito sono moltiplicati.',
    });
    stats.secondTrip += 1;
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, created_at')
    .limit(2000);
  for (const user of users ?? []) {
    const created = new Date(String(user.created_at));
    if (Number.isNaN(created.getTime())) continue;
    const ageDays = differenceInCalendarDays(now, created);
    if (ageDays >= 90 && ageDays <= 97) {
      if (await alreadySent('day90_incentive', user.id as string, 'd90')) continue;
      if (!(await markSent('day90_incentive', user.id as string, 'd90'))) continue;
      await awardPoints({
        userId: user.id as string,
        action: 'day90_bonus',
        ref: 'day90',
      });
      await grantExploreBoostForUser(user.id as string, 7, 'day90');
      await notify({
        userId: user.id as string,
        type: 'day90_incentive',
        title: '+50 punti e boost 7 giorni',
        body: 'Incentivo 90 giorni: esplora i Trip o creane uno.',
        link: '/dashboard',
        subject: 'Un boost per ripartire',
        emailText: '+50 NomadPoints e un boost di 7 giorni. Esplora i Trip o creane uno. I punti non sono denaro.',
      });
      stats.day90 += 1;
    }

    const { data: lastNotif } = await supabaseAdmin
      .from('user_notifications')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastAt = lastNotif?.created_at ? new Date(String(lastNotif.created_at)) : created;
    const idle = differenceInCalendarDays(now, lastAt);
    if (idle >= 45 && idle <= 60) {
      if (await alreadySent('dormant', user.id as string, `idle-${idle}`)) continue;
      if (!(await markSent('dormant', user.id as string, 'idle'))) continue;
      await notify({
        userId: user.id as string,
        type: 'dormant',
        title: 'Vedi i Trip disponibili',
        body: 'Niente fretta. Dai un’occhiata ai viaggi in formazione.',
        link: '/dashboard',
        subject: 'Nuovi Trip disponibili',
        emailText: 'Se vuoi, ci sono nuovi Trip in formazione. Vedi i Trip disponibili — senza pacchetto fisso.',
      });
      stats.dormant += 1;
    }
  }

  return stats;
}
