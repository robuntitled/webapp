import 'server-only';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
const MODEL = 'omni-moderation-latest';

export type ModerationResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string; categories?: string[] };

type ModerationApiResponse = {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
  error?: { message?: string };
};

function getModerationApiKey(): string | undefined {
  return (
    process.env.OPENAI_MODERATION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    // Solo se AI punta a OpenAI cloud, riusa la stessa key
    (process.env.AI_BASE_URL?.includes('api.openai.com')
      ? process.env.AI_API_KEY?.trim()
      : undefined)
  );
}

function flaggedCategories(categories: Record<string, boolean> | undefined): string[] {
  if (!categories) return [];
  return Object.entries(categories)
    .filter(([, v]) => v)
    .map(([k]) => k);
}

/**
 * Modera testo e/o immagine con OpenAI omni-moderation (gratis).
 * Se manca la API key: in produzione blocca; in dev skip con warning.
 */
export async function moderatePostContent(input: {
  text?: string;
  image?: { data: Buffer; mimeType: string };
}): Promise<ModerationResult> {
  const text = input.text?.trim() ?? '';
  const hasImage = Boolean(input.image?.data?.length);
  if (!text && !hasImage) return { ok: true };

  const apiKey = getModerationApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        error:
          'Moderazione non configurata. Imposta OPENAI_API_KEY (o OPENAI_MODERATION_API_KEY).',
      };
    }
    console.warn('[moderation] API key assente — skip in development');
    return { ok: true, skipped: true };
  }

  const parts: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [];

  if (text) {
    parts.push({ type: 'text', text });
  }
  if (input.image?.data?.length) {
    const b64 = input.image.data.toString('base64');
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${input.image.mimeType};base64,${b64}`,
      },
    });
  }

  try {
    const res = await fetch(OPENAI_MODERATION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: parts.length === 1 && parts[0].type === 'text' ? text : parts,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json()) as ModerationApiResponse;
    if (!res.ok) {
      console.error('[moderation] OpenAI error', res.status, data.error?.message);
      return {
        ok: false,
        error: 'Impossibile verificare il contenuto. Riprova tra poco.',
      };
    }

    const result = data.results?.[0];
    if (result?.flagged) {
      const cats = flaggedCategories(result.categories);
      console.info('[moderation] flagged', cats);
      return {
        ok: false,
        error:
          'Questo contenuto non rispetta le linee guida della community e non può essere pubblicato.',
        categories: cats,
      };
    }

    return { ok: true };
  } catch (e) {
    console.error('[moderation] fetch failed', e);
    return {
      ok: false,
      error: 'Impossibile verificare il contenuto. Riprova tra poco.',
    };
  }
}
