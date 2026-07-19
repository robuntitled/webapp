import { after, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { composerGenerateRequestSchema } from '@/lib/composer/generate-schemas';
import {
  buildEmergencyMockResponse,
  orchestrateDayGeneration,
} from '@/lib/composer/orchestrator';
import { shouldUseExternalAi } from '@/lib/ai/config';
import { rateLimitAsync } from '@/lib/rate-limit';
import { enqueueGenerateJob, processGenerateJob } from '@/lib/composer/jobs';

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = composerGenerateRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Richiesta non valida', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const limited = await rateLimitAsync(`composer-gen:${session.user.id}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Limite generazioni raggiunto, riprova più tardi' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
      }
    );
  }

  if ((await shouldUseExternalAi()).use) {
    const aiLimited = await rateLimitAsync(`composer-ai:${session.user.id}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!aiLimited.ok) {
      return NextResponse.json(
        buildEmergencyMockResponse(
          parsed.data,
          'Limite AI personale raggiunto (5/ora) — suggerimenti smart'
        )
      );
    }
  }

  // sync=1 → comportamento legacy (test / fallback)
  const sync = new URL(request.url).searchParams.get('sync') === '1';
  if (sync) {
    try {
      const result = await orchestrateDayGeneration(parsed.data);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(buildEmergencyMockResponse(parsed.data));
    }
  }

  try {
    const jobId = await enqueueGenerateJob(session.user.id, parsed.data);
    after(() => processGenerateJob(jobId));
    return NextResponse.json({ jobId, status: 'queued' as const }, { status: 202 });
  } catch (e) {
    // Tabella job assente / DB down → fallback sync
    console.warn('[generate] async enqueue failed, sync fallback', e);
    try {
      const result = await orchestrateDayGeneration(parsed.data);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(buildEmergencyMockResponse(parsed.data));
    }
  }
}
