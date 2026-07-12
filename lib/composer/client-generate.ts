import type { ComposerGenerateRequest, ComposerGenerateResponse } from '@/types/composer';

export async function requestDayGeneration(
  body: ComposerGenerateRequest
): Promise<ComposerGenerateResponse> {
  const response = await fetch('/api/composer/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Generazione fallita');
  }

  return data as ComposerGenerateResponse;
}