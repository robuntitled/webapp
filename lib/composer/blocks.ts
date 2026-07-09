import type { ComposerBlock, ComposerBlockType } from '@/types/composer';

export const BLOCK_META: Record<
  ComposerBlockType,
  { label: string; emoji: string; color: string; hint: string }
> = {
  flight: {
    label: 'Volo',
    emoji: '✈️',
    color: 'from-sky-500/20 to-blue-600/10 border-sky-400/40',
    hint: 'Cerca e salva opzioni volo con prezzi reali',
  },
  hotel: {
    label: 'Hotel',
    emoji: '🏨',
    color: 'from-violet-500/20 to-purple-600/10 border-violet-400/40',
    hint: 'Alloggio per la notte — confronta alternative',
  },
  attraction: {
    label: 'Attrazione',
    emoji: '📍',
    color: 'from-amber-500/20 to-orange-600/10 border-amber-400/40',
    hint: 'Luogo imperdibile da visitare',
  },
  activity: {
    label: 'Attività',
    emoji: '🎯',
    color: 'from-emerald-500/20 to-teal-600/10 border-emerald-400/40',
    hint: 'Esperienza o tour da fare',
  },
  meal: {
    label: 'Pasto',
    emoji: '🍽️',
    color: 'from-rose-500/20 to-pink-600/10 border-rose-400/40',
    hint: 'Ristorante, street food o aperitivo',
  },
  transport: {
    label: 'Trasporto',
    emoji: '🚕',
    color: 'from-slate-500/20 to-zinc-600/10 border-slate-400/40',
    hint: 'Spostamento locale o transfer',
  },
  free_time: {
    label: 'Tempo libero',
    emoji: '☀️',
    color: 'from-yellow-500/20 to-amber-600/10 border-yellow-400/40',
    hint: 'Momento relax senza agenda fissa',
  },
  note: {
    label: 'Nota',
    emoji: '📝',
    color: 'from-indigo-500/20 to-blue-600/10 border-indigo-400/40',
    hint: 'Promemoria per te o per la crew',
  },
};

export function createBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createAlternativeId(): string {
  return `alt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultBlockContent(type: ComposerBlockType): Record<string, unknown> {
  switch (type) {
    case 'flight':
      return { title: 'Volo', origin: 'ROM', price: null, currency: 'EUR', airline: null };
    case 'hotel':
      return { title: 'Hotel', area: '', nights: 1, price: null, currency: 'EUR' };
    case 'attraction':
      return { title: 'Da visitare', place: '', duration: '2h' };
    case 'activity':
      return { title: 'Attività', description: '', duration: '3h' };
    case 'meal':
      return { title: 'Pasto', place: '', cuisine: '' };
    case 'transport':
      return { title: 'Trasporto', mode: 'taxi', from: '', to: '' };
    case 'free_time':
      return { title: 'Tempo libero', note: 'Esplora senza orari fissi' };
    case 'note':
      return { title: 'Nota', body: '' };
  }
}

export function createEmptyBlock(type: ComposerBlockType, sortOrder: number): ComposerBlock {
  return {
    id: createBlockId(),
    type,
    sortOrder,
    content: defaultBlockContent(type),
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