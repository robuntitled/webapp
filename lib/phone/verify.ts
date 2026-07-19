import 'server-only';

import { createHash, randomInt } from 'crypto';
import { sendWhatsAppOtp, whatsappConfigured } from '@/lib/phone/whatsapp';
import { supabaseAdmin } from '@/lib/supabase-admin';

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

export type PhoneOtpMode = 'whatsapp' | 'twilio' | 'dev';

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

  const body = new URLSearchParams({
    To: e164,
    Channel: 'sms',
  });

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
    return { ok: false, error: 'Impossibile inviare l’SMS. Riprova tra poco.' };
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

  const body = new URLSearchParams({
    To: e164,
    Code: code,
  });

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

async function saveLocalOtp(
  userId: string,
  e164: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const otpHash = hashOtp(code, userId);
  const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      phone_e164: e164,
      phone_otp_hash: otpHash,
      phone_otp_expires_at: expires,
      phone_otp_attempts: 0,
      phone_verified_at: null,
    })
    .eq('id', userId);

  if (error) {
    console.error('[phone-otp] save failed', error);
    return { ok: false, error: 'Impossibile avviare la verifica.' };
  }
  return { ok: true };
}

/**
 * Priorità canale:
 * 1) WhatsApp Cloud API (se configurato)
 * 2) Twilio Verify SMS
 * 3) Dev: log server
 */
export async function sendPhoneOtp(
  userId: string,
  e164: string
): Promise<{ ok: true; mode: PhoneOtpMode } | { ok: false; error: string }> {
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

  // ── WhatsApp (preferito) ─────────────────────────────────────────────────
  if (whatsappConfigured()) {
    const code = String(randomInt(100000, 999999));
    const saved = await saveLocalOtp(userId, e164, code);
    if (!saved.ok) return saved;

    const sent = await sendWhatsAppOtp(e164, code);
    if (!sent.ok) {
      // Non lasciare un OTP “fantasma” se l’invio fallisce del tutto
      return { ok: false, error: sent.error };
    }
    return { ok: true, mode: 'whatsapp' };
  }

  // ── Twilio SMS ───────────────────────────────────────────────────────────
  if (twilioConfigured()) {
    const started = await twilioStart(e164);
    if (!started.ok) return started;

    await supabaseAdmin
      .from('users')
      .update({
        phone_e164: e164,
        phone_verified_at: null,
        phone_otp_hash: null,
        phone_otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        phone_otp_attempts: 0,
      })
      .eq('id', userId);

    return { ok: true, mode: 'twilio' };
  }

  // ── Dev ──────────────────────────────────────────────────────────────────
  const code = String(randomInt(100000, 999999));
  const saved = await saveLocalOtp(userId, e164, code);
  if (!saved.ok) return saved;

  console.info('[phone-otp:dev]', { userId, e164, code });
  return { ok: true, mode: 'dev' };
}

export async function confirmPhoneOtp(
  userId: string,
  code: string
): Promise<{ ok: true; e164: string } | { ok: false; error: string }> {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length < 4 || cleaned.length > 8) {
    return { ok: false, error: 'Inserisci il codice ricevuto su WhatsApp o SMS.' };
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, phone_e164, phone_otp_hash, phone_otp_expires_at, phone_otp_attempts, phone_verified_at'
    )
    .eq('id', userId)
    .single();

  if (error || !user?.phone_e164) {
    return { ok: false, error: 'Avvia prima l’invio del codice al telefono.' };
  }

  if (user.phone_verified_at) {
    return { ok: true, e164: user.phone_e164 };
  }

  const attempts = user.phone_otp_attempts ?? 0;
  if (attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Troppi tentativi. Richiedi un nuovo codice.' };
  }

  // Twilio Verify: nessun hash locale
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
    // WhatsApp / dev: OTP locale
    const exp = user.phone_otp_expires_at
      ? new Date(user.phone_otp_expires_at).getTime()
      : 0;
    if (!exp || exp < Date.now()) {
      return { ok: false, error: 'Codice scaduto. Richiedi un nuovo codice.' };
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

export async function clearPhoneVerification(userId: string): Promise<void> {
  await supabaseAdmin
    .from('users')
    .update({
      phone_e164: null,
      phone_verified_at: null,
      phone_otp_hash: null,
      phone_otp_expires_at: null,
      phone_otp_attempts: 0,
    })
    .eq('id', userId);
}
