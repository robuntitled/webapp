import { describe, expect, it, vi } from 'vitest';

/** Mirrors BOOKING_RECONCILIATION_USER_MESSAGE — keep in sync with booking-reconciliation.ts */
const USER_MESSAGE = 'Prenotazione ricevuta, stiamo completando la registrazione';

// Mirrors withSaveRetry contract (server-only module not imported here).
async function withSaveRetryLocal<T>(
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
          continue;
        }
      }
      return { ok: true, value };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, error: lastError };
}

describe('booking reconciliation helpers', () => {
  it('defines Italian user message for orphan bookings', () => {
    expect(USER_MESSAGE).toMatch(/Prenotazione ricevuta/i);
    expect(USER_MESSAGE).toMatch(/registrazione/i);
  });

  it('retries save and succeeds on later attempt', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ error: 'transient' })
      .mockResolvedValueOnce({ practice: { id: 'p1' } });
    const result = await withSaveRetryLocal(fn, 3);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ practice: { id: 'p1' } });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns error after exhausting retries', async () => {
    const fn = vi.fn().mockResolvedValue({ error: 'db down' });
    const result = await withSaveRetryLocal(fn, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db down');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
