import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPlannerProfile, upsertPlannerProfile } from '@/lib/data/planner-profile';
import { plannerProfileSchema } from '@/lib/validations/planner';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const profile = await getPlannerProfile(session.user.id);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = plannerProfileSchema.safeParse(body.profile ?? body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Profilo non valido', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const profile = await upsertPlannerProfile(session.user.id, parsed.data);
  return NextResponse.json({ profile, saved: true });
}