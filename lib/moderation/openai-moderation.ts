import 'server-only';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';
/** Multimodale testo+immagine; per solo testo usiamo input stringa (meno token). */
const MODEL_OMNI = 'omni-moderation-latest';

export type ModerationResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string; categories?: string[]; code?: string };

type ModerationApiResponse = {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
  error?: { message?: string; type?: string; code?: string };
};

function getModerationApiKey(): string | undefined {
  return (
    process.env.OPENAI_MODERATION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
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

/** Rimpicciolisce l'immagine per stare nei TPM Free (~10k/min). */
async function shrinkForModeration(
  data: Buffer,
  mimeType: string
): Promise<{ data: Buffer; mimeType: string }> {
  try {
    const sharp = (await import('sharp')).default;
    const out = await sharp(data)
      .rotate()
      .resize({
        width: 512,
        height: 512,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 65, mozjpeg: true })
      .toBuffer();
    return { data: out, mimeType: 'image/jpeg' };
  } catch (e) {
    console.warn('[moderation] sharp resize failed, using original', e);
    return { data, mimeType };
  }
}

async function callModeration(
  apiKey: string,
  body: Record<string, unknown>,
  attempt = 0
): Promise<{ res: Response; data: ModerationApiResponse }> {
  const res = await fetch(OPENAI_MODERATION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await res.json()) as ModerationApiResponse;

  if (res.status === 429 && attempt < 2) {
    const waitMs = 1200 * (attempt + 1);
    await new Promise((r) => setTimeout(r, waitMs));
    return callModeration(apiKey, body, attempt + 1);
  }

  return { res, data };
}

/**
 * Modera testo e/o immagine con OpenAI Moderation (gratis).
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

  let requestBody: Record<string, unknown>;

  if (hasImage && input.image) {
    const shrunk = await shrinkForModeration(input.image.data, input.image.mimeType);
    const b64 = shrunk.data.toString('base64');
    const parts: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [];
    if (text) parts.push({ type: 'text', text });
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${shrunk.mimeType};base64,${b64}` },
    });
    requestBody = { model: MODEL_OMNI, input: parts };
  } else {
    // Solo testo: stringa semplice (meno overhead)
    requestBody = { model: MODEL_OMNI, input: text };
  }

  try {
    const { res, data } = await callModeration(apiKey, requestBody);

    if (!res.ok) {
      console.error(
        '[moderation] OpenAI error',
        res.status,
        data.error?.message ?? data.error?.code
      );
      if (res.status === 429) {
        return {
          ok: false,
          code: 'RATE_LIMIT',
          error:
            'Moderazione temporaneamente satura (limite OpenAI). Riprova tra un minuto.',
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          code: 'AUTH',
          error: 'Chiave OpenAI non valida. Controlla OPENAI_API_KEY su Vercel.',
        };
      }
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
