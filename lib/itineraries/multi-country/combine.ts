/**
 * Combine curated masters into one multi-country itinerary.
 */

import { getMaster } from '@/lib/itineraries/masters/registry';
import { remapMasterToDays, type RemapVibe } from '@/lib/itineraries/masters/remap';
import type { ItineraryDay } from '@/lib/itineraries/types';
import { computeItineraryBudget } from '@/lib/itineraries/budget/compute';
import { findCuratedPair } from '@/lib/itineraries/multi-country/curated-pairs';
import { splitDaysAcrossCountries } from '@/lib/itineraries/multi-country/day-split';
import type {
  MultiCountryPlan,
  MultiCountryPlanFail,
} from '@/lib/itineraries/multi-country/types';
import { transferLabelIt } from '@/lib/itineraries/deterministic-planner/humanize';
import type { OrganizzaCompanyChoice } from '@/lib/itineraries/organizza-steps';

const VISA_URL = 'https://www.viaggiaresicuri.it/';
const VISA_NOTICE =
  'Controlla visti e documenti per ogni paese su Viaggiare Sicuri.';

export type CombineMultiCountryInput = {
  slugs: string[];
  tripDays: number;
  vibe?: string | null;
  company?: OrganizzaCompanyChoice | null;
};

function asVibe(vibe: string | null | undefined): RemapVibe | null {
  if (vibe === 'relax' || vibe === 'divertimento' || vibe === 'avventura') return vibe;
  return null;
}

function buildTransferDay(
  dayNumber: number,
  fromName: string,
  toName: string,
  mode: string,
  hours: number | null,
  notesIt: string
): ItineraryDay {
  const modeLabel = transferLabelIt(mode) || 'spostamento';
  const hoursIt =
    hours != null ? ` · circa ${hours.toString().replace('.', ',')} h` : '';
  const dayTransfer: ItineraryDay['transfer'] =
    mode === 'internal_flight' ||
    mode === 'ferry' ||
    mode === 'bus' ||
    mode === 'train' ||
    mode === 'none'
      ? mode
      : 'bus';
  return {
    day_number: dayNumber,
    title: `Trasferimento ${fromName} → ${toName}`,
    description: `${modeLabel}${hoursIt}. ${notesIt}`,
    area_segment: `${fromName} → ${toName}`,
    pois: [
      {
        name: 'Trasferimento inter-paese',
        priority: 'core',
        half_or_full: 'full',
      },
    ],
    transfer: dayTransfer,
    is_arrival: false,
    is_departure: false,
  };
}

function renumber(days: ItineraryDay[], startAt: number): ItineraryDay[] {
  return days.map((d, i) => ({ ...d, day_number: startAt + i }));
}

/**
 * Prefer curated canonical order; if user picked reverse of a pair, still use
 * the pair's travel order (arrive A / leave B) to match open-jaw hubs.
 */
export function resolveOrderedSlugs(
  slugA: string,
  slugB: string
): { pair: NonNullable<ReturnType<typeof findCuratedPair>>; ordered: [string, string] } | null {
  const pair = findCuratedPair(slugA, slugB);
  if (!pair) return null;
  return { pair, ordered: [...pair.slugs] as [string, string] };
}

