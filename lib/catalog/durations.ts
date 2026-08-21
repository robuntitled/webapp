/** Duree esposte per continente (spec §8). Override per meta in catalog/destinations. */
export function defaultDurationsForContinent(continent: string): number[] {
  switch (continent) {
    case 'Europa':
      return [5, 7, 10];
    case 'Africa':
      return [7, 10, 14];
    case 'Asia':
    case 'Medio Oriente':
      return [7, 10, 14];
    case 'Americhe':
      return [10, 14, 21];
    case 'Oceania':
      return [14, 21];
    default:
      return [7, 10];
  }
}

export const LAUNCH_ACTIVE_LIMIT = 12;
