import 'server-only';

import { createHash, randomInt } from 'crypto';
import { sendWhatsAppOtp, whatsappConfigured } from '@/lib/phone/whatsapp';
import { supabaseAdmin } from '@/lib/supabase-admin';

/** Codice valido 24h. */
const OTP_TTL_MS = 24 * 60 * 60_000;
const MAX_ATTEMPTS = 5;
/**
 * Invii OTP:
 * - 1°: sempre (create/join)
 * - 2°: solo se il 1° è scaduto e zero tentativi di codice (numero sbagliato / messaggio perso)
 * Mai oltre 2.
 */
const MAX_OTP_SENDS_HARD = 2;

export type PhoneOtpMode = 'whatsapp' | 'twilio' | 'dev';

/** Solo da create/join/publish trip — non da “giochi” in impostazioni. */
export type PhoneOtpPurpose = 'trip_action';

function hashOtp(code: string, userId: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  );
}

async function twilioStart(e164: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const service = process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const body = new URLSearchParams({ To: e164, Channel: 'sms' });

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(12_000),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[twilio-verify] start failed', res.status, text.slice(0, 200));
    return { ok: false, error: 'Impossibile inviare il codice. Riprova tra poco.' };
  }
  return { ok: true };
}

async function twilioCheck(
  e164: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const service = process.env.TWILIO_VERIFY_SERVICE_SID!.trim();
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const body = new URLSearchParams({ To: e164, Code: code });

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${service}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(12_000),
    }
  );

  const data = (await res.json().catch(() => ({}))) as { status?: string };
  if (!res.ok || data.status !== 'approved') {
    return { ok: false, error: 'Codice non valido o scaduto.' };
  }
  return { ok: true };
}

/**
 * Un solo OTP a vita per account, solo con purpose trip_action.
 * Validità codice: 24 ore.
 */
export async function sendPhoneOtp(
  userId: string,
  e164: string,
  purpose: PhoneOtpPurpose
): Promise<{ ok: true; mode: PhoneOtpMode } | { ok: false; error: string }> {
  if (purpose !== 'trip_action') {
    return {
      ok: false,
      error: 'Il codice si riceve solo quando crei o ti unisci a un viaggio.',
    };
  }

  const { data: row, error: loadErr } = await supabaseAdmin
    .from('users')
    .select(
      'id, phone_verified_at, phone_otp_send_count, phone_e164, phone_otp_expires_at, phone_otp_attempts'
    )
    .eq('id', userId)
    .single();

  if (loadErr || !row) {
    return { ok: false, error: 'Utente non trovato.' };
  }

  if (row.phone_verified_at) {
    return { ok: false, error: 'Telefono già verificato.' };
  }

  const sendCount = Number(row.phone_otp_send_count ?? 0);
  const attempts = Number(row.phone_otp_attempts ?? 0);
  const expMs = row.phone_otp_expires_at
    ? new Date(row.phone_otp_expires_at).getTime()
    : 0;
  const expired = !expMs || expMs < Date.now();

  // Soft re-send: solo 2° invio se 1° scaduto e mai provato un codice
  const canSoftResend =
    sendCount === 1 && expired && attempts === 0;

  if (sendCount >= MAX_OTP_SENDS_HARD) {
    return {
      ok: false,
      error:
        'Hai raggiunto il limite di codici di verifica. Contatta il supporto se serve aiuto.',
    };
  }

  if (sendCount >= 1 && !canSoftResend) {
    if (!expired) {
      return {
        ok: false,
        error:
          'Hai già ricevuto il codice (valido 24 ore). Controlla WhatsApp e inseriscilo — non possiamo reinviarlo ora.',
      };
    }
    // Scaduto ma ha già provato codici sbagliati → no re-send (anti-brute / anti-bot)
    return {
      ok: false,
      error:
        'Il codice è scaduto e non possiamo reinviarlo. Contatta il supporto se serve aiuto.',
    };
  }

  const { data: taken } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone_e164', e164)
    .not('phone_verified_at', 'is', null)
    .neq('id', userId)
    .maybeSingle();

  if (taken) {
    return { ok: false, error: 'Questo numero è già verificato su un altro account.' };
  }

  const nowIso = new Date().toISOString();
  const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // ── WhatsApp (preferito): 1 messaggio, OTP locale 24h ────────────────────
  if (whatsappConfigured()) {
    const code = String(randomInt(100000, 999999));
    const otpHash = hashOtp(code, userId);

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        phone_e164: e164,
        phone_otp_hash: otpHash,
        phone_otp_expires_at: expires,
        phone_otp_attempts: 0,
        phone_verified_at: null,
        phone_otp_send_count: sendCount + 1,
        phone_otp_sent_at: nowIso,
      })
      .eq('id', userId);

    if (error) {
      console.error('[phone-otp] save failed', error);
      return { ok: false, error: 'Impossibile avviare la verifica.' };
    }

    const sent = await sendWhatsAppOtp(e164, code);
    if (!sent.ok) {
      // rollback count so rare send failure non brucia lo slot (opzionale: user asked max 1 send)
      // Teniamo count=1 comunque se messaggio poteva essere partito; qui rollback per sicurezza costi
      await supabaseAdmin
        .from('users')
        .update({
          phone_otp_send_count: sendCount,
          phone_otp_hash: null,
          phone_otp_expires_at: null,
          phone_otp_sent_at: null,
        })
        .eq('id', userId);
      return { ok: false, error: sent.error };
    }

    return { ok: true, mode: 'whatsapp' };
  }

  // ── Twilio SMS: 1 sola Verification ─────────────────────────────────────
  if (twilioConfigured()) {
    const started = await twilioStart(e164);
    if (!started.ok) return started;

    await supabaseAdmin
      .from('users')
      .update({
        phone_e164: e164,
        phone_verified_at: null,
        phone_otp_hash: null,
        phone_otp_expires_at: expires,
        phone_otp_attempts: 0,
        phone_otp_send_count: sendCount + 1,
        phone_otp_sent_at: nowIso,
      })
      .eq('id', userId);

    return { ok: true, mode: 'twilio' };
  }

  // ── Dev: 1 codice in log ────────────────────────────────────────────────
  const code = String(randomInt(100000, 999999));
  const otpHash = hashOtp(code, userId);

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      phone_e164: e164,
      phone_otp_hash: otpHash,
      phone_otp_expires_at: expires,
      phone_otp_attempts: 0,
      phone_verified_at: null,
      phone_otp_send_count: sendCount + 1,
      phone_otp_sent_at: nowIso,
    })
    .eq('id', userId);

  if (error) {
    console.error('[phone-otp] save failed', error);
    return { ok: false, error: 'Impossibile avviare la verifica.' };
  }

  console.info('[phone-otp:dev] UNICO invio', { userId, e164, code, validHours: 24 });
  return { ok: true, mode: 'dev' };
}

