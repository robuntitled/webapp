import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  isCheapAssistIntent,
  mockAssistReply,
  replyToAssist,
  type AssistRequest,
} from '@/lib/composer/assist';
import { isResearchAssistIntent } from '@/lib/composer/assist-research';
import { rateLimitAsync } from '@/lib/rate-limit';
import { plannerProfileSchema } from '@/lib/validations/planner';
import { logApiMetric } from '@/lib/api/metrics';

export const maxDuration = 60;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

const assistSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(messageSchema).max(20).optional(),
  draft: z.record(z.string(), z.unknown()).optional(),
  step: z.enum(['source', 'landing', 'plan', 'review']),
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

  const limited = await rateLimitAsync(`composer-assist:${session.user.id}`, {
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Limite messaggi raggiunto' }, { status: 429 });
  }

  const assistReq: AssistRequest = {
    message: parsed.data.message,
    history: parsed.data.history,
    draft: parsed.data.draft ?? {},
    step: parsed.data.step === 'source' ? 'landing' : parsed.data.step,
    plannerProfile: parsed.data.plannerProfile,
  };

  if (isResearchAssistIntent(assistReq.message)) {
    logApiMetric({
      service: 'ai',
      op: 'assist-route',
      source: 'network',
      userId: session.user.id,
    });
    const result = await replyToAssist(assistReq);
    return NextResponse.json(result);
  }

  if (isCheapAssistIntent(assistReq.message)) {
    logApiMetric({
      service: 'ai',
      op: 'assist-route',
      source: 'mock',
      userId: session.user.id,
    });
    return NextResponse.json({
      reply: mockAssistReply(assistReq),
      source: 'mock' as const,
    });
  }

  const aiLimited = await rateLimitAsync(`composer-assist-ai:${session.user.id}`, {
    limit: 25,
    windowMs: 60 * 60 * 1000,
  });
  if (!aiLimited.ok) {
    logApiMetric({
      service: 'ai',
      op: 'assist-route',
      source: 'mock',
      userId: session.user.id,
      extra: { reason: 'user_ai_cap' },
    });
    return NextResponse.json({
      reply: mockAssistReply(assistReq),
      source: 'mock' as const,
    });
  }

  const result = await replyToAssist(assistReq);
  return NextResponse.json(result);
}
