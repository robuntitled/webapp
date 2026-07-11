import type { ComposerBlockType } from '@/types/composer';

export type DayTemplate = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  blocks: { type: ComposerBlockType; title: string; timeSlot?: string }[];
};

export const DAY_TEMPLATES: DayTemplate[] = [
  {
    id: 'arrival',
    label: 'Arrivo',
    emoji: '🛬',
    description: 'Volo, check-in e prima cena',
    blocks: [
      { type: 'flight', title: 'Volo di andata', timeSlot: 'morning' },
      { type: 'transport', title: 'Transfer aeroporto', timeSlot: 'afternoon' },
      { type: 'hotel', title: 'Check-in hotel', timeSlot: 'afternoon' },
      { type: 'meal', title: 'Cena di benvenuto', timeSlot: 'evening' },
    ],
  },
  {
    id: 'explore',
    label: 'Esplorazione',
    emoji: '🗺️',
    description: 'Attrazioni, pranzo e attività',
    blocks: [
      { type: 'attraction', title: 'Attrazione mattutina', timeSlot: 'morning' },
      { type: 'meal', title: 'Pranzo locale', timeSlot: 'afternoon' },
      { type: 'activity', title: 'Tour o esperienza', timeSlot: 'afternoon' },
      { type: 'attraction', title: 'Tramonto panoramico', timeSlot: 'evening' },
    ],
  },
  {
    id: 'relax',
    label: 'Relax',
    emoji: '🏖️',
    description: 'Mare, tempo libero e aperitivo',
    blocks: [
      { type: 'free_time', title: 'Mattina slow', timeSlot: 'morning' },
      { type: 'meal', title: 'Pranzo in spiaggia', timeSlot: 'afternoon' },
      { type: 'activity', title: 'Sport o spa', timeSlot: 'afternoon' },
      { type: 'meal', title: 'Aperitivo', timeSlot: 'evening' },
    ],
  },
  {
    id: 'culture',
    label: 'Cultura',
    emoji: '🏛️',
    description: 'Musei, quartieri e street food',
    blocks: [
      { type: 'attraction', title: 'Museo o sito storico', timeSlot: 'morning' },
      { type: 'transport', title: 'Spostamento in centro', timeSlot: 'morning' },
      { type: 'meal', title: 'Street food', timeSlot: 'afternoon' },
      { type: 'activity', title: 'Walking tour', timeSlot: 'evening' },
    ],
  },
  {
    id: 'departure',
    label: 'Partenza',
    emoji: '🛫',
    description: 'Check-out, transfer e volo',
    blocks: [
      { type: 'hotel', title: 'Check-out', timeSlot: 'morning' },
      { type: 'transport', title: 'Transfer aeroporto', timeSlot: 'morning' },
      { type: 'flight', title: 'Volo di ritorno', timeSlot: 'afternoon' },
    ],
  },
];