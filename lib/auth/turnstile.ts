import 'server-only';

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Verifica token Cloudflare Turnstile (siteverify).
 * Se TURNSTILE_SECRET_KEY non è configurata → skip (dev / non ancora attivo).
 * Se la secret c’è → token obbligatorio e valido.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteip?: string
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    // Non configurato: non bloccare la registrazione (dev / pre-go-live)
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[turnstile] TURNSTILE_SECRET_KEY assente in production — captcha disattivato'
      );
    }
    return { ok: true };
  }

  const trimmed = token?.trim() ?? '';
  if (!trimmed) {
    return { ok: false, error: 'Completa la verifica anti-bot (captcha).' };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: trimmed,
    });
    if (remoteip && remoteip !== 'unknown') {
      body.set('remoteip', remoteip);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8_000),
    });

    const data = (await res.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!data.success) {
      console.warn('[turnstile] verify failed', data['error-codes']);
      return {
        ok: false,
        error: 'Verifica anti-bot non riuscita. Ricarica la pagina e riprova.',
      };
    }

    return { ok: true };
  } catch (e) {
    console.error('[turnstile] verify error', e);
    return {
      ok: false,
      error: 'Servizio anti-bot non raggiungibile. Riprova tra poco.',
    };
  }
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  );
}
