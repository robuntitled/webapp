import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { registerSchema } from '@/lib/validations/user';
import { rateLimit } from '@/lib/rate-limit';
import {
  buildMarketingConsentFields,
  buildPrivacyConsentFields,
} from '@/lib/privacy/consent';
import { ZodError } from 'zod';

const SAFE_USER_SELECT = 'id, email, first_name, last_name, image';

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const { ok, retryAfterMs } = rateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 });
    if (!ok) {
      return new NextResponse('Troppi tentativi. Riprova tra qualche minuto.', {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      });
    }

    const body = await request.json();
    const { firstName, lastName, email, password, marketingConsent } =
      registerSchema.parse(body);

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (existingUser) {
      return new NextResponse('Utente già registrato', { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email,
          hashedPassword,
          ...buildPrivacyConsentFields(true),
          ...buildMarketingConsentFields(marketingConsent ?? false),
        },
      ])
      .select(SAFE_USER_SELECT)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newUser, { status: 201 });
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