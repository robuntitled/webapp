import 'server-only';

import { systemAdmin } from '@/lib/supabase-scoped';
import {
  buildEmergencyMockResponse,
  orchestrateDayGeneration,
} from '@/lib/composer/orchestrator';
import type { ComposerGenerateRequest, ComposerGenerateResponse } from '@/types/composer';
import { recordCostEvent } from '@/lib/api/cost-events';

export type AiJobStatus = 'queued' | 'running' | 'done' | 'error';

export type AiJobRow = {
  id: string;
  user_id: string;
  status: AiJobStatus;
  request: ComposerGenerateRequest;
  result: ComposerGenerateResponse | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export async function enqueueGenerateJob(
  userId: string,
  request: ComposerGenerateRequest
): Promise<string> {
  const { data, error } = await systemAdmin()
    .from('composer_ai_jobs')
    .insert({
      user_id: userId,
      status: 'queued',
      request,
    })
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

export async function processGenerateJob(jobId: string): Promise<void> {
  const admin = systemAdmin();
  const { data: job } = await admin
    .from('composer_ai_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (!job || job.status === 'done' || job.status === 'error') return;
  if (job.status === 'running') return;

  await admin
    .from('composer_ai_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'queued');

  const request = job.request as ComposerGenerateRequest;

  try {
    const result = await orchestrateDayGeneration(request);
    await admin
      .from('composer_ai_jobs')
      .update({
        status: 'done',
        result,
        finished_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    const source = result.meta?.source ?? 'none';
    await recordCostEvent({
      service: 'ai',
      op: 'generate-day',
      source: source === 'ai' ? 'network' : source === 'cache' ? 'cache' : 'mock',
      costUsd: source === 'ai' ? 0.002 : 0,
      userId: job.user_id,
      meta: { jobId, model: result.meta?.model },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore generazione';
    const fallback = buildEmergencyMockResponse(request, message);
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
