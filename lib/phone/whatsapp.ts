import 'server-only';

/**
 * WhatsApp Cloud API (Meta) — invio OTP via template Authentication.
 *
 * Env:
 *   WHATSAPP_ACCESS_TOKEN      — token permanente o system user
 *   WHATSAPP_PHONE_NUMBER_ID   — ID del numero mittente (console Meta)
 *   WHATSAPP_OTP_TEMPLATE      — nome template approvato (default: nomadlink_otp)
 *   WHATSAPP_OTP_TEMPLATE_LANG — es. it (default: it)
 *   WHATSAPP_OTP_BUTTON_COPY   — se il template ha bottone URL con {{1}}, invia anche lì
 */

export function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

/** WhatsApp vuole il numero senza + (es. 393331234567). */
export function e164ToWhatsAppTo(e164: string): string {
  return e164.replace(/\D/g, '');
}

export async function sendWhatsAppOtp(
  e164: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const template =
    process.env.WHATSAPP_OTP_TEMPLATE?.trim() || 'nomadlink_otp';
  const lang = process.env.WHATSAPP_OTP_TEMPLATE_LANG?.trim() || 'it';
  const includeButton =
    process.env.WHATSAPP_OTP_BUTTON_COPY !== 'false' &&
    process.env.WHATSAPP_OTP_BUTTON_COPY !== '0';

  const to = e164ToWhatsAppTo(e164);

  const components: Array<Record<string, unknown>> = [
    {
      type: 'body',
      parameters: [{ type: 'text', text: code }],
    },
  ];

  // Molti template Authentication hanno un button URL con lo stesso codice
  if (includeButton) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: code }],
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: lang },
      components,
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      }
    );

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; error_user_msg?: string };
      messages?: unknown[];
    };

    if (!res.ok) {
      const msg =
        data.error?.error_user_msg ||
        data.error?.message ||
        `WhatsApp HTTP ${res.status}`;
      console.error('[whatsapp-otp] send failed', res.status, data.error);

      // Retry senza button se il template non ce l’ha
      if (includeButton && /button|component|parameter/i.test(msg)) {
        return sendWhatsAppOtpBodyOnly(e164, code, token, phoneNumberId, template, lang);
      }

      return {
        ok: false,
        error:
          'Impossibile inviare su WhatsApp. Controlla template/approvazione o riprova.',
      };
    }

    return { ok: true };
  } catch (e) {
    console.error('[whatsapp-otp] fetch error', e);
    return { ok: false, error: 'Errore di rete verso WhatsApp. Riprova.' };
  }
}

async function sendWhatsAppOtpBodyOnly(
  e164: string,
  code: string,
  token: string,
  phoneNumberId: string,
  template: string,
  lang: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = e164ToWhatsAppTo(e164);
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: lang },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('[whatsapp-otp] body-only failed', res.status, data);
      return {
        ok: false,
        error: 'Template WhatsApp non valido o non approvato. Controlla Meta Business.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Errore di rete verso WhatsApp. Riprova.' };
  }
}
