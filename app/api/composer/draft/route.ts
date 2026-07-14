import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  deleteComposerDraft,
  getComposerDraft,
  upsertComposerDraft,
  type ComposerWizardStep,
} from '@/lib/data/planner-profile';
import { plannerProfileSchema } from '@/lib/validations/planner';

const stepEnum = z.enum(['intake', 'setup', 'plan', 'review']);

const saveSchema = z.object({
  draft: z.record(z.string(), z.unknown()).optional(),
  currentStep: stepEnum,
  plannerProfile: plannerProfileSchema.optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const saved = await getComposerDraft(session.user.id);
  return NextResponse.json(saved ?? { draft: {}, currentStep: 'intake', plannerProfile: null });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  await upsertComposerDraft(session.user.id, {
    draft: parsed.data.draft ?? {},
    currentStep: parsed.data.currentStep as ComposerWizardStep,
    plannerProfile: parsed.data.plannerProfile ?? undefined,
  });

  return NextResponse.json({ saved: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  await deleteComposerDraft(session.user.id);
  return NextResponse.json({ deleted: true });
}