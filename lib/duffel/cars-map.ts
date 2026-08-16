export type DuffelPaymentType = 'postpaid' | 'guarantee' | 'prepaid';

export type CarsSearchCoords = { lat: number; lng: number };

export type CarsSearchPayloadInput = {
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  pickup: CarsSearchCoords;
  dropoff: CarsSearchCoords;
  driverAge: number;
  residenceCountryCode: string;
  radiusKm: number;
};

export function buildCarsSearchBody(input: CarsSearchPayloadInput) {
  return {
    data: {
      pickup_date: input.pickupDate,
      pickup_time: input.pickupTime,
      dropoff_date: input.dropoffDate,
      dropoff_time: input.dropoffTime,
      pickup_location: {
        radius: input.radiusKm,
        geographic_coordinates: {
          latitude: input.pickup.lat,
          longitude: input.pickup.lng,
        },
      },
      dropoff_location: {
        radius: input.radiusKm,
        geographic_coordinates: {
          latitude: input.dropoff.lat,
          longitude: input.dropoff.lng,
        },
      },
      driver: {
        age: input.driverAge,
        residence_country_code: input.residenceCountryCode.toUpperCase(),
      },
    },
  };
}

export type DuffelCar = {
  type?: string | null;
  transmission?: string | null;
  name?: string | null;
  max_passengers?: number | null;
  images?: Array<{ url?: string | null }> | null;
  fuel?: string | null;
  code?: string | null;
  category?: string | null;
  baggage?: { small?: number | null; large?: number | null } | null;
  air_conditioning?: boolean | null;
};

export type DuffelCarLocation = {
  name?: string | null;
  phone_number?: string | null;
  address?: {
    line_one?: string | null;
    city_name?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
    region?: string | null;
  } | null;
};

export type DuffelCarSupplier = {
  name?: string | null;
  logo_url?: string | null;
};

export type DuffelCarRate = {
  id: string;
  payment_type?: DuffelPaymentType | null;
  total_amount?: string | null;
  total_currency?: string | null;
  base_amount?: string | null;
  base_currency?: string | null;
  car?: DuffelCar | null;
  supplier?: DuffelCarSupplier | null;
  pickup_location?: DuffelCarLocation | null;
  dropoff_location?: DuffelCarLocation | null;
};

export type DuffelCondition = { title?: string | null; text?: string | null };
export type DuffelCharge = {
  amount?: string | null;
  currency?: string | null;
  description?: string | null;
};
export type DuffelPrivacyPolicy = { title?: string | null; text?: string | null };

export type CarRateHit = {
  id: string;
  paymentType: DuffelPaymentType;
  bookableWithoutCard: boolean;
  totalAmount: number;
  totalCurrency: string;
  priceLabel: string;
  carName: string;
  categoryLabel: string;
  transmissionLabel: string;
  fuelLabel: string;
  passengers: number | null;
  bagsLarge: number | null;
  bagsSmall: number | null;
  airConditioning: boolean;
  imageUrl: string | null;
  supplierName: string;
  supplierLogo: string | null;
  pickupName: string | null;
  dropoffName: string | null;
};

const CATEGORY_IT: Record<string, string> = {
  mini: 'Mini',
  mini_elite: 'Mini elite',
  economy: 'Economy',
  economy_elite: 'Economy elite',
  compact: 'Compatta',
  compact_elite: 'Compatta elite',
  intermediate: 'Intermedia',
  intermediate_elite: 'Intermedia elite',
  standard: 'Standard',
  standard_elite: 'Standard elite',
  fullsize: 'Full size',
  fullsize_elite: 'Full size elite',
  premium: 'Premium',
  luxury: 'Luxury',
  oversize: 'Oversize',
  special: 'Speciale',
  suv: 'SUV',
  van: 'Van',
  convertible: 'Cabriolet',
  coupe: 'Coupé',
  estate: 'Station wagon',
  pickup: 'Pickup',
  commercial: 'Commerciale',
};

const TRANSMISSION_IT: Record<string, string> = {
  automatic: 'Automatico',
  manual: 'Manuale',
};

