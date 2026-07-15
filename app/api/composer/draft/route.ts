import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  deleteComposerDraft,
  getComposerDraft,
  upsertComposerDraft,
} from '@/lib/data/planner-profile';
import { normalizeWizardStep } from '@/lib/composer/wizard-steps';
import { plannerProfileSchema } from '@/lib/validations/planner';

const stepEnum = z.enum(['landing', 'plan', 'review', 'intake', 'setup']);

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
  return NextResponse.json(
    saved ?? { draft: {}, currentStep: 'landing', plannerProfile: null }
  );
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
    currentStep: normalizeWizardStep(parsed.data.currentStep),
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