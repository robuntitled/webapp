/**
 * Modello B (A4): le partenze ufficiali senza tour operator licenziato
 * non sono iscrivibili — si mostrano come «In arrivo».
 * Solo codice: nessuna scrittura DB.
 */

import { OFFICIAL_EDITION_SEEDS } from '@/lib/itineraries/catalog';

export type EditionJoinabilityInput = {
  template_id: string;
  date_from: string;
  edition_type?: 'official' | 'private' | string | null;
  /** Presente solo quando un TO partner è collegato (Fase 2 / M3). */
  tourOperatorId?: string | null;
};

/** Seed ufficiale senza tour operator → coming soon. */
export function officialSeedLacksTourOperator(
  templateId: string,
  dateFrom: string
): boolean {
  const day = dateFrom.slice(0, 10);
  const seed = OFFICIAL_EDITION_SEEDS.find(
    (s) => s.template_id === templateId && s.date_from === day
  );
  if (!seed) return false;
  return !seed.tourOperatorId;
}

/**
 * Partenza non iscrivibile (A4).
 * - Private / amici: join via invito resta possibile.
 * - Official senza tourOperatorId: «In arrivo».
 */
export function isEditionComingSoon(input: EditionJoinabilityInput): boolean {
  if (input.edition_type === 'private') return false;
  if (input.tourOperatorId) return false;
  // Seed Thailandia pubblicati senza TO (12/11, 5/12, 8/1) + ogni official senza TO.
  if (input.edition_type === 'official' || input.edition_type == null) {
    if (officialSeedLacksTourOperator(input.template_id, input.date_from)) {
      return true;
    }
    // Official generica senza TO: stessa regola modello B.
    if (input.edition_type === 'official') return true;
  }
  return false;
}

export const EDITION_COMING_SOON_JOIN_ERROR =
  'Questa partenza è in arrivo: le iscrizioni si apriranno quando sarà collegato un tour operator. Nessuna iscrizione possibile ora.';
