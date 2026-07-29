export const TRANSPORT_TYPE_ORDER = [
  'economy',
  'comfort',
  'business',
  'premium',
  'limousine',
  'suv',
  'van',
  'minibus',
  'bus',
] as const;

export type TransportTypeId = (typeof TRANSPORT_TYPE_ORDER)[number];

const TRANSPORT_LABELS_IT: Record<TransportTypeId, string> = {
  economy: 'Economy',
  comfort: 'Comfort',
  business: 'Business',
  premium: 'Premium',
  limousine: 'Limousine',
  suv: 'SUV',
  van: 'Van',
  minibus: 'Minibus',
  bus: 'Autobus',
};

export type TransferOffer = {
  transportType: TransportTypeId;
  labelIt: string;
  priceLabel: string;
  priceFloat: number;
  bookNow?: string;
  duration?: number;
  distance?: number;
};

type TransportTypePrice = {
  min_float?: number;
  min?: string;
  book_now?: string;
};

type RouteInfoData = {
  success?: boolean;
  distance?: number;
  distance_preferred?: number;
  duration?: number;
  prices?: Record<string, TransportTypePrice>;
};

function isTransportTypeId(value: string): value is TransportTypeId {
  return (TRANSPORT_TYPE_ORDER as readonly string[]).includes(value);
}

function pickData(payload: unknown): RouteInfoData | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const data = (root.data ?? root.Data) as RouteInfoData | undefined;
  if (!data || typeof data !== 'object') return null;
  return data;
}

function parsePriceEntry(
  entry: TransportTypePrice | undefined
): { priceLabel: string; priceFloat: number; bookNow?: string } | null {
  if (!entry || typeof entry !== 'object') return null;

  const bookNow =
    typeof entry.book_now === 'string' && entry.book_now.trim()
      ? entry.book_now.trim()
      : undefined;
  const minLabel =
    typeof entry.min === 'string' && entry.min.trim() ? entry.min.trim() : undefined;
  const minFloat =
    typeof entry.min_float === 'number' && Number.isFinite(entry.min_float)
      ? entry.min_float
      : null;

  if (bookNow) {
    return {
      priceLabel: bookNow,
      priceFloat: minFloat ?? parsePriceFloat(bookNow) ?? 0,
      bookNow,
    };
  }

  if (minFloat != null && minFloat > 0) {
    return {
      priceLabel: minLabel ?? `€${Math.round(minFloat)}`,
      priceFloat: minFloat,
    };
  }

  if (minLabel) {
    const parsed = parsePriceFloat(minLabel);
    if (parsed != null && parsed > 0) {
      return { priceLabel: minLabel, priceFloat: parsed };
    }
  }

  return null;
}

/** Parses numeric amount from formatted price strings like "€455" or "€4,659". */
export function parsePriceFloat(label: string): number | null {
  const cleaned = label.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1.234,56 → European
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    const [, decimals] = cleaned.split(',');
    // 4,659 → thousands; 4,65 → decimal
    normalized =
      decimals && decimals.length === 3
        ? cleaned.replace(',', '')
        : cleaned.replace(',', '.');
  } else if (cleaned.includes('.')) {
    const [, decimals] = cleaned.split('.');
    // 2.701 → thousands; 2.70 → decimal
    normalized =
      decimals && decimals.length === 3
        ? cleaned.replace('.', '')
        : cleaned;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function transportLabelIt(type: TransportTypeId): string {
  return TRANSPORT_LABELS_IT[type];
}

export function parseRouteInfoOffers(payload: unknown): {
  offers: TransferOffer[];
  distance?: number;
  duration?: number;
  success: boolean;
} {
  const data = pickData(payload);
  if (!data) {
    return { offers: [], success: false };
  }

  const distance =
    typeof data.distance_preferred === 'number' && data.distance_preferred > 0
      ? data.distance_preferred
      : typeof data.distance === 'number' && data.distance > 0
        ? data.distance
        : undefined;

  const duration =
    typeof data.duration === 'number' && data.duration > 0
      ? data.duration
      : undefined;

  const prices = data.prices ?? {};
  const offers: TransferOffer[] = [];

  for (const type of TRANSPORT_TYPE_ORDER) {
    const parsed = parsePriceEntry(prices[type]);
    if (!parsed) continue;

    offers.push({
      transportType: type,
      labelIt: transportLabelIt(type),
      priceLabel: parsed.priceLabel,
      priceFloat: parsed.priceFloat,
      bookNow: parsed.bookNow,
      duration,
      distance,
    });
  }

  // Include unknown transport types from API (future-proof)
  for (const [key, entry] of Object.entries(prices)) {
    if (isTransportTypeId(key)) continue;
    const parsed = parsePriceEntry(entry);
    if (!parsed) continue;
    offers.push({
      transportType: 'economy',
      labelIt: key.charAt(0).toUpperCase() + key.slice(1),
      priceLabel: parsed.priceLabel,
      priceFloat: parsed.priceFloat,
      bookNow: parsed.bookNow,
      duration,
      distance,
    });
  }

  offers.sort((a, b) => a.priceFloat - b.priceFloat);

  return {
    offers,
    distance,
    duration,
    success: data.success !== false && offers.length > 0,
  };
}
