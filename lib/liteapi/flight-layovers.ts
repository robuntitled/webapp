export type FlightLayover = {
  airport: string;
  waitMinutes?: number | null;
};

export type FlightSegmentAirports = {
  origin: string | null;
  destination: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
};

function waitMinutes(arrivalAt?: string | null, nextDepartureAt?: string | null): number | null {
  if (!arrivalAt || !nextDepartureAt) return null;
  const a = Date.parse(arrivalAt);
  const b = Date.parse(nextDepartureAt);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

export function layoversFromSegments(segments: FlightSegmentAirports[]): FlightLayover[] {
  const out: FlightLayover[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const airport = segments[i].destination || segments[i + 1].origin;
    if (!airport) continue;
    out.push({
      airport: airport.toUpperCase(),
      waitMinutes: waitMinutes(segments[i].arrivalAt, segments[i + 1].departureAt),
    });
  }
  return out;
}

export function formatWaitMinutes(mins?: number | null): string | null {
  if (mins == null || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Riga visibile sotto la durata: "Scalo AMM · 8h 20m". */
export function formatLayoversLine(layovers?: FlightLayover[] | null): string | null {
  if (!layovers?.length) return null;
  if (layovers.length === 1) {
    const wait = formatWaitMinutes(layovers[0].waitMinutes);
    return wait ? `Scalo ${layovers[0].airport} · ${wait}` : `Scalo ${layovers[0].airport}`;
  }
  const codes = layovers.map((l) => l.airport).join(', ');
  const longest = layovers.reduce((best, l) =>
    (l.waitMinutes ?? 0) > (best.waitMinutes ?? 0) ? l : best
  );
  const wait = formatWaitMinutes(longest.waitMinutes);
  return wait ? `Scali ${codes} · sosta ${wait}` : `Scali ${codes}`;
}

export function hasLongLayover(layovers?: FlightLayover[] | null, minMinutes = 6 * 60): boolean {
  return (layovers ?? []).some((l) => (l.waitMinutes ?? 0) >= minMinutes);
}
