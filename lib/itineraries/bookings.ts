/** Snapshot prenotazioni sulla pratica — safe per client e server. */

export type FlightLegRecap = {
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
};

export type FlightBookingRecap = {
  bookingId: string | null;
  bookingRef: string | null;
  status: string | null;
  offerId?: string | null;
  amountEur?: number | null;
  currency?: string | null;
  outbound: FlightLegRecap;
  returnLeg: FlightLegRecap | null;
  bookedAt: string;
};

export type HotelBookingRecap = {
  bookingId: string | null;
  bookingRef: string | null;
  hotelName: string;
  city?: string | null;
  address?: string | null;
  roomName?: string | null;
  checkin?: string | null;
  checkout?: string | null;
  amountEur?: number | null;
  currency?: string | null;
  bookedAt: string;
};

export type ActivityBookingRecap = {
  bookingRef: string | null;
  title: string;
  provider: 'viator' | 'attractions';
  bookingUrl?: string | null;
  amountEur?: number | null;
  currency?: string | null;
  bookedAt: string;
};

export function formatBookingMoney(
  amount?: number | null,
  currency?: string | null
): string | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency || 'EUR'}`;
  }
}

export function formatFlightWhen(iso?: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(t));
}

export type EditionMemberCard = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
  status: 'interested' | 'confirmed' | 'left';
  ratingAvg?: number | null;
  ratingCount?: number;
};

export type EditionPeerFlight = {
  fingerprint: string;
  recap: FlightBookingRecap;
  bookers: { userId: string; firstName: string | null }[];
};

export function flightFingerprint(recap: FlightBookingRecap): string {
  const o = recap.outbound;
  const r = recap.returnLeg;
  return [
    o.flightNumber ?? '',
    o.departureAt ?? '',
    o.airlineCode ?? '',
    r?.flightNumber ?? '',
    r?.departureAt ?? '',
  ].join('|');
}

export type FlightStatusKind = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'unknown';

const PENDING_STATUSES = new Set([
  'PENDING_CONFIRMATION',
  'CREATED',
  'PENDING',
]);

const CONFIRMED_STATUSES = new Set(['CONFIRMED', 'TICKETED']);

const FAILED_STATUSES = new Set(['FAILED', 'EXPIRED']);

const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELLED_WITH_CHARGES']);

export function parseFlightStatus(status: string | null | undefined): FlightStatusKind {
  const s = status?.trim().toUpperCase();
  if (!s) return 'unknown';
  if (PENDING_STATUSES.has(s)) return 'pending';
  if (CONFIRMED_STATUSES.has(s)) return 'confirmed';
  if (FAILED_STATUSES.has(s)) return 'failed';
  if (CANCELLED_STATUSES.has(s)) return 'cancelled';
  return 'unknown';
}

export function isFlightPendingConfirmation(status: string | null | undefined): boolean {
  return parseFlightStatus(status) === 'pending';
}

export function formatFlightBookingStatus(status: string | null | undefined): {
  label: string;
  description: string;
  kind: FlightStatusKind;
} {
  const kind = parseFlightStatus(status);
  switch (kind) {
    case 'pending':
      return {
        kind,
        label: 'Pagato · compagnia in elaborazione',
        description:
          'Il pagamento è andato a buon fine e il codice è valido. La compagnia sta confermando il biglietto — di solito entro pochi minuti.',
      };
    case 'confirmed':
      return {
        kind,
        label: 'Confermato dalla compagnia',
        description: 'Biglietto emesso. Usa il codice per il check-in.',
      };
    case 'failed':
      return {
        kind,
        label: 'Conferma non riuscita',
        description: 'Contattaci o riprova dalla ricerca voli.',
      };
    case 'cancelled':
      return {
        kind,
        label: 'Prenotazione annullata',
        description: 'Il volo risulta cancellato.',
      };
    default:
      return {
        kind: 'unknown',
        label: status?.trim() || 'Stato in aggiornamento',
        description: 'Stiamo sincronizzando lo stato con la compagnia.',
      };
  }
}
