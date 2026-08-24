import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { registerSchema } from '@/lib/validations/user';
import { rateLimitAsync } from '@/lib/rate-limit';
import {
  buildMarketingConsentFields,
  buildPrivacyConsentFields,
} from '@/lib/privacy/consent';
import { issueEmailVerification } from '@/lib/auth/email-verification';
import { allocateUniqueUsername, slugFromPerson } from '@/lib/auth/username';
import { verifyTurnstileToken } from '@/lib/auth/turnstile';
import { clientIp } from '@/lib/api/request-guard';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const { ok, retryAfterMs } = await rateLimitAsync(`register:${ip}`, {
      limit: 5,
      windowMs: 60_000,
    });
    if (!ok) {
      return new NextResponse('Troppi tentativi. Riprova tra qualche minuto.', {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      });
    }

    const body = await request.json();

    const turnstile = await verifyTurnstileToken(
      typeof body?.turnstileToken === 'string' ? body.turnstileToken : undefined,
      ip
    );
    if (!turnstile.ok) {
      return new NextResponse(turnstile.error, { status: 400 });
    }

    const { firstName, lastName, email, password, marketingConsent, referredBy } =
      registerSchema.parse(body);

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email_verified_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      // Non rivelare se è solo non verificato con messaggio diverso in produzione;
      // ma permettiamo re-issue se non verificato
      if (!existingUser.email_verified_at) {
        try {
          await issueEmailVerification(existingUser.id, normalizedEmail);
        } catch {
          /* ignore */
        }
        return NextResponse.json(
          {
            requiresVerification: true,
            message:
              'Account già registrato ma non verificato. Ti abbiamo reinviato l’email di conferma.',
          },
          { status: 200 }
        );
      }
      return new NextResponse('Utente già registrato', { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const username = await allocateUniqueUsername(
      slugFromPerson({ firstName, lastName, email: normalizedEmail })
    );

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          username,
          hashedPassword,
          email_verified_at: null,
          ...buildPrivacyConsentFields(true),
          ...buildMarketingConsentFields(marketingConsent ?? false),
          ...(referredBy && referredBy !== undefined
            ? { referred_by_user_id: referredBy }
            : {}),
        },
      ])
      .select('id, email, username, first_name, last_name')
      .single();

    if (error || !newUser) {
      throw error ?? new Error('Insert failed');
    }

    const issued = await issueEmailVerification(newUser.id, newUser.email);

    return NextResponse.json(
      {
        requiresVerification: true,
        email: newUser.email,
        message:
          'Registrazione riuscita. Controlla la tua email e apri il link di conferma per accedere.',
        emailSent: issued.emailSent,
        // Solo in dev/log mode: utile se non c’è Resend (mai esporre in prod se RESEND attivo)
        ...(issued.emailMode === 'log'
          ? { devVerifyUrl: issued.verifyUrl }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return new NextResponse(error.issues[0]?.message ?? 'Dati non validi', {
        status: 400,
      });
    }
    console.error('ERRORE REGISTRAZIONE:', error);
    return new NextResponse('Errore Interno del Server', { status: 500 });
  }
}
