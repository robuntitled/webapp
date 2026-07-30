import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGenerateJob, processGenerateJob } from '@/lib/composer/jobs';

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Poll stato job generazione AI. Se ancora queued, prova a processare (retry). */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { id } = await params;
  let job = await getGenerateJob(id, session.user.id);
  if (!job) {
    return NextResponse.json({ error: 'Job non trovato' }, { status: 404 });
  }

  if (job.status === 'queued') {
    await processGenerateJob(id);
    job = await getGenerateJob(id, session.user.id);
    if (!job) {
      return NextResponse.json({ error: 'Job non trovato' }, { status: 404 });
    }
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    result: job.status === 'done' ? job.result : null,
    progress: job.progress ?? null,
    error: job.error_message,
  });
}
