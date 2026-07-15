import { haversineKm } from '@/lib/maps/distance';
import type { ComposerBlock } from '@/types/composer';

export type StopSchedule = {
  start: string; // HH:mm
  end: string; // HH:mm
  durationMinutes: number;
  transitToNext?: {
    distanceKm: number;
    minutes: number;
  };
};

function parseDurationToMinutes(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return 60;
  const v = value.trim().toLowerCase();
  if (v === 'giornata intera') return 480;
  if (v === 'mezza giornata') return 240;
  const matchH = v.match(/(\d+(?:\.\d+)?)\s*h/);
  const matchM = v.match(/(\d+)\s*m/);
  let total = 0;
  if (matchH) total += parseFloat(matchH[1]) * 60;
  if (matchM) total += parseInt(matchM[1], 10);
  if (total === 0) {
    const num = parseInt(v, 10);
    if (!Number.isNaN(num)) total = num * 60;
  }
  return total > 0 ? total : 60;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 9 * 60;
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function readFirstStartTime(blocks: ComposerBlock[]): number {
  for (const b of blocks) {
    const time = b.content.time;
    if (typeof time === 'string' && time) return timeToMinutes(time);
  }
  return 9 * 60; // default 9:00
}

function estimateTransitMinutes(distanceKm: number): number {
  // walk speed ~4 km/h + 5 min overhead; mixed transport ~15 km/h + 10 min
  if (distanceKm < 0.5) return 10;
  if (distanceKm < 2) return Math.round((distanceKm / 4) * 60) + 5;
  return Math.round((distanceKm / 15) * 60) + 10;
}

export function computeDaySchedule(
  blocks: ComposerBlock[],
  options?: { defaultStartMinutes?: number }
): Map<string, StopSchedule> {
  const result = new Map<string, StopSchedule>();
  if (blocks.length === 0) return result;

  let cursor =
    options?.defaultStartMinutes ?? readFirstStartTime(blocks);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const duration = parseDurationToMinutes(block.content.duration);

    const start = cursor;
    const end = start + duration;
    const schedule: StopSchedule = {
      start: minutesToTime(start),
      end: minutesToTime(end),
      durationMinutes: duration,
    };

    if (i < blocks.length - 1) {
      const next = blocks[i + 1];
      const a = readCoords(block);
      const b = readCoords(next);
      if (a && b) {
        const distanceKm = haversineKm(a, b);
        const transitMinutes = estimateTransitMinutes(distanceKm);
        schedule.transitToNext = { distanceKm, minutes: transitMinutes };
        cursor = end + transitMinutes;
      } else {
        cursor = end + 30;
      }
    }

    result.set(block.id, schedule);
  }

  return result;
}

function readCoords(block: ComposerBlock): { lat: number; lng: number } | null {
  const lat = block.content.lat;
  const lng = block.content.lng;
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
  return null;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function formatTransit(minutes: number, distanceKm: number): string {
  const m = Math.round(minutes);
  const km = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(2)} km`;
  return `${km} · ${m} min`;
}
