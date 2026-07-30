import { after, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { composerTripGenerateRequestSchema } from '@/lib/composer/trip-generate-schemas';
import {
  checkDestinationPlannable,
  resolveDestinationContext,
} from '@/lib/composer/destination-context';
import {
  buildEmergencyTripResponse,
  orchestrateTripGeneration,
  VagueDestinationError,
} from '@/lib/composer/trip-orchestrator';
import { enqueueTripJob, processGenerateJob } from '@/lib/composer/jobs';
import { buildOrganizerOrigin } from '@/lib/composer/origins';
import { getUserProfile } from '@/lib/data/users';
import { shouldUseExternalAi } from '@/lib/ai/config';
import { rateLimitAsync } from '@/lib/rate-limit';
import type { ComposerTripGenerateRequest } from '@/types/composer';

export const maxDuration = 300;

/**
 * Partenza: prima quella scelta nel composer (geolocalizzazione/città digitata),
 * poi la città del profilo utente. Mai un hub inventato senza dirlo.
 */
async function resolveOrigin(
  parsed: ComposerTripGenerateRequest,
  userId: string
): Promise<ComposerTripGenerateRequest> {
  if (parsed.organizerOrigin) return parsed;

  const profile = await getUserProfile(userId).catch(() => null);
  const city = profile?.address_city?.trim();
  if (!city) return parsed;

  return {
    ...parsed,
    organizerOrigin: buildOrganizerOrigin(city, profile?.country ?? undefined),
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = composerTripGenerateRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Richiesta non valida', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Blocco prima di spendere: destinazione paese-only senza hub noto
  const destination = resolveDestinationContext(
    parsed.data.destination,
    parsed.data.destinationMeta
  );
  const check = checkDestinationPlannable(destination);
  if (!check.ok) {
    return NextResponse.json(
      { error: check.message, code: 'vague_destination', suggestions: destination.hubSuggestions },
      { status: 422 }
    );
  }

  const limited = await rateLimitAsync(`composer-trip:${session.user.id}`, {
    limit: 6,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Limite itinerari completi raggiunto (6/ora), riprova più tardi' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
      }
    );
  }

  if ((await shouldUseExternalAi()).use) {
    const aiLimited = await rateLimitAsync(`composer-trip-ai:${session.user.id}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!aiLimited.ok) {
      return NextResponse.json(
        buildEmergencyTripResponse(
          parsed.data,
          'Limite AI personale raggiunto (3 viaggi/ora) — itinerario smart'
        )
      );
    }
  }

  const body = await resolveOrigin(parsed.data, session.user.id);

  const sync = new URL(request.url).searchParams.get('sync') === '1';
  if (sync) {
    try {
      return NextResponse.json(await orchestrateTripGeneration(body));
    } catch (e) {
      if (e instanceof VagueDestinationError) {
        return NextResponse.json(
          { error: e.message, code: 'vague_destination' },
          { status: 422 }
        );
      }
      return NextResponse.json(buildEmergencyTripResponse(body));
    }
  }

  try {
    const jobId = await enqueueTripJob(session.user.id, body);
    after(() => processGenerateJob(jobId));
    return NextResponse.json({ jobId, status: 'queued' as const }, { status: 202 });
  } catch (e) {
    console.warn('[generate-trip] async enqueue failed, sync fallback', e);
    try {
      return NextResponse.json(await orchestrateTripGeneration(body));
    } catch {
      return NextResponse.json(buildEmergencyTripResponse(body));
    }
  }
}
