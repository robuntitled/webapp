/**
 * Who-pays model for selected group flights (migration 049).
 * One booker can cover multiple beneficiaries in a single checkout.
 */

export type FlightCoverageStatus = 'pending' | 'booked' | 'covered';

export type FlightCoverageEntry = {
  beneficiaryUserId: string;
  coveredByUserId: string;
  status: FlightCoverageStatus;
  bookingId?: string | null;
  updatedAt: string;
};

export function parseFlightBookingCoverage(raw: unknown): FlightCoverageEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: FlightCoverageEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const beneficiaryUserId = String(o.beneficiaryUserId ?? '').trim();
    const coveredByUserId = String(o.coveredByUserId ?? '').trim();
    const status = o.status;
    if (!beneficiaryUserId || !coveredByUserId) continue;
    if (status !== 'pending' && status !== 'booked' && status !== 'covered') continue;
    out.push({
      beneficiaryUserId,
      coveredByUserId,
      status,
      bookingId: typeof o.bookingId === 'string' ? o.bookingId : null,
      updatedAt:
        typeof o.updatedAt === 'string' ? o.updatedAt : new Date(0).toISOString(),
    });
  }
  return out;
}

export function coverageForUser(
  entries: FlightCoverageEntry[],
  userId: string
): FlightCoverageEntry | null {
  return (
    entries.find(
      (e) =>
        e.beneficiaryUserId === userId &&
        (e.status === 'booked' || e.status === 'covered')
    ) ??
    entries.find((e) => e.beneficiaryUserId === userId) ??
    null
  );
}

/** Participants still needing a seat purchase (not booked / covered). */
export function uncoveredParticipantIds(
  participantIds: string[],
  entries: FlightCoverageEntry[]
): string[] {
  return participantIds.filter((id) => {
    const cov = coverageForUser(entries, id);
    return !(cov && (cov.status === 'booked' || cov.status === 'covered'));
  });
}

export function upsertCoverageSelection(input: {
  existing: FlightCoverageEntry[];
  bookerUserId: string;
  beneficiaryIds: string[];
}): FlightCoverageEntry[] {
  const now = new Date().toISOString();
  const locked = input.existing.filter(
    (e) => e.status === 'booked' || e.status === 'covered'
  );
  const lockedBeneficiaries = new Set(locked.map((e) => e.beneficiaryUserId));
  const nextPending = input.beneficiaryIds
    .filter((id) => !lockedBeneficiaries.has(id))
    .map((beneficiaryUserId) => ({
      beneficiaryUserId,
      coveredByUserId: input.bookerUserId,
      status: 'pending' as const,
      bookingId: null,
      updatedAt: now,
    }));
  // Drop prior pending rows for this booker / those beneficiaries, keep locked.
  const keepOthers = input.existing.filter(
    (e) =>
      (e.status === 'booked' || e.status === 'covered') ||
      (e.coveredByUserId !== input.bookerUserId &&
        !input.beneficiaryIds.includes(e.beneficiaryUserId))
  );
  return [...keepOthers.filter((e) => e.status === 'booked' || e.status === 'covered'), ...nextPending];
}

export function markCoverageBooked(input: {
  existing: FlightCoverageEntry[];
  bookerUserId: string;
  beneficiaryIds: string[];
  bookingId?: string | null;
}): FlightCoverageEntry[] {
  const now = new Date().toISOString();
  const set = new Set(input.beneficiaryIds);
  const updated = input.existing.map((e) => {
    if (!set.has(e.beneficiaryUserId)) return e;
    if (e.coveredByUserId !== input.bookerUserId && e.status !== 'pending') return e;
    return {
      ...e,
      coveredByUserId: input.bookerUserId,
      status:
        e.beneficiaryUserId === input.bookerUserId
          ? ('booked' as const)
          : ('covered' as const),
      bookingId: input.bookingId ?? e.bookingId ?? null,
      updatedAt: now,
    };
  });
  for (const id of input.beneficiaryIds) {
    if (updated.some((e) => e.beneficiaryUserId === id)) continue;
    updated.push({
      beneficiaryUserId: id,
      coveredByUserId: input.bookerUserId,
      status: id === input.bookerUserId ? 'booked' : 'covered',
      bookingId: input.bookingId ?? null,
      updatedAt: now,
    });
  }
  return updated;
}

export type ParticipantFlightUiStatus =
  | { kind: 'booked' }
  | { kind: 'pending' }
  | { kind: 'covered'; byName: string }
  | { kind: 'waiting' };

export function participantFlightUiStatus(input: {
  userId: string;
  selfBooked: boolean;
  coverage: FlightCoverageEntry | null;
  coveredByName?: string | null;
}): ParticipantFlightUiStatus {
  if (input.coverage?.status === 'covered') {
    return {
      kind: 'covered',
      byName: input.coveredByName?.trim() || 'altro partecipante',
    };
  }
  if (input.coverage?.status === 'booked' || input.selfBooked) {
    return { kind: 'booked' };
  }
  if (input.coverage?.status === 'pending') return { kind: 'pending' };
  return { kind: 'waiting' };
}

export function coverageStatusLabelIt(status: ParticipantFlightUiStatus): string {
  if (status.kind === 'booked') return 'Prenotato';
  if (status.kind === 'pending') return 'In attesa';
  if (status.kind === 'covered') return `Coperto da ${status.byName}`;
  return 'In attesa';
}
