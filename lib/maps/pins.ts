import { BLOCK_META, getBlockDisplayTitle } from '@/lib/composer/blocks';
import { offsetAroundCenter, resolveDestinationCoords, type LatLng } from '@/lib/maps/coordinates';
import type { ComposerBlockType, ComposerDay, ComposerDraft } from '@/types/composer';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dayIndex: number;
  blockType: ComposerBlockType | string;
  emoji: string;
  blockId?: string;
};

const MAP_BLOCK_TYPES = new Set<ComposerBlockType>([
  'hotel',
  'attraction',
  'activity',
  'meal',
  'transport',
]);

function readCoords(content: Record<string, unknown>): LatLng | null {
  const lat = content.lat;
  const lng = content.lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
}

export function buildPinsFromDraft(
  draft: ComposerDraft,
  options?: { activeDayIndex?: number; dayFilter?: number }
): MapPin[] {
  const center = resolveDestinationCoords(draft.destination, draft.destinationMeta);
  if (!center) return [];

  const pins: MapPin[] = [];
  const days =
    options?.dayFilter != null
      ? draft.days.filter((d) => d.dayIndex === options.dayFilter)
      : draft.days;

  for (const day of days) {
    const mappable = day.blocks.filter((b) => MAP_BLOCK_TYPES.has(b.type));
    mappable.forEach((block, index) => {
      const coords =
        readCoords(block.content) ??
        offsetAroundCenter(center, index + day.dayIndex * 3, mappable.length + day.dayIndex);

      const meta = BLOCK_META[block.type];
      pins.push({
        id: `${day.dayIndex}-${block.id}`,
        blockId: block.id,
        lat: coords.lat,
        lng: coords.lng,
        label: getBlockDisplayTitle(block),
        dayIndex: day.dayIndex,
        blockType: block.type,
        emoji: meta.emoji,
      });
    });
  }

  if (pins.length === 0) {
    pins.push({
      id: 'destination',
      lat: center.lat,
      lng: center.lng,
      label: draft.destination,
      dayIndex: options?.activeDayIndex ?? 1,
      blockType: 'note',
      emoji: '📍',
    });
  }

  return pins;
}

export function buildPinsFromItinerary(
  destination: string,
  days: {
    day_index: number;
    trip_blocks: { id: string; block_type: string; content: Record<string, unknown> }[];
  }[]
): MapPin[] {
  const center = resolveDestinationCoords(destination);
  if (!center) return [];

  const pins: MapPin[] = [];

  for (const day of days) {
    const blocks = day.trip_blocks.filter((b) =>
      MAP_BLOCK_TYPES.has(b.block_type as ComposerBlockType)
    );
    blocks.forEach((block, index) => {
      const coords =
        readCoords(block.content) ??
        offsetAroundCenter(center, index + day.day_index * 3, blocks.length + day.day_index);
      const meta = BLOCK_META[block.block_type as ComposerBlockType];
      const title =
        typeof block.content.title === 'string' ? block.content.title : meta?.label ?? 'Tappa';

      pins.push({
        id: block.id,
        blockId: block.id,
        lat: coords.lat,
        lng: coords.lng,
        label: title,
        dayIndex: day.day_index,
        blockType: block.block_type,
        emoji: meta?.emoji ?? '📍',
      });
    });
  }

  if (pins.length === 0 && center) {
    pins.push({
      id: 'destination',
      lat: center.lat,
      lng: center.lng,
      label: destination,
      dayIndex: 1,
      blockType: 'note',
      emoji: '📍',
    });
  }

  return pins;
}