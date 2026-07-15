import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { replyToAssist } from '@/lib/composer/assist';
import { rateLimit } from '@/lib/rate-limit';
import { plannerProfileSchema } from '@/lib/validations/planner';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

const assistSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(messageSchema).max(20).optional(),
  draft: z.record(z.string(), z.unknown()).optional(),
  step: z.enum(['landing', 'plan', 'review']),
  plannerProfile: plannerProfileSchema.optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const parsed = assistSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Messaggio non valido' }, { status: 400 });
  }

  const limited = rateLimit(`composer-assist:${session.user.id}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!limited.ok) {
    return NextResponse.json({ error: 'Limite messaggi raggiunto' }, { status: 429 });
  }

  const result = await replyToAssist({
    message: parsed.data.message,
    history: parsed.data.history,
    draft: parsed.data.draft ?? {},
    step: parsed.data.step,
    plannerProfile: parsed.data.plannerProfile,
  });

  return NextResponse.json(result);
}