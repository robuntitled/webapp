import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { rateLimitJson } from '@/lib/api/request-guard';
import { createChatReport } from '@/lib/data/chat-moderation';

const schema = z.object({
  target: z.enum(['message', 'profile', 'group']),
  reason: z.string().min(3).max(1000),
  editionId: z.string().uuid().optional().nullable(),
  messageId: z.string().uuid().optional().nullable(),
  reportedUserId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const limited = await rateLimitJson(`chat-report:${session.user.id}`, {
    limit: 10,
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
    return NextResponse.json({ error: 'Dati segnalazione non validi' }, { status: 400 });
  }

  const result = await createChatReport({
    reporterId: session.user.id,
    target: parsed.data.target,
    reason: parsed.data.reason,
    editionId: parsed.data.editionId,
    messageId: parsed.data.messageId,
    reportedUserId: parsed.data.reportedUserId,
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
    id: result.id,
    message: 'Segnalazione ricevuta. Grazie: la esamineremo al più presto.',
  });
}
