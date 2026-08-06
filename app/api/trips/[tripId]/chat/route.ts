import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTripMessages, isTripMember, postTripMessage } from '@/lib/data/trip-chat';
import { moderatePostContent } from '@/lib/moderation/moderate-post';
import { z } from 'zod';

const postSchema = z.object({
  body: z.string().min(1).max(2000),
});

type RouteContext = { params: Promise<{ tripId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { tripId } = await context.params;
  const allowed = await isTripMember(tripId, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: 'Accesso chat non consentito' }, { status: 403 });
  }

  const since = new URL(request.url).searchParams.get('since') ?? undefined;

  try {
    const messages = await getTripMessages(tripId, since);
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore chat';
    return NextResponse.json(
      {
        error: message,
        hint: message.includes('trip_messages') ? 'Esegui npm run db:chat' : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { tripId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Messaggio non valido' }, { status: 400 });
  }

  const moderation = moderatePostContent({ text: parsed.data.body });
  if (!moderation.ok) {
    return NextResponse.json({ error: moderation.error }, { status: 400 });
  }

  try {
    const message = await postTripMessage(tripId, session.user.id, parsed.data.body);
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invio fallito';
    const status = message.includes('Non fai parte') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}