export async function confirmPhoneOtp(
  userId: string,
  code: string
): Promise<{ ok: true; e164: string } | { ok: false; error: string }> {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length < 4 || cleaned.length > 8) {
    return { ok: false, error: 'Inserisci il codice ricevuto su WhatsApp.' };
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, phone_e164, phone_otp_hash, phone_otp_expires_at, phone_otp_attempts, phone_verified_at, phone_otp_send_count'
    )
    .eq('id', userId)
    .single();

  if (error || !user?.phone_e164) {
    return {
      ok: false,
      error: 'Nessuna verifica in corso. Avvia la verifica creando o unendoti a un viaggio.',
    };
  }

  if (user.phone_verified_at) {
    return { ok: true, e164: user.phone_e164 };
  }

  const attempts = user.phone_otp_attempts ?? 0;
  if (attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      error:
        'Troppi tentativi errati. L’unico codice era già stato inviato — contatta il supporto se serve aiuto.',
    };
  }

  if (twilioConfigured() && !user.phone_otp_hash) {
    const checked = await twilioCheck(user.phone_e164, cleaned);
    if (!checked.ok) {
      await supabaseAdmin
        .from('users')
        .update({ phone_otp_attempts: attempts + 1 })
        .eq('id', userId);
      return checked;
    }
  } else {
    const exp = user.phone_otp_expires_at
      ? new Date(user.phone_otp_expires_at).getTime()
      : 0;
    if (!exp || exp < Date.now()) {
      return {
        ok: false,
        error:
          'Codice scaduto (valido 24 ore). Non possiamo reinviarlo: contatta il supporto se serve.',
      };
    }
    const expected = user.phone_otp_hash;
    if (!expected || expected !== hashOtp(cleaned, userId)) {
      await supabaseAdmin
        .from('users')
        .update({ phone_otp_attempts: attempts + 1 })
        .eq('id', userId);
      return { ok: false, error: 'Codice non valido.' };
    }
  }

  const { data: taken } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone_e164', user.phone_e164)
    .not('phone_verified_at', 'is', null)
    .neq('id', userId)
    .maybeSingle();

  if (taken) {
    return { ok: false, error: 'Questo numero è già verificato su un altro account.' };
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      phone_verified_at: new Date().toISOString(),
      phone_otp_hash: null,
      phone_otp_expires_at: null,
      phone_otp_attempts: 0,
      phone_number: user.phone_e164,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('[phone-otp] verify save failed', updateError);
    return { ok: false, error: 'Impossibile completare la verifica.' };
  }

  return { ok: true, e164: user.phone_e164 };
}

/** Stato per UI: già inviato? verificato? */
export async function getPhoneVerifyStatus(userId: string): Promise<{
  verified: boolean;
  otpSent: boolean;
  phoneMasked: string | null;
  e164: string | null;
}> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('phone_verified_at, phone_otp_send_count, phone_e164')
    .eq('id', userId)
    .maybeSingle();

  const e164 = data?.phone_e164 ?? null;
  return {
    verified: Boolean(data?.phone_verified_at),
    otpSent: Number(data?.phone_otp_send_count ?? 0) >= 1,
    phoneMasked: e164
      ? `${e164.slice(0, 3)} ••• ••• ${e164.slice(-4)}`
      : null,
    e164,
  };
}
