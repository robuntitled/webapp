'use server';

import { auth } from '@/auth';
import { getEdition, getEditionByToken } from '@/lib/data/editions';
import { getPractice } from '@/lib/data/practices';
import { parseTripShareLink, TRIP_LINK_ERRORS } from '@/lib/itineraries/trip-link';

export type ResolveTripLinkResult =
  | { href: string }
  | { error: string };

export async function resolveTripLinkAction(raw: string): Promise<ResolveTripLinkResult> {
  const parsed = parseTripShareLink(raw);
  if (parsed.kind === 'invalid') {
    return { error: TRIP_LINK_ERRORS[parsed.reason] };
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (parsed.kind === 'invito') {
    const edition = await getEditionByToken(parsed.token);
    if (!edition) return { error: TRIP_LINK_ERRORS.missing };
    if (edition.status === 'closed' || edition.status === 'locked') {
      return { error: TRIP_LINK_ERRORS.unavailable };
    }
    return { href: `/partenze/${edition.id}` };
  }

  if (parsed.kind === 'pratica') {
    if (!userId) return { href: `/?callbackUrl=${encodeURIComponent(`/pratica/${parsed.id}`)}` };
    const practice = await getPractice(parsed.id, userId);
    if (!practice) return { error: TRIP_LINK_ERRORS.missing };
    return { href: `/pratica/${practice.id}` };
  }

  const editionId = parsed.kind === 'partenza' || parsed.kind === 'edizione' ? parsed.id : null;
  if (!editionId) return { error: TRIP_LINK_ERRORS.unrecognized };
  if (editionId.startsWith('seed-')) return { error: TRIP_LINK_ERRORS.unavailable };

  const edition = await getEdition(editionId);
  if (!edition) return { error: TRIP_LINK_ERRORS.missing };
  if (edition.status === 'closed' || edition.status === 'locked') {
    return { error: TRIP_LINK_ERRORS.unavailable };
  }
  return { href: `/partenze/${edition.id}` };
}
