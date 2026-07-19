import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isPhoneVerifyRequired } from '@/lib/flags';

export const PHONE_VERIFY_REQUIRED_CODE = 'PHONE_VERIFY_REQUIRED';

export { isPhoneVerifyRequired };

export class PhoneVerifyRequiredError extends Error {
  readonly code = PHONE_VERIFY_REQUIRED_CODE;

  constructor(
    message = 'Per creare un viaggio o unirti a uno devi verificare il telefono (un solo codice WhatsApp).'
  ) {
    super(message);
    this.name = 'PhoneVerifyRequiredError';
  }
}

/**
 * Se PHONE_VERIFY_REQUIRED non è true → non blocca (fase sviluppo / senza WhatsApp).
 */
export async function requirePhoneVerified(userId: string): Promise<void> {
  if (!isPhoneVerifyRequired()) {
    return;
  }

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
