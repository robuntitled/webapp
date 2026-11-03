import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { rateLimitJson } from '@/lib/api/request-guard';
import { blockUser, unblockUser } from '@/lib/data/chat-moderation';

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['block', 'unblock']).default('block'),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const limited = await rateLimitJson(`chat-block:${session.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati blocco non validi' }, { status: 400 });
  }

  const result =
    parsed.data.action === 'unblock'
      ? await unblockUser({
          blockerId: session.user.id,
          blockedId: parsed.data.userId,
        })
      : await blockUser({
          blockerId: session.user.id,
          blockedId: parsed.data.userId,
        });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        needsMigration: result.needsMigration ?? false,
      },
      { status: result.needsMigration ? 503 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    action: parsed.data.action,
    message:
      parsed.data.action === 'unblock'
        ? 'Utente sbloccato.'
        : 'Utente bloccato. Non vedrai più i suoi messaggi in chat.',
  });
}