const FUEL_IT: Record<string, string> = {
  petrol: 'Benzina',
  diesel: 'Diesel',
  hybrid: 'Ibrida',
  electric: 'Elettrica',
  lpg: 'GPL',
  hydrogen: 'Idrogeno',
};

export function canBookWithoutCard(type: string | null | undefined): boolean {
  return type === 'postpaid';
}

export function paymentTypeLabel(type: DuffelPaymentType): string {
  if (type === 'postpaid') return 'Paga al ritiro';
  if (type === 'guarantee') return 'Carta a garanzia';
  return 'Paga ora';
}

export function formatMoneyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function labelOrRaw(map: Record<string, string>, raw: string | null | undefined): string {
  if (!raw) return '';
  return map[raw.toLowerCase()] ?? raw.replace(/_/g, ' ');
}

function parseAmount(raw: string | null | undefined): number {
  const n = Number.parseFloat(raw ?? '');
  return Number.isFinite(n) ? n : 0;
}

export function locationLabel(loc: DuffelCarLocation | null | undefined): string | null {
  if (!loc) return null;
  const city = loc.address?.city_name?.trim();
  const name = loc.name?.trim();
  if (name && city && !name.toLowerCase().includes(city.toLowerCase())) {
    return `${name}, ${city}`;
  }
  return name || city || loc.address?.line_one || null;
}

export function mapCarRate(rate: DuffelCarRate): CarRateHit | null {
  const id = rate.id?.trim();
  if (!id) return null;
  const paymentType: DuffelPaymentType =
    rate.payment_type === 'prepaid' || rate.payment_type === 'guarantee'
      ? rate.payment_type
      : 'postpaid';
  const totalAmount = parseAmount(rate.total_amount ?? rate.base_amount);
  const totalCurrency = (rate.total_currency || rate.base_currency || 'EUR').toUpperCase();
  const car = rate.car;
  return {
    id,
    paymentType,
    bookableWithoutCard: canBookWithoutCard(paymentType),
    totalAmount,
    totalCurrency,
    priceLabel: formatMoneyAmount(totalAmount, totalCurrency),
    carName: car?.name?.trim() || 'Auto',
    categoryLabel: labelOrRaw(CATEGORY_IT, car?.category) || 'Categoria n/d',
    transmissionLabel: labelOrRaw(TRANSMISSION_IT, car?.transmission),
    fuelLabel: labelOrRaw(FUEL_IT, car?.fuel),
    passengers: car?.max_passengers ?? null,
    bagsLarge: car?.baggage?.large ?? null,
    bagsSmall: car?.baggage?.small ?? null,
    airConditioning: Boolean(car?.air_conditioning),
    imageUrl: car?.images?.find((img) => img?.url)?.url ?? null,
    supplierName: rate.supplier?.name?.trim() || 'Noleggiatore',
    supplierLogo: rate.supplier?.logo_url ?? null,
    pickupName: locationLabel(rate.pickup_location),
    dropoffName: locationLabel(rate.dropoff_location),
  };
}

export function mapCarRates(rates: DuffelCarRate[] | null | undefined): CarRateHit[] {
  const mapped = (rates ?? [])
    .map(mapCarRate)
    .filter((r): r is CarRateHit => Boolean(r));
  mapped.sort((a, b) => {
    if (a.bookableWithoutCard !== b.bookableWithoutCard) {
      return a.bookableWithoutCard ? -1 : 1;
    }
    return a.totalAmount - b.totalAmount;
  });
  return mapped;
}

const E164 = /^\+[1-9]\d{7,14}$/;

/** Normalizza un telefono verso E.164. Default Italia se manca il prefisso. */
export function normalizePhoneE164(raw: string, defaultCountry = 'IT'): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  if (digits.startsWith('+')) {
    return E164.test(digits) ? digits : null;
  }
  const local = digits.replace(/^0+/, '');
  if (defaultCountry === 'IT' && /^3\d{8,9}$/.test(local)) {
    const out = `+39${local}`;
    return E164.test(out) ? out : null;
  }
  if (/^\d{8,14}$/.test(local)) {
    const out = `+${local}`;
    return E164.test(out) ? out : null;
  }
  return null;
}
