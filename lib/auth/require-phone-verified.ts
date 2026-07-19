import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export const PHONE_VERIFY_REQUIRED_CODE = 'PHONE_VERIFY_REQUIRED';

export class PhoneVerifyRequiredError extends Error {
  readonly code = PHONE_VERIFY_REQUIRED_CODE;

  constructor(
    message = 'Per creare un viaggio o unirti a uno devi verificare il telefono. Vai in Impostazioni → Sicurezza.'
  ) {
    super(message);
    this.name = 'PhoneVerifyRequiredError';
  }
}

/**
 * Gate: solo chi ha phone_verified_at può creare trip o iscriversi.
 * Browse / profilo / composer bozza restano liberi.
 */
export async function requirePhoneVerified(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('phone_verified_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[requirePhoneVerified]', error);
    throw new Error('Impossibile verificare lo stato del telefono. Riprova.');
  }

  if (!data?.phone_verified_at) {
    throw new PhoneVerifyRequiredError();
  }
}

export function isPhoneVerifyRequiredError(error: unknown): error is PhoneVerifyRequiredError {
  return (
    error instanceof PhoneVerifyRequiredError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === PHONE_VERIFY_REQUIRED_CODE)
  );
}