export function combineMultiCountryPlan(
  input: CombineMultiCountryInput
): MultiCountryPlan | MultiCountryPlanFail {
  const unique = [...new Set(input.slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (unique.length !== 2) {
    return {
      ok: false,
      reason: 'unknown_pair',
      message:
        'Scegli una combinazione curata di due paesi. Combinazioni libere non sono ancora verificate.',
    };
  }

  const resolved = resolveOrderedSlugs(unique[0]!, unique[1]!);
  if (!resolved) {
    return {
      ok: false,
      reason: 'unknown_pair',
      message:
        'Combinazione non ancora verificata. Usa una delle coppie classiche proposte.',
    };
  }

  const { pair, ordered } = resolved;
  if (input.tripDays < 8) {
    return {
      ok: false,
      reason: 'too_short',
      message: 'Per due paesi servono almeno 8 giorni (incluso il trasferimento).',
    };
  }

  const sharesRaw = splitDaysAcrossCountries(ordered, input.tripDays, 1);
  if (!sharesRaw) {
    return {
      ok: false,
      reason: 'cannot_split',
      message:
        'Troppi pochi giorni per rispettare le notti minime di entrambi i paesi. Allunga il viaggio.',
    };
  }

  const vibe = asVibe(input.vibe);
  const gaps: string[] = [];
  const countryBudgets: MultiCountryPlan['countryBudgets'] = [];
  const stitched: ItineraryDay[] = [];
  let cursor = 1;

  for (let i = 0; i < ordered.length; i++) {
    const slug = ordered[i]!;
    const share = sharesRaw.find((s) => s.slug === slug)!;
    const master = getMaster(slug);
    if (!master) {
      return {
        ok: false,
        reason: 'missing_master',
        message: `Manca il master curato per ${slug}.`,
      };
    }

    const remapped = remapMasterToDays(master, share.days, vibe ?? master.styleDefault);
    const tagged = remapped.days.map((d) => ({
      ...d,
      area_segment: `${master.nameIt}: ${d.area_segment}`,
      title: d.title.startsWith(master.nameIt) ? d.title : `${master.nameIt} · ${d.title}`,
    }));
    stitched.push(...renumber(tagged, cursor));
    cursor += tagged.length;

    for (const g of remapped.gaps) gaps.push(`${master.nameIt}: ${g.text}`);

    const budget = computeItineraryBudget({
      destinationSlug: slug,
      tripDays: share.days,
      vibe: vibe ?? master.styleDefault,
      company: input.company ?? 'solo',
      days: remapped.days,
      // International flight handled once at multi level
      liveFlightEurPerPerson: 0,
    });
    if (budget) {
      // Zero out flights line for country subtotal (open-jaw is separate)
      const lines = budget.lines.map((l) =>
        l.category === 'flights'
          ? { ...l, amountEur: 0, labelIt: 'Volo internazionale (nel totale multi-paese)', kind: 'estimate' as const }
          : l
      );
      const known = lines
        .map((l) => l.amountEur)
        .filter((n): n is number => n != null);
      const totalEur = known.reduce((a, b) => a + b, 0);
      countryBudgets.push({
        slug,
        nameIt: master.nameIt,
        breakdown: {
          ...budget,
          lines,
          totalEur,
          perPersonEur: Math.round(totalEur / budget.travelers),
          byCategory: {
            ...budget.byCategory,
            flights: {
              ...budget.byCategory.flights,
              amountEur: 0,
              kind: 'estimate',
            },
          },
        },
      });
    }

    if (i < ordered.length - 1) {
      const next = getMaster(ordered[i + 1]!)!;
      const t = pair.transfer;
      const transferDay = buildTransferDay(
        cursor,
        master.nameIt,
        next.nameIt,
        t.mode,
        t.durationHours,
        t.notesIt
      );
      stitched.push(transferDay);
      cursor += 1;
    }
  }

  // Align length: trim/pad to tripDays if remapper drifted
  while (stitched.length > input.tripDays) stitched.pop();
  while (stitched.length < input.tripDays) {
    const last = stitched[stitched.length - 1]!;
    stitched.push({
      ...last,
      day_number: stitched.length + 1,
      title: `${last.area_segment}: giorno buffer`,
      description: 'Giorno flessibile — da verificare in loco.',
      is_arrival: false,
      is_departure: stitched.length + 1 === input.tripDays,
      transfer: 'none',
      pois: [],
    });
  }
  stitched.forEach((d, i) => {
    d.day_number = i + 1;
    d.is_departure = i === stitched.length - 1;
  });

  const transferNeedsCheck = !pair.transfer.verified || pair.transfer.costEurPerPerson == null;
  if (transferNeedsCheck) {
    gaps.push('Trasferimento tra paesi: da verificare (orari/costi).');
  }

  const travelers = countryBudgets[0]?.breakdown.travelers ?? 1;
  const countrySum = countryBudgets.reduce(
    (s, c) => s + (c.breakdown.perPersonEur ?? 0),
    0
  );
  const transferPerPerson = pair.transfer.costEurPerPerson;
  const flightPerPerson = pair.openJawFlightEur.mid;
  const totalPerPersonEur = Math.round(
    countrySum + (transferPerPerson ?? 0) + flightPerPerson
  );

  return {
    ok: true,
    pairId: pair.id,
    orderedSlugs: ordered,
    titleIt: pair.titleIt,
    tripDays: input.tripDays,
    shares: sharesRaw.map((s) => ({
      slug: s.slug,
      nameIt: s.nameIt,
      days: s.days,
      weight: s.weight,
    })),
    transfer: pair.transfer,
    transferNeedsCheck,
    arrivalIata: pair.arrivalHubIata,
    departureIata: pair.departureHubIata,
    days: stitched,
    countryBudgets,
    transferCostEur:
      transferPerPerson != null ? Math.round(transferPerPerson * travelers) : null,
    transferCostKind: transferPerPerson != null ? 'estimate' : 'unknown',
    openJawFlightEurPerPerson: flightPerPerson,
    openJawFlightKind: 'estimate',
    openJawFlightDetailIt: `Open-jaw ${pair.arrivalHubIata}→…→${pair.departureHubIata} · fascia ${pair.openJawFlightEur.low}–${pair.openJawFlightEur.high} € · usato ${flightPerPerson} €`,
    totalPerPersonEur,
    visaNoticeIt: VISA_NOTICE,
    visaUrl: VISA_URL,
    gaps,
  };
}

export function isCuratedMultiSelection(slugs: string[] | null | undefined): boolean {
  if (!slugs || slugs.length !== 2) return false;
  return Boolean(findCuratedPair(slugs[0]!, slugs[1]!));
}
