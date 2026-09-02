/** Copy e segnali FOMO per partenze ufficiali — cold start gruppi */

export function daysUntilDeparture(dateFrom: string): number {
  const dep = new Date(`${dateFrom.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dep.getTime() - today.getTime()) / 86_400_000);
}

export function editionThresholdProgress(confirmed: number, minConfirmed: number): number {
  if (minConfirmed <= 0) return confirmed > 0 ? 100 : 0;
  return Math.min(100, Math.round((confirmed / minConfirmed) * 100));
}

export type EditionScarcityVariant = 'open' | 'warming' | 'closing' | 'formed';

export function editionScarcity(input: {
  confirmed_count: number;
  min_confirmed: number;
  date_from: string;
  status?: string;
}): { label: string; variant: EditionScarcityVariant; sublabel: string } {
  const { confirmed_count: confirmed, min_confirmed: min, date_from, status } = input;
  const progress = editionThresholdProgress(confirmed, min);
  const days = daysUntilDeparture(date_from);
  const spotsLeft = Math.max(0, min - confirmed);

  if (status === 'formed' || confirmed >= min) {
    return {
      label: 'Gruppo formato',
      variant: 'formed',
      sublabel: `${confirmed} viaggiatori confermati`,
    };
  }
  if (days <= 21 && progress >= 40) {
    return {
      label: 'In chiusura',
      variant: 'closing',
      sublabel:
        spotsLeft === 1
          ? 'Manca 1 volo per la soglia'
          : `Mancano ${spotsLeft} voli per la soglia`,
    };
  }
  if (confirmed >= 1) {
    return {
      label: 'Ultimi posti',
      variant: 'warming',
      sublabel: `${confirmed}/${min} hanno già prenotato il volo`,
    };
  }
  return {
    label: 'Disponibile',
    variant: 'open',
    sublabel: `Soglia gruppo: ${min} voli confermati`,
  };
}

export function editionBadgeDisplay(
  scarcity: { variant: EditionScarcityVariant },
  spotsLeft: number
): string {
  switch (scarcity.variant) {
    case 'formed':
      return 'Gruppo confermato';
    case 'open':
      return 'Gruppo in formazione';
    case 'closing':
      return spotsLeft > 0 ? `Ultimi ${spotsLeft} posti` : 'In chiusura';
    case 'warming':
      return spotsLeft > 0 ? `Ultimi ${spotsLeft} posti` : 'Ultimi posti';
  }
}

export function editionParticipantsLabel(input: {
  interested_count?: number;
  /** @deprecated usare solo interested_count (iscritti al gruppo) */
  confirmed_count?: number;
}): string | null {
  const enrolled = input.interested_count ?? 0;
  if (enrolled <= 0) return null;
  return enrolled === 1 ? '👥 1 iscritto al gruppo' : `👥 ${enrolled} iscritti al gruppo`;
}

export function editionFlightsStatusLabel(confirmed: number, minConfirmed: number): string {
  const min = Math.max(minConfirmed, 1);
  const flightLabel = min === 1 ? 'volo confermato' : 'voli confermati';
  return `${confirmed} di ${min} ${flightLabel}`;
}

export function editionGroupHint(confirmed: number, minConfirmed: number): string {
  if (minConfirmed <= 0) {
    return confirmed > 0 ? 'Soglia voli raggiunta' : 'In attesa del primo volo';
  }
  if (confirmed >= minConfirmed) return 'Soglia voli raggiunta — il gruppo può partire';
  const remaining = minConfirmed - confirmed;
  return remaining === 1
    ? 'Ancora 1 volo per la soglia'
    : `Ancora ${remaining} voli per la soglia`;
}

export function editionJoinReason(input: {
  confirmed_count: number;
  min_confirmed: number;
  interested_count?: number;
  days?: number;
}): string {
  const { confirmed_count: confirmed, min_confirmed: min, interested_count = 0 } = input;
  const spotsLeft = Math.max(0, min - confirmed);
  const social =
    interested_count > confirmed
      ? `${interested_count} ${interested_count === 1 ? 'persona segue' : 'persone seguono'} questa partenza`
      : null;

  if (confirmed >= min) {
    return [social, 'Gruppo formato — prenota lo stesso volo dei partecipanti.'].filter(Boolean).join(' · ');
  }
  if (confirmed >= 1) {
    return [
      social,
      `${confirmed}/${min} con volo — ${spotsLeft} ${spotsLeft === 1 ? 'manca' : 'mancano'} per la soglia`,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (social) return `${social} — sii tra i primi a confermare il volo.`;
  return 'Sii tra i primi: prenota il volo e sblocca hotel e chat di gruppo.';
}
