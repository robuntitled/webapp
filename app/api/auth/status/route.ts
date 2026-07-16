import { NextResponse } from 'next/server';
import { getAuthEnvStatus } from '@/lib/auth/env-check';

/** Diagnostica OAuth — mostra solo quali env mancano, mai i valori segreti. */
export async function GET() {
  const status = getAuthEnvStatus();
  return NextResponse.json(status);
}