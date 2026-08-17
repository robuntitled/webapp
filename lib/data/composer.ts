import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildTripDescriptionFromDays, estimateTripBudget } from '@/lib/composer/days';
import { pickTripCoverImage } from '@/lib/composer/trip-cover-image';
import type { PublishComposerInput } from '@/lib/composer/schemas';
import type { ComposerDay } from '@/types/composer';

export type PublishedComposerTrip = {
  tripId: string;
  price: number;
};

export async function publishComposerTrip(
  userId: string,
  input: PublishComposerInput
): Promise<PublishedComposerTrip> {
  const days = input.days as ComposerDay[];
  const price = estimateTripBudget(days);
  const description = buildTripDescriptionFromDays(days, input.destination);
  const coverImage =
    input.imageUrl || (await pickTripCoverImage(input.destination));

  const tripRow = {
    title: input.title,
    destination: input.destination,
    start_date: input.startDate,
    end_date: input.endDate,
    description,
    image_url: coverImage,
    price,
    min_participants:
      input.minParticipants ?? (input.planningMode === 'solo' ? 4 : 2),
    max_participants: Math.max(2, input.maxParticipants),
    min_age: 18,
    max_age: 999,
    planning_mode: input.planningMode,
    composer_version: 1,
    status: 'forming' as const,
    creator_id: userId,
  };

  let { data: trip, error: tripError } = await supabaseAdmin
    .from('trips')
    .insert(tripRow)
    .select('id')
    .single();

  if (tripError && /status/i.test(tripError.message)) {
    ({ data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .insert({ ...tripRow, status: 'published' })
      .select('id')
      .single());
  }

  if (tripError || !trip) {
    throw new Error(tripError?.message ?? 'Creazione viaggio fallita');
  }

  await supabaseAdmin.from('trip_participants').insert({
    trip_id: trip.id,
    user_id: userId,
    role: 'owner',
  });

  for (const day of days) {
    const { data: dayRow, error: dayError } = await supabaseAdmin
      .from('trip_days')
      .insert({
        trip_id: trip.id,
        day_index: day.dayIndex,
        day_date: day.date,
        title: day.title,
        summary: null,
      })
      .select('id')
      .single();

    if (dayError || !dayRow) {
      throw new Error(dayError?.message ?? `Errore salvataggio giorno ${day.dayIndex}`);
    }

    if (day.blocks.length === 0) continue;

    const blockRows = day.blocks.map((block) => ({
      trip_day_id: dayRow.id,
      sort_order: block.sortOrder,
      block_type: block.type,
      content: {
        ...block.content,
        alternatives: block.alternatives,
        selectedAlternativeId: block.selectedAlternativeId,
      },
    }));

    const { error: blocksError } = await supabaseAdmin.from('trip_blocks').insert(blockRows);
    if (blocksError) {
      throw new Error(blocksError.message);
    }
  }

  return { tripId: trip.id, price };
}

export type ComposerDayRow = {
  id: string;
  day_index: number;
  day_date: string;
  title: string | null;
  trip_blocks: {
    id: string;
    sort_order: number;
    block_type: string;
    content: Record<string, unknown>;
  }[];
};

export async function fetchComposerItinerary(tripId: string): Promise<ComposerDayRow[] | null> {
  const { data, error } = await supabaseAdmin
    .from('trip_days')
    .select(
      'id, day_index, day_date, title, trip_blocks(id, sort_order, block_type, content)'
    )
    .eq('trip_id', tripId)
    .order('day_index');

  if (error) {
    if (error.code === '42P01') return null;
    console.error('fetchComposerItinerary:', error.message);
    return null;
  }

  return (data ?? []) as ComposerDayRow[];
}