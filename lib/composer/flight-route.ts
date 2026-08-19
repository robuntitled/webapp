import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { tripDestinationCountryLabel } from '@/lib/composer/destination-context';
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

export function buildFlightLegs(
  destinations: DestinationMeta[],
  startDate: string,
  endDate: string
): FlightLeg[] {
  if (!startDate) return [];
  const dests = destinations.filter((d) => countryOf(d).toLowerCase() !== 'italia');
  if (dests.length === 0) return [];

  if (dests.length === 1) {
    const to = stopLabel(dests[0]);
    return [
      {
        id: `rt-${to}`,
        from: ITALY,
        to,
        date: startDate,
        endDate,
        kind: 'outbound',
        tripType: 'roundtrip',
        dayIndex: 1,
      },
    ];
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

  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addDays(start, 7);
  const span = Math.max(0, differenceInCalendarDays(end, start));

  return hops.map((hop, i) => {
    const dayOffset =
      hops.length <= 1 ? 0 : Math.round((i * span) / (hops.length - 1));
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
