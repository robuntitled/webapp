import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { composerGenerateRequestSchema } from '@/lib/composer/generate-schemas';
import { orchestrateDayGeneration } from '@/lib/composer/orchestrator';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 15;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const limited = rateLimit(`composer-gen:${session.user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Limite generazioni raggiunto, riprova più tardi' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = composerGenerateRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Richiesta non valida', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await orchestrateDayGeneration(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generazione fallita';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}