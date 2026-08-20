import { NextResponse } from 'next/server';
import { runRetentionAutomations } from '@/lib/retention/automations';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const stats = await runRetentionAutomations();
  return NextResponse.json({ ok: true, stats });
}
