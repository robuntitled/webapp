import type { ComposerGenerateRequest, ComposerGenerateResponse } from '@/types/composer';

function parseJsonSafe(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Risposta server vuota');
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(
      'Risposta server non leggibile (timeout o errore rete). Riprova tra qualche secondo.'
    );
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function pollJob(jobId: string): Promise<ComposerGenerateResponse> {
  const maxAttempts = 90; // ~90s con backoff leggero
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`/api/composer/jobs/${jobId}`, { cache: 'no-store' });
    const raw = await res.text();
    const data = parseJsonSafe(raw) as {
      error?: string;
      status?: string;
      result?: ComposerGenerateResponse;
    };

    if (!res.ok) {
      throw new Error(data.error ?? `Job fallito (HTTP ${res.status})`);
    }

    if (data.status === 'done' && data.result) {
      return data.result;
    }
    if (data.status === 'error') {
      throw new Error(data.error ?? 'Generazione fallita');
    }

    await sleep(i < 10 ? 800 : 1200);
  }
  throw new Error('Generazione troppo lenta — riprova');
}

export async function requestDayGeneration(
  body: ComposerGenerateRequest
): Promise<ComposerGenerateResponse> {
  let response: Response;
  try {
    response = await fetch('/api/composer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Connessione interrotta — controlla la rete e riprova');
  }

  const raw = await response.text();
  const data = parseJsonSafe(raw) as {
    error?: string;
    jobId?: string;
    status?: string;
  } & Partial<ComposerGenerateResponse>;

  if (response.status === 202 && data.jobId) {
    return pollJob(data.jobId);
  }

  if (!response.ok) {
    throw new Error(data.error ?? `Generazione fallita (HTTP ${response.status})`);
  }

  // Risposta sync (fallback o emergency mock)
  return data as ComposerGenerateResponse;
}
