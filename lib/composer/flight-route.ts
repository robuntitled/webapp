import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { DestinationMeta } from '@/types/composer';

export type FlightLegKind = 'outbound' | 'hop' | 'domestic' | 'return';

export type FlightLeg = {
  id: string;
  from: string;
  to: string;
  date: string;
  endDate?: string;
  kind: FlightLegKind;
  tripType: 'oneway' | 'roundtrip';
  dayIndex: number;
};

const ITALY = 'Italia';

const WIDE_COUNTRIES = new Set([
  'indonesia',
  'stati uniti',
  'australia',
  'brasile',
  'cina',
  'india',
  'giappone',
  'canada',
  'messico',
  'thailandia',
  'filippine',
]);

function tripDestinationCountryLabel(destination: string, meta?: Partial<DestinationMeta>): string {
  const fromMeta = meta?.country?.trim();
  if (fromMeta) return fromMeta;
  const first = destination.split(',')[0]?.trim() || destination.trim();
  return first;
}

function countryOf(dest: DestinationMeta): string {
  return tripDestinationCountryLabel(dest.label, dest).trim() || dest.label;
}

function sameCountry(a: DestinationMeta, b: DestinationMeta): boolean {
  return countryOf(a).toLowerCase() === countryOf(b).toLowerCase();
}

function stopLabel(dest: DestinationMeta): string {
  const country = countryOf(dest);
  if (dest.placeType === 'country') return country;
  return dest.label;
}

export function needsVisitOrder(destinations: DestinationMeta[]): boolean {
  return destinations.length >= 2;
}

export function hasWideCountry(destinations: DestinationMeta[]): boolean {
  return destinations.some((d) => WIDE_COUNTRIES.has(countryOf(d).toLowerCase()));
}

export function staySlices(
  startDate: string,
  endDate: string,
  stopCount: number
): Array<{ start: string; end: string }> {
  if (stopCount <= 0 || !startDate) return [];
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addDays(start, 7);
  const nights = Math.max(stopCount, differenceInCalendarDays(end, start));
  const base = Math.floor(nights / stopCount);
  let extra = nights - base * stopCount;
  const slices: Array<{ start: string; end: string }> = [];
  let cursor = 0;
  for (let i = 0; i < stopCount; i++) {
    const span = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    const from = addDays(start, cursor);
    const to = addDays(from, Math.max(1, span));
    slices.push({
      start: format(from, 'yyyy-MM-dd'),
      end: format(to, 'yyyy-MM-dd'),
    });
    cursor += Math.max(1, span);
  }
  return slices;
}

export function hopPlan(
  destinations: DestinationMeta[]
): Array<{ from: string; to: string; kind: FlightLegKind }> {
  const dests = destinations.filter((d) => countryOf(d).toLowerCase() !== 'italia');
  if (dests.length === 0) return [];
  if (dests.length === 1) {
    const to = stopLabel(dests[0]);
    return [{ from: ITALY, to, kind: 'outbound' }];
  }
  const points = dests.map(stopLabel);
  const hops: Array<{ from: string; to: string; kind: FlightLegKind }> = [
    { from: ITALY, to: points[0], kind: 'outbound' },
  ];
  for (let i = 0; i < dests.length - 1; i++) {
    hops.push({
      from: points[i],
      to: points[i + 1],
      kind: sameCountry(dests[i], dests[i + 1]) ? 'domestic' : 'hop',
    });
  }
  hops.push({ from: points[points.length - 1], to: ITALY, kind: 'return' });
  return hops;
}

export function sampleStartDates(
  windowStart: string,
  windowEnd: string,
  maxDays: number,
  maxSamples = 8
): string[] {
  const start = parseISO(windowStart);
  const latestStart = addDays(parseISO(windowEnd), -(maxDays - 1));
  if (latestStart < start) return [format(start, 'yyyy-MM-dd')];
  const span = differenceInCalendarDays(latestStart, start);
  if (span <= 0) return [format(start, 'yyyy-MM-dd')];
  const step = Math.max(3, Math.ceil(span / Math.max(1, maxSamples - 1)));
  const out: string[] = [];
  for (let offset = 0; offset <= span && out.length < maxSamples; offset += step) {
    out.push(format(addDays(start, offset), 'yyyy-MM-dd'));
  }
  const last = format(latestStart, 'yyyy-MM-dd');
  if (!out.includes(last) && out.length < maxSamples) out.push(last);
  return out;
}

export function buildFlightLegs(
  destinations: DestinationMeta[],
  startDate: string,
  endDate: string
): FlightLeg[] {
  if (!startDate) return [];
  const hops = hopPlan(destinations);
  if (hops.length === 0) return [];

  if (hops.length === 1) {
    return [
      {
        id: `rt-${hops[0].to}`,
        from: hops[0].from,
        to: hops[0].to,
        date: startDate,
        endDate,
        kind: hops[0].kind,
        tripType: 'roundtrip',
        dayIndex: 1,
      },
    ];
  }

  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addDays(start, 7);
  const span = Math.max(0, differenceInCalendarDays(end, start));

  return hops.map((hop, i) => {
    const dayOffset = hops.length <= 1 ? 0 : Math.round((i * span) / (hops.length - 1));
    const date = format(addDays(start, dayOffset), 'yyyy-MM-dd');
    return {
      id: `${hop.from}-${hop.to}-${i}`,
      from: hop.from,
      to: hop.to,
      date,
      kind: hop.kind,
      tripType: 'oneway' as const,
      dayIndex: dayOffset + 1,
    };
  });
}

export function legKindLabel(kind: FlightLegKind): string {
  if (kind === 'outbound') return 'Andata';
  if (kind === 'return') return 'Rientro';
  if (kind === 'domestic') return 'Volo interno';
  return 'Tra le mete';
}
