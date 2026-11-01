import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/admin', () => ({
  isAdminEmail: vi.fn(),
}));
vi.mock('@/lib/data/booking-reconciliation', () => ({
  resolveBookingReconciliation: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { resolveBookingReconciliation } from '@/lib/data/booking-reconciliation';
import { resolveBookingReconciliationAction } from '@/actions/booking-reconciliation';

describe('resolveBookingReconciliationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admins', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', email: 'user@example.com' },
    } as never);
    vi.mocked(isAdminEmail).mockReturnValue(false);

    const result = await resolveBookingReconciliationAction({
      id: 'r1',
      note: 'ok',
    });

    expect(result).toEqual({ ok: false, error: 'Non autorizzato.' });
    expect(resolveBookingReconciliation).not.toHaveBeenCalled();
  });

  it('resolves for admins', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin', email: 'admin@example.com' },
    } as never);
    vi.mocked(isAdminEmail).mockReturnValue(true);
    vi.mocked(resolveBookingReconciliation).mockResolvedValue({ ok: true });

    const result = await resolveBookingReconciliationAction({
      id: 'r1',
      note: 'Rimborso ok',
    });

    expect(result).toEqual({ ok: true });
    expect(resolveBookingReconciliation).toHaveBeenCalledWith({
      id: 'r1',
      adminUserId: 'admin',
      note: 'Rimborso ok',
      status: 'resolved',
    });
  });
});
