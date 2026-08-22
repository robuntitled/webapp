export const LAUNCH_DURATIONS = [10, 14, 21] as const;

export type LaunchDuration = (typeof LAUNCH_DURATIONS)[number];

export function parseDurationParam(raw?: string | string[] | null): LaunchDuration | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return n === 10 || n === 14 || n === 21 ? n : undefined;
}

export function itineraryPath(slug: string, durationDays?: number) {
  return durationDays ? `/itinerario/${slug}?d=${durationDays}` : `/itinerario/${slug}`;
}
