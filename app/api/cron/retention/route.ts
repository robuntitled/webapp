import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

/**
 * Retention hooks for legacy creator-trips were retired with the practices/editions model.
 * Endpoint kept so Vercel cron configs do not 404.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, stats: { skipped: true, reason: 'legacy_trips_retired' } });
}
