import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { getAdminCostHub } from '@/lib/admin/provider-hub';

export const dynamic = 'force-dynamic';

/** Hub costi admin — polling live dalla dashboard. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hub = await getAdminCostHub(30);
  return NextResponse.json(hub);
}
