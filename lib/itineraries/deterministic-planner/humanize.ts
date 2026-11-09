/**
 * Italian presentation helpers — never show raw codes or English internals in UI.
 */

const TRANSFER_IT: Record<string, string> = {
  none: '',
  internal_flight: 'volo interno',
  ferry: 'traghetto',
  bus: 'bus / strada',
};

/** Placeholder / English / stub POI → natural Italian for itinerary lines. */
const POI_LABEL_IT: Array<{ test: RegExp; label: string }> = [
  { test: /^soft$/i, label: 'Arrivo soft e check-in' },
  { test: /^free$/i, label: 'Tempo libero in zona' },
  { test: /^libero$/i, label: 'Tempo libero' },
  { test: /^buffer$/i, label: 'Giorno di margine' },
  { test: /^relax$/i, label: 'Giorno rilassato' },
  { test: /^local$/i, label: 'Quartieri e vita locale' },
  { test: /^templi$/i, label: 'Templi e luoghi storici' },
  { test: /^mercati$/i, label: 'Mercati e cibo di strada' },
  { test: /^food(\s*shopping)?$/i, label: 'Cibo e passeggiate' },
  { test: /^beach$/i, label: 'Spiaggia' },
  { test: /^boat$/i, label: 'Uscita in barca' },
  { test: /^snorkel/i, label: 'Snorkel / mare' },
  { test: /^hop$/i, label: 'Spostamento tra isole' },
  { test: /^sud$/i, label: 'Verso il sud' },
  { test: /^scalo$/i, label: 'Scalo in hub' },
  { test: /^citta$/i, label: 'Tempo in città' },
  { test: /^volo(\s+internazionale)?$/i, label: 'Volo internazionale' },
  { test: /^check-?in/i, label: 'Check-in' },
  { test: /^old\s*city$/i, label: 'Città vecchia' },
  { test: /^doi\s*\/?\s*nature$/i, label: 'Natura nei dintorni' },
  { test: /^seconda\s*area$/i, label: 'Seconda area' },
  { test: /^verso\s*costa/i, label: 'Verso costa / isole' },
  { test: /^rientro$/i, label: 'Rientro' },
  { test: /^chiang\s*mai$/i, label: 'Chiang Mai' },
];

const TITLE_IT: Array<{ test: RegExp; title: (raw: string) => string }> = [
  { test: /^buffer$/i, title: () => 'Giorno libero' },
  { test: /^isole\s*day/i, title: () => 'Giornata alle isole' },
  { test: /^isola\s*[ab]$/i, title: (r) => ( /b/i.test(r) ? 'Seconda isola' : 'Prima isola' ) },
  { test: /^nord\s*free$/i, title: () => 'Nord a ritmo libero' },
  { test: /^nord\s*nature$/i, title: () => 'Natura al nord' },
  { test: /^hub\s*bangkok$/i, title: () => 'Scalo a Bangkok' },
  { test: /^trasf/i, title: () => 'Giorno di trasferimento' },
  { test: /^partenza$/i, title: () => 'Partenza' },
  { test: /^arrivo/i, title: () => 'Arrivo' },
];

export function transferLabelIt(transfer: string | null | undefined): string {
  if (!transfer || transfer === 'none') return '';
  return TRANSFER_IT[transfer] ?? 'spostamento';
}

export function humanizePoiName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Attività da definire in loco';
  for (const row of POI_LABEL_IT) {
    if (row.test.test(trimmed)) return row.label;
  }
  // Drop trailing English stubs like "opz"
  return trimmed.replace(/\s+opz\.?$/i, ' (opzionale)');
}

export function humanizeDayTitle(title: string): string {
  const trimmed = title.trim();
  for (const row of TITLE_IT) {
    if (row.test.test(trimmed)) return row.title(trimmed);
  }
  return trimmed;
}

export function humanizeArea(area: string): string {
  const a = area.trim();
  if (/^islands$/i.test(a)) return 'Isole';
  if (/^north$/i.test(a)) return 'Nord';
  return a;
}

export type GapItem = {
  kind: 'transfer' | 'activity' | 'season' | 'hub' | 'budget' | 'coverage';
  text: string;
};

