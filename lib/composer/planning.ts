import { BLOCK_META, getBlockDisplayPrice } from '@/lib/composer/blocks';
import type { ComposerBlock, ComposerBlockType, ComposerDay } from '@/types/composer';
import type { TimeSlot } from '@/lib/composer/time-slots';
import { TIME_SLOTS } from '@/lib/composer/time-slots';

export type BudgetBreakdown = {
  flights: number;
  hotels: number;
  experiences: number;
  other: number;
  total: number;
};

const EXPERIENCE_TYPES = new Set<ComposerBlockType>([
  'attraction',
  'activity',
  'meal',
  'transport',
  'free_time',
]);

export function estimateDayBudget(day: ComposerDay): number {
  return day.blocks.reduce((sum, block) => sum + (getBlockDisplayPrice(block) ?? 0), 0);
}

export function getBudgetBreakdown(days: ComposerDay[]): BudgetBreakdown {
  const breakdown: BudgetBreakdown = {
    flights: 0,
    hotels: 0,
    experiences: 0,
    other: 0,
    total: 0,
  };

  for (const day of days) {
    for (const block of day.blocks) {
      const price = getBlockDisplayPrice(block) ?? 0;
      if (block.type === 'flight') breakdown.flights += price;
      else if (block.type === 'hotel') breakdown.hotels += price;
      else if (EXPERIENCE_TYPES.has(block.type)) breakdown.experiences += price;
      else breakdown.other += price;
      breakdown.total += price;
    }
  }

  return breakdown;
}

export function getPlanCompletion(days: ComposerDay[]): {
  filledDays: number;
  totalDays: number;
  percent: number;
  totalBlocks: number;
} {
  const filledDays = days.filter((d) => d.blocks.length > 0).length;
  const totalBlocks = days.reduce((n, d) => n + d.blocks.length, 0);
  const percent = days.length > 0 ? Math.round((filledDays / days.length) * 100) : 0;
  return { filledDays, totalDays: days.length, percent, totalBlocks };
}

export function countBlocksByType(days: ComposerDay[]): Partial<Record<ComposerBlockType, number>> {
  const counts: Partial<Record<ComposerBlockType, number>> = {};
  for (const day of days) {
    for (const block of day.blocks) {
      counts[block.type] = (counts[block.type] ?? 0) + 1;
    }
  }
  return counts;
}

export function groupBlocksByTimeSlot(blocks: ComposerBlock[]): Record<TimeSlot, ComposerBlock[]> {
  const groups = Object.fromEntries(TIME_SLOTS.map((t) => [t.id, [] as ComposerBlock[]])) as Record<
    TimeSlot,
    ComposerBlock[]
  >;

  for (const block of blocks) {
    const slot = (block.content.timeSlot as TimeSlot) ?? 'flex';
    if (groups[slot]) groups[slot].push(block);
    else groups.flex.push(block);
  }

  return groups;
}

export function getBlockSubtitle(block: ComposerBlock): string | null {
  const c = block.content;
  if (typeof c.place === 'string' && c.place) return c.place;
  if (typeof c.area === 'string' && c.area) return c.area;
  if (typeof c.airline === 'string' && c.airline) return c.airline;
  if (typeof c.from === 'string' && typeof c.to === 'string' && c.from && c.to) {
    return `${c.from} → ${c.to}`;
  }
  if (typeof c.origin === 'string' && typeof c.destination === 'string') {
    return `${c.origin} → ${c.destination}`;
  }
  return BLOCK_META[block.type].hint;
}

export function duplicateBlock(block: ComposerBlock, sortOrder: number): ComposerBlock {
  return {
    ...block,
    id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sortOrder,
    alternatives: block.alternatives.map((a) => ({
      ...a,
      id: `alt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    })),
  };
}