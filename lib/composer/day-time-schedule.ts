import type { ComposerBlock, ComposerBlockType } from '@/types/composer';

/** Cibo può sovrapporsi ad altre attività (pausa pranzo a metà visita). */
export function isMealBlockType(type: ComposerBlockType | string): boolean {
  return type === 'meal';
}

export function timeToMinutes(time: string): number | null {
  const parts = time.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const t = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseDurationMinutes(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return 60;
  const v = value.trim().toLowerCase();
  if (v === 'giornata intera' || v === 'fullday') return 480;
  if (v === 'mezza giornata') return 240;
  const matchH = v.match(/(\d+(?:\.\d+)?)\s*h/);
  const matchM = v.match(/(\d+)\s*m/);
  let total = 0;
  if (matchH) total += parseFloat(matchH[1]!) * 60;
  if (matchM) total += parseInt(matchM[1]!, 10);
  if (total === 0) {
    const num = parseInt(v, 10);
    if (!Number.isNaN(num)) total = num * 60;
  }
  return total > 0 ? total : 60;
}

export type BlockTimeRange = {
  blockId: string;
  type: ComposerBlockType;
  title: string;
  startMin: number;
  endMin: number;
};

/** Intervallo esplicito di un blocco, se ha almeno start (o end). */
export function getBlockTimeRange(block: ComposerBlock): BlockTimeRange | null {
  const startRaw =
    typeof block.content.time === 'string' ? block.content.time : '';
  const endRaw =
    typeof block.content.endTime === 'string' ? block.content.endTime : '';
  const startMin = startRaw ? timeToMinutes(startRaw) : null;
  if (startMin == null) return null;

  let endMin = endRaw ? timeToMinutes(endRaw) : null;
  if (endMin == null || endMin <= startMin) {
    endMin = startMin + parseDurationMinutes(block.content.duration);
  }

  return {
    blockId: block.id,
    type: block.type,
    title:
      typeof block.content.title === 'string' && block.content.title
        ? block.content.title
        : 'Tappa',
    startMin,
    endMin,
  };
}

/** Fine dell’ultima tappa con orario nel giorno (in minuti da mezzanotte). */
export function getLastActivityEndMinutes(blocks: ComposerBlock[]): number | null {
  let max: number | null = null;
  for (const b of blocks) {
    const r = getBlockTimeRange(b);
    if (!r) continue;
    if (max == null || r.endMin > max) max = r.endMin;
  }
  return max;
}

/**
 * Slot predefinito per una nuova tappa:
 * - prima del giorno: 08:00–09:00
 * - successive: subito dopo la fine dell’ultima (es. 09:00–10:00)
 */
export function getDefaultTimeSlotForNewBlock(
  blocks: ComposerBlock[],
  durationMinutes = 60
): { startTime: string; endTime: string; durationMinutes: number } {
  const lastEnd = getLastActivityEndMinutes(blocks);
  if (lastEnd == null) {
    return {
      startTime: '08:00',
      endTime: minutesToTime(8 * 60 + durationMinutes),
      durationMinutes,
    };
  }
  return {
    startTime: minutesToTime(lastEnd),
    endTime: minutesToTime(lastEnd + durationMinutes),
    durationMinutes,
  };
}

export type TimeOverlapConflict = {
  otherTitle: string;
  otherStart: string;
  otherEnd: string;
  message: string;
};

/**
 * Controlla sovrapposizioni.
 * I pasti (meal) possono sovrapporsi ad altre attività (e viceversa).
 * Due non-pasti non possono sovrapporsi.
 */
export function findTimeOverlapConflict(
  blocks: ComposerBlock[],
  candidate: {
    startTime: string;
    endTime: string;
    type: ComposerBlockType | string;
    excludeBlockId?: string;
  }
): TimeOverlapConflict | null {
  const startMin = timeToMinutes(candidate.startTime);
  const endMin = timeToMinutes(candidate.endTime);
  if (startMin == null || endMin == null) return null;
  if (endMin <= startMin) {
    return {
      otherTitle: '',
      otherStart: candidate.startTime,
      otherEnd: candidate.endTime,
      message: 'L’orario di fine deve essere dopo l’inizio.',
    };
  }

  const candidateIsMeal = isMealBlockType(candidate.type);

  for (const block of blocks) {
    if (candidate.excludeBlockId && block.id === candidate.excludeBlockId) continue;
    if (candidateIsMeal || isMealBlockType(block.type)) continue;

    const range = getBlockTimeRange(block);
    if (!range) continue;

    // Sovrapposizione se gli intervalli si intersecano (fine esclusiva a contatto ok: 8-10 e 10-11 ok)
    const overlaps = startMin < range.endMin && endMin > range.startMin;
    if (!overlaps) continue;

    return {
      otherTitle: range.title,
      otherStart: minutesToTime(range.startMin),
      otherEnd: minutesToTime(range.endMin),
      message: `Orario sovrapposto a «${range.title}» (${minutesToTime(range.startMin)}–${minutesToTime(range.endMin)}). Scegli un orario libero. I pasti possono coincidere con un’attività.`,
    };
  }

  return null;
}

function isPackableBlock(block: ComposerBlock): boolean {
  return (
    block.type === 'attraction' ||
    block.type === 'activity' ||
    block.type === 'meal' ||
    block.type === 'transport'
  );
}

function blockDurationMinutes(block: ComposerBlock): number {
  const range = getBlockTimeRange(block);
  if (range) return Math.max(30, range.endMin - range.startMin);
  return parseDurationMinutes(block.content.duration);
}

function withTimes(block: ComposerBlock, startMin: number, endMin: number): ComposerBlock {
  return {
    ...block,
    content: {
      ...block.content,
      time: minutesToTime(startMin),
      endTime: minutesToTime(endMin),
    },
  };
}

/**
 * Dopo drag&drop: ripacchetta dall’orario **minimo** del giorno (es. 08:00),
 * non dall’orario del blocco finito in testa. Così se trascini l’ultima (16:00)
 * in prima posizione, quella parte da 08:00 e le altre scalano in sequenza.
 * Hotel/volo/note restano invariati.
 */
export function repackBlockTimesInOrder(blocks: ComposerBlock[]): ComposerBlock[] {
  let minStart: number | null = null;
  for (const b of blocks) {
    if (!isPackableBlock(b)) continue;
    const r = getBlockTimeRange(b);
    if (r == null) continue;
    if (minStart == null || r.startMin < minStart) minStart = r.startMin;
  }
  let cursor = minStart ?? 8 * 60;

  return blocks.map((block) => {
    if (!isPackableBlock(block)) return block;
    const dur = blockDurationMinutes(block);
    const start = cursor;
    const end = start + dur;
    cursor = end;
    return withTimes(block, start, end);
  });
}

/**
 * Dopo modifica orario di una tappa: le successive (packable) partono dalla fine di quella.
 * I pasti restano dove sono se non modificati; le altre si spostano in sequenza.
 */
export function cascadeTimesAfterBlock(
  blocks: ComposerBlock[],
  editedBlockId: string,
  newStartTime: string,
  newEndTime: string
): ComposerBlock[] {
  const startMin = timeToMinutes(newStartTime);
  const endMin = timeToMinutes(newEndTime);
  if (startMin == null || endMin == null || endMin <= startMin) return blocks;

  const idx = blocks.findIndex((b) => b.id === editedBlockId);
  if (idx < 0) return blocks;

  let cursor = endMin;
  return blocks.map((block, i) => {
    if (i < idx) return block;
    if (i === idx) {
      return withTimes(block, startMin, endMin);
    }
    // successive
    if (!isPackableBlock(block)) return block;
    // Pasti: lasciati se non si sovrappongono forzatamente; se vogliamo "tutto si aggiusta"
    // li spostiamo anche loro in sequenza (più coerente con drag).
    const dur = blockDurationMinutes(block);
    const start = cursor;
    const end = start + dur;
    cursor = end;
    return withTimes(block, start, end);
  });
}
