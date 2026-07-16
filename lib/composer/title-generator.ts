const TITLE_TEMPLATES = [
  (place: string) => `Viaggio a ${place}`,
  (place: string) => `Esplorando ${place}`,
  (place: string) => `Avventura: ${place}`,
  (place: string) => `Alla scoperta di ${place}`,
  (place: string) => `Road trip ${place}`,
  (place: string) => `Weekend a ${place}`,
  (place: string) => `Tra le meraviglie di ${place}`,
  (place: string) => `Partenza per ${place}`,
] as const;

const MAX_TITLE_LENGTH = 30;

export function generateTripTitle(destinationLabel: string, seed?: string): string {
  const place = destinationLabel.trim() || 'nuova meta';
  let index = Math.floor(Math.random() * TITLE_TEMPLATES.length);
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % TITLE_TEMPLATES.length;
    index = hash;
  }
  const raw = TITLE_TEMPLATES[index](place);
  if (raw.length <= MAX_TITLE_LENGTH) return raw;
  const shortPlace = place.length > 12 ? `${place.slice(0, 10)}…` : place;
  const fallback = `Viaggio a ${shortPlace}`;
  return fallback.slice(0, MAX_TITLE_LENGTH);
}

export const TRIP_TITLE_MAX_LENGTH = MAX_TITLE_LENGTH;