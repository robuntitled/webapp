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
  const data = parseJsonSafe(raw) as { error?: string } & Partial<ComposerGenerateResponse>;

  if (!response.ok) {
    throw new Error(data.error ?? `Generazione fallita (HTTP ${response.status})`);
  }

  return data as ComposerGenerateResponse;
}