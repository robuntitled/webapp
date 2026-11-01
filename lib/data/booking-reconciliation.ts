import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export const BOOKING_RECONCILIATION_USER_MESSAGE =
  'Pagamento ricevuto, stiamo verificando la prenotazione. Ti scriviamo per email.' as const;

export type BookingReconciliationKind = 'flight' | 'hotel';

export type BookingReconciliationRow = {
  id: string;
  user_id: string;
  practice_id: string | null;
  kind: BookingReconciliationKind;
  provider: string;
  provider_booking_id: string | null;
  provider_booking_ref: string | null;
  provider_status: string | null;
  amount_eur: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
  status: 'pending_reconciliation' | 'resolved' | 'abandoned';
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function tableMissing(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '42P01' ||
    Boolean(error?.message && /booking_reconciliation/i.test(error.message))
  );
}

export async function withSaveRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  let lastError = 'Salvataggio fallito.';
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      if (value && typeof value === 'object' && 'error' in value) {
        const err = (value as { error?: string }).error;
        if (err) {
          lastError = err;
          console.error(`[${label}] attempt ${i + 1}`, err);
          continue;
        }
      }
      return { ok: true, value };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[${label}] attempt ${i + 1}`, err);
    }
  }
  return { ok: false, error: lastError };
}

export async function recordBookingReconciliation(input: {
  userId: string;
  practiceId?: string | null;
  kind: BookingReconciliationKind;
  providerBookingId?: string | null;
  providerBookingRef?: string | null;
  providerStatus?: string | null;
  amountEur?: number | null;
  currency?: string | null;
  payload?: Record<string, unknown>;
  lastError?: string | null;
}): Promise<{ id: string } | { error: string; loggedOnly: true }> {
  const row = {
    user_id: input.userId,
    practice_id: input.practiceId ?? null,
    kind: input.kind,
    provider: 'liteapi',
    provider_booking_id: input.providerBookingId ?? null,
    provider_booking_ref: input.providerBookingRef ?? null,
    provider_status: input.providerStatus ?? null,
    amount_eur: input.amountEur ?? null,
    currency: input.currency ?? null,
    payload: input.payload ?? {},
    status: 'pending_reconciliation' as const,
    last_error: input.lastError ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('booking_reconciliation')
    .insert(row)
    .select('id')
    .single();

  if (error || !data) {
    // Tabella non ancora migrata in prod: log strutturato per follow-up manuale.
    console.error('[booking_reconciliation] persist failed — MANUAL FOLLOW-UP', {
      ...row,
      dbError: error?.message,
      tableMissing: tableMissing(error),
    });
    return {
      error: error?.message ?? 'Impossibile salvare riconciliazione.',
      loggedOnly: true,
    };
  }

  console.error('[booking_reconciliation] PENDING FOLLOW-UP', {
    id: data.id,
    kind: input.kind,
    providerBookingId: input.providerBookingId,
    practiceId: input.practiceId,
  });

  return { id: data.id as string };
}

export async function listPendingBookingReconciliations(limit = 50): Promise<{
  rows: BookingReconciliationRow[];
  tableReady: boolean;
}> {
  const { data, error } = await supabaseAdmin
    .from('booking_reconciliation')
    .select('*')
    .eq('status', 'pending_reconciliation')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (tableMissing(error)) return { rows: [], tableReady: false };
    console.error('[booking_reconciliation] list', error.message);
    return { rows: [], tableReady: true };
  }
  return { rows: (data ?? []) as BookingReconciliationRow[], tableReady: true };
}

export async function countPendingBookingReconciliations(): Promise<{
  count: number;
  tableReady: boolean;
}> {
  const { count, error } = await supabaseAdmin
    .from('booking_reconciliation')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_reconciliation');

  if (error) {
    if (tableMissing(error)) return { count: 0, tableReady: false };
    return { count: 0, tableReady: true };
  }
  return { count: count ?? 0, tableReady: true };
}

export async function resolveBookingReconciliation(input: {
  id: string;
  adminUserId: string;
  note: string;
  status?: 'resolved' | 'abandoned';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const note = input.note.trim();
  if (!note) return { ok: false, error: 'Nota obbligatoria.' };
  if (note.length > 2000) return { ok: false, error: 'Nota troppo lunga.' };

  const status = input.status ?? 'resolved';
  const now = new Date().toISOString();

  const { data: existing, error: loadError } = await supabaseAdmin
    .from('booking_reconciliation')
    .select('id, payload, status')
    .eq('id', input.id)
    .maybeSingle();

  if (loadError) {
    if (tableMissing(loadError)) {
      return { ok: false, error: 'Tabella riconciliazione non disponibile.' };
    }
    return { ok: false, error: loadError.message };
  }
  if (!existing) return { ok: false, error: 'Riga non trovata.' };

  const prevPayload =
    existing.payload && typeof existing.payload === 'object'
      ? (existing.payload as Record<string, unknown>)
      : {};

  const payload = {
    ...prevPayload,
    resolvedNote: note,
    resolvedBy: input.adminUserId,
    resolvedAt: now,
  };

  const { error } = await supabaseAdmin
    .from('booking_reconciliation')
    .update({
      status,
      payload,
      updated_at: now,
      // Columns from migration 043 — ignored if missing until applied.
      resolved_at: now,
      resolved_by: input.adminUserId,
      resolve_note: note,
    })
    .eq('id', input.id);

  if (error) {
    // Retry without 043 columns if they do not exist yet.
    if (/resolved_at|resolved_by|resolve_note|column/i.test(error.message)) {
      const retry = await supabaseAdmin
        .from('booking_reconciliation')
        .update({ status, payload, updated_at: now })
        .eq('id', input.id);
      if (retry.error) return { ok: false, error: retry.error.message };
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
