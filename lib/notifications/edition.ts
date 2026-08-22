import 'server-only';

import { createNotification } from '@/lib/data/notifications';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';

function displayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | null): string {
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user?.username) return `@${user.username}`;
  return 'Un viaggiatore';
}

export async function notifyEditionMemberJoined(input: {
  editionId: string;
  joinerId: string;
}): Promise<void> {
  const [{ data: edition }, { data: joiner }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from('editions')
      .select('id, template_id, date_from')
      .eq('id', input.editionId)
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('first_name, last_name, username')
      .eq('id', input.joinerId)
      .maybeSingle(),
    supabaseAdmin
      .from('edition_members')
      .select('user_id')
      .eq('edition_id', input.editionId)
      .neq('status', 'left')
      .neq('user_id', input.joinerId),
  ]);
  if (!edition) return;

  const tpl = findItineraryTemplate(String(edition.template_id));
  const dest = tpl?.destination_name ?? String(edition.template_id);
  const when = formatItDate(String(edition.date_from).slice(0, 10));
  const name = displayName(joiner);
  const title = `${name} si è aggiunto`;
  const body = `${dest} · ${when}. Aprite la chat di gruppo.`;
  const link = `/partenze/${input.editionId}`;

  await Promise.all(
    (members ?? []).map((m) =>
      createNotification({
        userId: m.user_id as string,
        type: 'edition_member_joined',
        title,
        body,
        link,
        metadata: { editionId: input.editionId, joinerId: input.joinerId },
      })
    )
  );
}

export async function notifyEditionFlightConfirmed(input: {
  editionId: string;
  userId: string;
}): Promise<void> {
  const [{ data: edition }, { data: user }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from('editions')
      .select('id, template_id, date_from')
      .eq('id', input.editionId)
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('first_name, last_name, username')
      .eq('id', input.userId)
      .maybeSingle(),
    supabaseAdmin
      .from('edition_members')
      .select('user_id')
      .eq('edition_id', input.editionId)
      .neq('status', 'left')
      .neq('user_id', input.userId),
  ]);
  if (!edition) return;

  const tpl = findItineraryTemplate(String(edition.template_id));
  const dest = tpl?.destination_name ?? String(edition.template_id);
  const name = displayName(user);
  const title = `${name} ha confermato il posto`;
  const body = `Volo prenotato su ${dest}.`;
  const link = `/partenze/${input.editionId}`;

  await Promise.all(
    (members ?? []).map((m) =>
      createNotification({
        userId: m.user_id as string,
        type: 'edition_flight_confirmed',
        title,
        body,
        link,
        metadata: { editionId: input.editionId, userId: input.userId },
      })
    )
  );
}