export function warningCodeToGap(
  code: string,
  message: string,
  dayNumber?: number
): GapItem | null {
  switch (code) {
    case 'budget_orientative_only':
      return {
        kind: 'budget',
        text: 'Il budget è solo orientativo: non è un prezzo del viaggio né un fare verificato.',
      };
    case 'seasonality_hint_only':
      return {
        kind: 'season',
        text: 'Per alcune zone (es. isole) la stagione può influire sul mare: verifica le condizioni prima di partire.',
      };
    case 'unverified_transfer_timing': {
      const transferMatch = message.match(/«([^»]+)»/);
      const raw = transferMatch?.[1] ?? 'spostamento';
      const label = transferLabelIt(raw) || 'spostamento';
      return {
        kind: 'transfer',
        text: dayNumber
          ? `Giorno ${dayNumber}: ${label} — orari e costi da verificare (la distanza non dice il tempo di viaggio).`
          : message.includes('Hub')
            ? 'Hub aeroportuale fuori dai collegamenti curati: verifica i voli in autonomia.'
            : `${label} — orari e costi da verificare.`,
      };
    }
    case 'unverified_poi': {
      const poiMatch = message.match(/«([^»]+)»/);
      const poi = humanizePoiName(poiMatch?.[1] ?? 'attività');
      return {
        kind: 'activity',
        text: dayNumber
          ? `Giorno ${dayNumber}: «${poi}» — dettagli e orari da confermare in loco.`
          : `«${poi}» — dettagli da confermare in loco.`,
      };
    }
    case 'unsupported_destination':
      return { kind: 'coverage', text: message };
    case 'impossible_duration':
      return { kind: 'coverage', text: message };
    default:
      return { kind: 'coverage', text: message };
  }
}

/** Deduplicate gap texts; keep order: transfers, activities, season, budget, coverage. */
export function groupGaps(items: GapItem[]): {
  transfers: string[];
  activities: string[];
  other: string[];
} {
  const seen = new Set<string>();
  const transfers: string[] = [];
  const activities: string[] = [];
  const other: string[] = [];
  const order = ['transfer', 'activity', 'season', 'hub', 'budget', 'coverage'] as const;
  const sorted = [...items].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)
  );
  for (const item of sorted) {
    if (seen.has(item.text)) continue;
    seen.add(item.text);
    if (item.kind === 'transfer' || item.kind === 'hub') transfers.push(item.text);
    else if (item.kind === 'activity') activities.push(item.text);
    else other.push(item.text);
  }
  // Cap activity lines to avoid walls — summarize overflow
  if (activities.length > 4) {
    const head = activities.slice(0, 3);
    const n = activities.length - 3;
    return {
      transfers,
      activities: [...head, `Altre ${n} attività generiche da dettagliare sul posto.`],
      other,
    };
  }
  return { transfers, activities, other };
}

export function attributionClaimIt(claim: string): string {
  return claim
    .replace(/area-segment map anchor\.?/gi, 'punto mappa della zona (coordinate)')
    .replace(/map anchor\.?/gi, 'coordinate sulla mappa')
    .replace(/is an official TAT North destination\.?/gi, 'destinazione ufficiale TAT (Nord).')
    .replace(/destination; TAT tip best visit February–April\.?/gi, 'destinazione ufficiale; consiglio stagionale TAT: febbraio–aprile.')
    .replace(/is a listed Bangkok attraction \(TAT\)\.?/gi, 'attrazione elencata da TAT a Bangkok.')
    .replace(/listed by TAT; opening hours cited from TAT temples article\.?/gi, 'elencato da TAT (orari dall’articolo templi).')
    .replace(/Chiang Mai is an official TAT North destination\.?/gi, 'Chiang Mai è una destinazione ufficiale TAT.')
    .replace(/Ko Samui is an official TAT island destination\.?/gi, 'Ko Samui è una destinazione ufficiale TAT.')
    .replace(/Bangkok area-segment map anchor\.?/gi, 'coordinate zona Bangkok.')
    .replace(/Chiang Mai \/ North area-segment map anchor\.?/gi, 'coordinate zona Chiang Mai / Nord.')
    .replace(/Koh Samui map anchor\.?/gi, 'coordinate Koh Samui.')
    .replace(/Koh Tao map anchor\.?/gi, 'coordinate Koh Tao.');
}
