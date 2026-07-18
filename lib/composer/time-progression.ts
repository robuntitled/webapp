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

    // Hotel: solo orario check-in nel giorno del blocco (check-out è un altro giorno).
    if (block.type === 'hotel') {
      const checkIn =
        typeof block.content.checkInTime === 'string' && block.content.checkInTime
          ? block.content.checkInTime
          : typeof block.content.time === 'string' && block.content.time
            ? block.content.time
            : '14:00';
      const start = timeToMinutes(checkIn);
      result.set(block.id, {
        start: minutesToTime(start),
        end: minutesToTime(start),
        durationMinutes: 0,
      });
      // Non sposta il cursore delle attività: hotel non occupa la timeline
      continue;
    }

    // Volo: usa departure/arrival se presenti, senza forzare fine < inizio
    if (block.type === 'flight') {
      const dep =
        typeof block.content.departureTime === 'string' && block.content.departureTime
          ? block.content.departureTime
          : typeof block.content.time === 'string'
            ? block.content.time
            : null;
      const arr =
        typeof block.content.arrivalTime === 'string' && block.content.arrivalTime
          ? block.content.arrivalTime
          : null;
      if (dep) {
        const start = timeToMinutes(dep);
        const end = arr ? timeToMinutes(arr) : start;
        const endOk = end >= start ? end : start;
        result.set(block.id, {
          start: minutesToTime(start),
          end: minutesToTime(endOk),
          durationMinutes: Math.max(0, endOk - start),
        });
      }
      continue;
    }

    const explicitStart =
      typeof block.content.time === 'string' && block.content.time
        ? timeToMinutes(block.content.time)
        : null;
    const explicitEnd =
      typeof block.content.endTime === 'string' && block.content.endTime
        ? timeToMinutes(block.content.endTime)
        : null;

    const start = explicitStart ?? cursor;
    let duration = parseDurationToMinutes(block.content.duration);
    let end = start + duration;

    if (explicitEnd != null && explicitEnd > start) {
      end = explicitEnd;
      duration = end - start;
    }

    const schedule: StopSchedule = {
      start: minutesToTime(start),
      end: minutesToTime(end),
      durationMinutes: duration,
    };

    if (i < blocks.length - 1) {
      const next = blocks[i + 1];
      // Salta hotel nel calcolo transit (non è una tappa “visita”)
      if (next.type === 'hotel' || next.type === 'flight') {
        cursor = end;
      } else {
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
    } else {
      cursor = end;
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
