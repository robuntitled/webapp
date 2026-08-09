/**
 * Legge lat/lng dai metadati della foto (EXIF/HEIC) al momento della selezione file.
 * exifr prima (leggero), ExifReader in fallback per HEIC iOS recenti.
 */

export type PhotoGps = {
  lat: number;
  lng: number;
};

function toGps(lat: unknown, lng: unknown): PhotoGps | null {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }
  return { lat, lng };
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fromExifr(file: File): Promise<PhotoGps | null> {
  try {
    const exifr = (await import('exifr')).default;
    const gps = await exifr.gps(file);
    const fromGps = gps ? toGps(gps.latitude, gps.longitude) : null;
    if (fromGps) return fromGps;
    const parsed = (await exifr.parse(file, { gps: true })) as {
      latitude?: number;
      longitude?: number;
    } | null;
    const fromParsed = toGps(parsed?.latitude, parsed?.longitude);
    if (fromParsed) return fromParsed;
  } catch {
    /* parser miss */
  }
  return null;
}

async function fromExifReader(file: File): Promise<PhotoGps | null> {
  try {
    const ExifReader = (await import('exifreader')).default;
    const tags = await ExifReader.load(await file.arrayBuffer(), {
      expanded: true,
    });
    return toGps(asNumber(tags.gps?.Latitude), asNumber(tags.gps?.Longitude));
  } catch {
    /* parser miss */
  }
  return null;
}

/** Estrae GPS dallo scatto (metadati file), non dalla posizione attuale del device. */
export async function readPhotoGpsFromFile(file: File): Promise<PhotoGps | null> {
  const primary = await fromExifr(file);
  if (primary) return primary;
  return fromExifReader(file);
}
