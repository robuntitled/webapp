export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'flex';

export const TIME_SLOTS: {
  id: TimeSlot;
  label: string;
  emoji: string;
  hours: string;
  order: number;
}[] = [
  { id: 'morning', label: 'Mattina', emoji: '🌅', hours: '08:00–12:00', order: 0 },
  { id: 'afternoon', label: 'Pomeriggio', emoji: '☀️', hours: '12:00–18:00', order: 1 },
  { id: 'evening', label: 'Sera', emoji: '🌆', hours: '18:00–22:00', order: 2 },
  { id: 'night', label: 'Notte', emoji: '🌙', hours: '22:00+', order: 3 },
  { id: 'flex', label: 'Flessibile', emoji: '⏱️', hours: 'Senza orario', order: 4 },
];

export function getTimeSlotLabel(slot: string | undefined): string {
  return TIME_SLOTS.find((t) => t.id === slot)?.label ?? 'Flessibile';
}

export function getTimeSlotEmoji(slot: string | undefined): string {
  return TIME_SLOTS.find((t) => t.id === slot)?.emoji ?? '⏱️';
}

export function inferTimeSlotForType(type: string): TimeSlot {
  switch (type) {
    case 'flight':
      return 'morning';
    case 'hotel':
      return 'night';
    case 'meal':
      return 'evening';
    case 'free_time':
      return 'afternoon';
    default:
      return 'flex';
  }
}