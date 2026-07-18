/**
 * Normalizza un numero in E.164 (default IT +39).
 * Accetta: 3331234567, 333 123 4567, +39 333..., 0039...
 */
export function normalizePhoneE164(
  raw: string,
  defaultCountry: 'IT' = 'IT'
): { ok: true; e164: string } | { ok: false; error: string } {
  const digits = raw.replace(/[^\d+]/g, '').trim();
  if (!digits) return { ok: false, error: 'Inserisci un numero di telefono' };

  let e164 = digits;

  if (e164.startsWith('00')) {
    e164 = `+${e164.slice(2)}`;
  }

  if (!e164.startsWith('+')) {
    // Italia: togli 0 iniziale del mobile/fisso nazionale
    let national = e164.replace(/\D/g, '');
    if (defaultCountry === 'IT') {
      if (national.startsWith('39') && national.length >= 11) {
        e164 = `+${national}`;
      } else {
        if (national.startsWith('0')) national = national.slice(1);
        e164 = `+39${national}`;
      }
    } else {
      e164 = `+${national}`;
    }
  } else {
    e164 = `+${e164.slice(1).replace(/\D/g, '')}`;
  }

  // E.164: + e 8–15 cifre
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { ok: false, error: 'Numero non valido. Usa il formato internazionale (es. +39 333 1234567).' };
  }

  // Mobile IT tipico 9–10 cifre dopo +39
  if (e164.startsWith('+39')) {
    const rest = e164.slice(3);
    if (rest.length < 9 || rest.length > 11) {
      return { ok: false, error: 'Numero italiano non valido (controlla le cifre).' };
    }
  }

  return { ok: true, e164 };
}

/** Maschera per UI: +39 ••• ••• 4567 */
export function maskPhoneE164(e164: string): string {
  if (e164.length < 6) return e164;
  const last = e164.slice(-4);
  const cc = e164.startsWith('+39') ? '+39' : e164.slice(0, 3);
  return `${cc} ••• ••• ${last}`;
}
