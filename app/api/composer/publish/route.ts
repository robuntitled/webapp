import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { publishComposerTrip } from '@/lib/data/composer';
import { publishComposerSchema } from '@/lib/composer/schemas';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = publishComposerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await publishComposerTrip(session.user.id, parsed.data);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/miei-viaggi');
    revalidatePath(`/viaggi/${result.tripId}`);

    return NextResponse.json({
      tripId: result.tripId,
      price: result.price,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pubblicazione fallita';
    const isMigration = message.includes('trip_days') || message.includes('block_type');
    return NextResponse.json(
      {
        error: message,
        hint: isMigration ? 'Esegui npm run db:composer su Supabase' : undefined,
      },
      { status: 500 }
    );
  }
}