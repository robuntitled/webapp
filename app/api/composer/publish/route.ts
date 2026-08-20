import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  isPhoneVerifyRequiredError,
  requirePhoneVerified,
} from '@/lib/auth/require-phone-verified';
import { publishComposerTrip } from '@/lib/data/composer';
import { publishComposerSchema } from '@/lib/composer/schemas';
import { evaluatePublishQuality } from '@/lib/composer/quality-gate';
import { awardPoints } from '@/lib/commerce/points-ledger';
import { syncTripFormationMilestones } from '@/lib/commerce/trip-milestones';
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

  const quality = evaluatePublishQuality(parsed.data);
  if (quality.length > 0) {
    return NextResponse.json({ error: quality[0].message, issues: quality }, { status: 400 });
  }

  try {
    await requirePhoneVerified(session.user.id);
    const result = await publishComposerTrip(session.user.id, parsed.data);

    await awardPoints({
      userId: session.user.id,
      action: 'create_trip_published',
      ref: result.tripId,
    });
    await syncTripFormationMilestones(result.tripId);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/cerca');
    revalidatePath('/dashboard/miei-viaggi');
    revalidatePath(`/viaggi/${result.tripId}`);

    return NextResponse.json({
      tripId: result.tripId,
      price: result.price,
    });
  } catch (error) {
    if (isPhoneVerifyRequiredError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'PHONE_VERIFY_REQUIRED',
          settingsPath: '/dashboard/impostazioni',
        },
        { status: 403 }
      );
    }
    const message = error instanceof Error ? error.message : 'Pubblicazione fallita';
    const isMigration =
      message.includes('trip_days') ||
      message.includes('block_type') ||
      message.includes('composer_version') ||
      message.includes('planning_mode');
    return NextResponse.json(
      {
        error: message,
        hint: isMigration
          ? 'Applica le migration 003 e 004 su Supabase (SQL Editor o npm run db:social + db:composer)'
          : undefined,
      },
      { status: 500 }
    );
  }
}