import type { ComposerBlock, ComposerBlockType } from '@/types/composer';
import { inferTimeSlotForType } from '@/lib/composer/time-slots';

export const BLOCK_META: Record<
  ComposerBlockType,
  { label: string; emoji: string; color: string; hint: string }
> = {
  flight: {
    label: 'Volo',
    emoji: '✈️',
    color: 'from-sky-500/35 to-blue-700/15 border-sky-400/30 hover:border-sky-400/50',
    hint: 'Cerca e salva opzioni volo con prezzi reali',
  },
  hotel: {
    label: 'Hotel',
    emoji: '🏨',
    color: 'from-violet-500/35 to-purple-700/15 border-violet-400/30 hover:border-violet-400/50',
    hint: 'Alloggio per la notte — confronta alternative',
  },
  attraction: {
    label: 'Attrazione',
    emoji: '📍',
    color: 'from-amber-500/35 to-orange-700/15 border-amber-400/30 hover:border-amber-400/50',
    hint: 'Luogo imperdibile da visitare',
  },
  activity: {
    label: 'Attività',
    emoji: '🎯',
    color: 'from-emerald-500/35 to-teal-700/15 border-emerald-400/30 hover:border-emerald-400/50',
    hint: 'Esperienza o tour da fare',
  },
  meal: {
    label: 'Pasto',
    emoji: '🍽️',
    color: 'from-rose-500/35 to-pink-700/15 border-rose-400/30 hover:border-rose-400/50',
    hint: 'Ristorante, street food o aperitivo',
  },
  transport: {
    label: 'Trasporto',
    emoji: '🚕',
    color: 'from-slate-400/30 to-zinc-700/15 border-slate-400/25 hover:border-slate-400/45',
    hint: 'Spostamento locale o transfer',
  },
  free_time: {
    label: 'Tempo libero',
    emoji: '☀️',
    color: 'from-yellow-500/35 to-amber-700/15 border-yellow-400/30 hover:border-yellow-400/50',
    hint: 'Momento relax senza agenda fissa',
  },
  note: {
    label: 'Nota',
    emoji: '📝',
    color: 'from-indigo-500/35 to-blue-700/15 border-indigo-400/30 hover:border-indigo-400/50',
    hint: 'Promemoria per te o per la crew',
  },
};

export function createBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createAlternativeId(): string {
  return `alt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const BLOCK_CATEGORIES = [
  {
    id: 'travel',
    label: 'Viaggiare',
    types: ['flight', 'hotel', 'transport'] as ComposerBlockType[],
  },
  {
    id: 'experiences',
    label: 'Esperienze',
    types: ['attraction', 'activity', 'meal'] as ComposerBlockType[],
  },
  {
    id: 'other',
    label: 'Altro',
    types: ['free_time', 'note'] as ComposerBlockType[],
  },
] as const;

export const DURATION_OPTIONS = ['30m', '1h', '2h', '3h', '4h', 'Mezza giornata', 'Giornata intera'];

export function defaultBlockContent(
  type: ComposerBlockType,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const timeSlot = inferTimeSlotForType(type);
  const base: Record<string, unknown> = { timeSlot };

  switch (type) {
    case 'flight':
      Object.assign(base, {
        title: 'Volo',
        origin: 'ROM',
        price: null,
        currency: 'EUR',
        airline: null,
        passengers: 1,
        travelClass: 'economy',
        duration: '2h',
      });
      break;
    case 'hotel':
      Object.assign(base, {
        title: 'Hotel',
        area: '',
        nights: 1,
        price: null,
        currency: 'EUR',
        guests: 2,
        stars: null,
        duration: '1 notte',
        // Standard: check-in 14:00 stesso giorno; check-out 11:00 nei giorni dopo (n. notti)
        checkInTime: '14:00',
        checkOutTime: '11:00',
        time: '14:00',
        // niente endTime: non deve competere con le attività della stessa giornata
      });
      break;
    case 'attraction':
      Object.assign(base, { title: 'Da visitare', place: '', duration: '2h' });
      break;
    case 'activity':
      Object.assign(base, { title: 'Attività', description: '', duration: '3h' });
      break;
    case 'meal':
      Object.assign(base, { title: 'Pasto', place: '', cuisine: '', duration: '1h 30m' });
      break;
    case 'transport':
      Object.assign(base, {
        title: 'Trasporto',
        mode: 'taxi',
        from: '',
        to: '',
        duration: '30m',
      });
      break;
    case 'free_time':
      Object.assign(base, { title: 'Tempo libero', note: 'Esplora senza orari fissi', duration: '2h' });
      break;
    case 'note':
      Object.assign(base, { title: 'Nota', body: '', duration: '' });
      break;
  }

  return { ...base, ...extra };
}

export function createEmptyBlock(
  type: ComposerBlockType,
  sortOrder: number,
  extra?: Record<string, unknown>
): ComposerBlock {
  return {
    id: createBlockId(),
    type,
    sortOrder,
    content: defaultBlockContent(type, extra),
    alternatives: [],
    selectedAlternativeId: null,
  };
}

export function getBlockDisplayTitle(block: ComposerBlock): string {
  const alt = block.alternatives.find((a) => a.id === block.selectedAlternativeId);
  if (alt?.label) return alt.label;
  const title = block.content.title;
  return typeof title === 'string' && title ? title : BLOCK_META[block.type].label;
}

export function getBlockDisplayPrice(block: ComposerBlock): number | null {
  const alt = block.alternatives.find((a) => a.id === block.selectedAlternativeId);
  if (alt?.price != null) return alt.price;
  const price = block.content.price;
  return typeof price === 'number' ? price : null;
}