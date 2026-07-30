import 'server-only';

import { systemAdmin } from '@/lib/supabase-scoped';
import {
  buildEmergencyMockResponse,
  orchestrateDayGeneration,
} from '@/lib/composer/orchestrator';
import {
  buildEmergencyTripResponse,
  orchestrateTripGeneration,
  VagueDestinationError,
} from '@/lib/composer/trip-orchestrator';
import type {
  ComposerGenerateRequest,
  ComposerGenerateResponse,
  ComposerJobProgress,
  ComposerTripGenerateRequest,
  ComposerTripGenerateResponse,
} from '@/types/composer';
import { recordCostEvent } from '@/lib/api/cost-events';

export type AiJobStatus = 'queued' | 'running' | 'done' | 'error';
export type AiJobKind = 'day' | 'full_trip';

type AnyJobRequest = ComposerGenerateRequest | ComposerTripGenerateRequest;
type AnyJobResult = ComposerGenerateResponse | ComposerTripGenerateResponse;

export type AiJobRow = {
  id: string;
  user_id: string;
  status: AiJobStatus;
  request: AnyJobRequest & { kind?: AiJobKind };
  result: AnyJobResult | null;
  progress?: ComposerJobProgress | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

/** Job "running" più vecchio di questa soglia = worker morto → si può riprovare. */
const STALE_RUNNING_MS = 3 * 60 * 1000;

function isTripRequest(request: AnyJobRequest & { kind?: AiJobKind }): boolean {
  return request.kind === 'full_trip' || Array.isArray((request as ComposerTripGenerateRequest).days);
}

export async function enqueueGenerateJob(
  userId: string,
  request: ComposerGenerateRequest
): Promise<string> {
  return insertJob(userId, { ...request, kind: 'day' });
}

export async function enqueueTripJob(
  userId: string,
  request: ComposerTripGenerateRequest
): Promise<string> {
  return insertJob(userId, { ...request, kind: 'full_trip' });
}

async function insertJob(
  userId: string,
  request: AnyJobRequest & { kind: AiJobKind }
): Promise<string> {
  const { data, error } = await systemAdmin()
    .from('composer_ai_jobs')
    .insert({ user_id: userId, status: 'queued', request })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Impossibile creare job AI');
  }
  return data.id as string;
}

export async function getGenerateJob(
  jobId: string,
  userId: string
): Promise<AiJobRow | null> {
  const { data, error } = await systemAdmin()
    .from('composer_ai_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AiJobRow;
}

/** La colonna `progress` può non esistere in DB non ancora migrati: best-effort. */
async function writeProgress(jobId: string, progress: ComposerJobProgress): Promise<void> {
  try {
    await systemAdmin().from('composer_ai_jobs').update({ progress }).eq('id', jobId);
  } catch {
    // migrazione 018 non applicata — l'avanzamento è solo cosmetico
  }
}

function isStaleRunning(job: AiJobRow): boolean {
  if (job.status !== 'running' || !job.started_at) return false;
  return Date.now() - new Date(job.started_at).getTime() > STALE_RUNNING_MS;
}

export async function processGenerateJob(jobId: string): Promise<void> {
  const admin = systemAdmin();
  const { data } = await admin
    .from('composer_ai_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  const job = data as AiJobRow | null;
  if (!job || job.status === 'done' || job.status === 'error') return;
  if (job.status === 'running' && !isStaleRunning(job)) return;

  await admin
    .from('composer_ai_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId);

  const request = job.request;
  const trip = isTripRequest(request);

  try {
    const result = trip
      ? await orchestrateTripGeneration(request as ComposerTripGenerateRequest, (progress) =>
          void writeProgress(jobId, progress)
        )
      : await orchestrateDayGeneration(request as ComposerGenerateRequest);

    await admin
      .from('composer_ai_jobs')
      .update({ status: 'done', result, finished_at: new Date().toISOString() })
      .eq('id', jobId);

    const source = result.meta?.source ?? 'none';
    await recordCostEvent({
      service: 'ai',
      op: trip ? 'generate-trip' : 'generate-day',
      source: source === 'ai' ? 'network' : source === 'cache' ? 'cache' : 'mock',
      costUsd: source === 'ai' ? (trip ? 0.006 : 0.002) : 0,
      userId: job.user_id,
      meta: { jobId, model: result.meta?.model },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore generazione';

    // Destinazione troppo generica: errore vero, non ha senso un fallback smart
    if (e instanceof VagueDestinationError) {
      await admin
        .from('composer_ai_jobs')
        .update({
          status: 'error',
          error_message: message,
          finished_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return;
    }

    const fallback = trip
      ? buildEmergencyTripResponse(request as ComposerTripGenerateRequest, message)
      : buildEmergencyMockResponse(request as ComposerGenerateRequest, message);

    await admin
      .from('composer_ai_jobs')
      .update({
        status: 'done',
        result: fallback,
        error_message: message,
        finished_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
