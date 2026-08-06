import 'server-only';

import {
  findTextBlockReason,
  type TextBlockReason,
} from '@/lib/moderation/text-filter';

export type ModerationResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

const MESSAGES: Record<TextBlockReason, string> = {
  profanity:
    'Questo contenuto non rispetta le linee guida della community e non può essere pubblicato.',
  link: 'Non è consentito inserire link a siti web esterni nei post.',
  email: 'Non è consentito condividere indirizzi email nei post.',
  phone: 'Non è consentito condividere numeri di telefono nei post.',
  off_platform:
    'Non è consentito promuovere contatti fuori dalla piattaforma (WhatsApp, Telegram, ecc.).',
  competitor:
    'Non è consentito menzionare o promuovere altre piattaforme di viaggio nei post.',
};

/**
 * Moderazione locale (post bacheca + chat viaggio): linguaggio offensivo,
 * link/email/telefono, canali off-platform e competitor.
 */
export function moderatePostContent(input: {
  text?: string;
}): ModerationResult {
  const text = input.text?.trim() ?? '';
  if (!text) return { ok: true };

  const reason = findTextBlockReason(text);
  if (reason) {
    return {
      ok: false,
      error: MESSAGES[reason],
      code: reason.toUpperCase(),
    };
  }

  return { ok: true };
}
