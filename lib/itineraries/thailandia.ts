import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';

function day(
  day_number: number,
  title: string,
  area_segment: string,
  description: string,
  pois: ItineraryDay['pois'],
  extra: Partial<ItineraryDay> = {}
): ItineraryDay {
  return {
    day_number,
    title,
    description,
    area_segment,
    pois,
    transfer: extra.transfer ?? 'none',
    is_arrival: extra.is_arrival ?? false,
    is_departure: extra.is_departure ?? false,
  };
}

const TH10_DAYS: ItineraryDay[] = [
  day(1, 'Arrivo Bangkok', 'Bangkok', 'Check-in soft. Niente pieno se il volo è lungo.', [{ name: 'Check-in soft', priority: 'core', half_or_full: 'half' }], { is_arrival: true }),
  day(2, 'Bangkok templi', 'Bangkok', 'Grand Palace area e Wat Arun, ritmo urbano.', [{ name: 'Grand Palace area', priority: 'core', half_or_full: 'full' }, { name: 'Wat Arun', priority: 'core', half_or_full: 'half' }]),
  day(3, 'Bangkok mercati', 'Bangkok', 'Mercati e cibo di strada. Serata libera.', [{ name: 'Mercati cibo', priority: 'core', half_or_full: 'full' }]),
  day(4, 'Trasferimento isole', 'Islands', 'Volo interno verso costa/isole. Arrivo e check-in.', [{ name: 'Verso costa/isole', priority: 'core', half_or_full: 'full' }], { transfer: 'internal_flight' }),
  day(5, 'Isole day 1', 'Islands', 'Spiaggia e primo bagno. Ritmo basso.', [{ name: 'Spiaggia', priority: 'core', half_or_full: 'full' }]),
  day(6, 'Isole day 2', 'Islands', 'Uscita in barca / snorkel (attività a pagamento).', [{ name: 'Snorkel boat', priority: 'core', half_or_full: 'full' }]),
  day(7, 'Isole day 3', 'Islands', 'Giorno libero in zona. Niente spostamenti lunghi.', [{ name: 'Free', priority: 'optional', half_or_full: 'full' }]),
  day(8, 'Isole day 4', 'Islands', 'Buffer spiaggia prima del rientro.', [{ name: 'Buffer', priority: 'optional', half_or_full: 'full' }]),
  day(9, 'Rientro buffer', 'Bangkok', 'Volo interno e serata a Bangkok.', [{ name: 'Rientro', priority: 'core', half_or_full: 'half' }], { transfer: 'internal_flight' }),
  day(10, 'Partenza', 'Bangkok', 'Volo internazionale. Mattina libera se l’orario lo permette.', [{ name: 'Volo internazionale', priority: 'core', half_or_full: 'half' }], { is_departure: true }),
];

const TH14_DAYS: ItineraryDay[] = [
  day(1, 'Arrivo Bangkok', 'Bangkok', 'Arrivo soft. Check-in e primo giro breve.', [{ name: 'Soft', priority: 'core', half_or_full: 'half' }], { is_arrival: true }),
  day(2, 'Bangkok core', 'Bangkok', 'Templi e asse classico della città.', [{ name: 'Templi', priority: 'core', half_or_full: 'full' }]),
  day(3, 'Bangkok local', 'Bangkok', 'Mercati e quartieri di cibo.', [{ name: 'Mercati', priority: 'core', half_or_full: 'full' }]),
  day(4, 'Day trip cultura', 'Bangkok', 'Ayutthaya opzionale (biglietto individuale).', [{ name: 'Ayutthaya opz', priority: 'optional', half_or_full: 'full' }]),
  day(5, 'Trasf isole', 'Islands', 'Spostamento a sud.', [{ name: 'Sud', priority: 'core', half_or_full: 'full' }], { transfer: 'internal_flight' }),
  day(6, 'Isola A', 'Islands', 'Prima base spiaggia.', [{ name: 'Beach', priority: 'core', half_or_full: 'full' }]),
  day(7, 'Isola A', 'Islands', 'Uscita in barca.', [{ name: 'Boat', priority: 'core', half_or_full: 'full' }]),
  day(8, 'Isola B', 'Islands', 'Seconda area in traghetto.', [{ name: 'Seconda area', priority: 'core', half_or_full: 'full' }], { transfer: 'ferry' }),
  day(9, 'Isola B', 'Islands', 'Spiaggia e ritmi lenti.', [{ name: 'Beach', priority: 'core', half_or_full: 'full' }]),
  day(10, 'Isola B', 'Islands', 'Giorno libero.', [{ name: 'Free', priority: 'optional', half_or_full: 'full' }]),
  day(11, 'Buffer isole', 'Islands', 'Relax prima del rientro.', [{ name: 'Relax', priority: 'optional', half_or_full: 'full' }]),
  day(12, 'Rientro', 'Bangkok', 'Buffer città.', [{ name: 'Buffer', priority: 'core', half_or_full: 'half' }], { transfer: 'internal_flight' }),
  day(13, 'Bangkok buffer', 'Bangkok', 'Cibo e shopping leggero.', [{ name: 'Food shopping', priority: 'optional', half_or_full: 'full' }]),
  day(14, 'Partenza', 'Bangkok', 'Volo di rientro.', [{ name: 'Volo', priority: 'core', half_or_full: 'half' }], { is_departure: true }),
];

const TH21_DAYS: ItineraryDay[] = [
  day(1, 'Arrivo Bangkok', 'Bangkok', 'Arrivo soft.', [{ name: 'Soft', priority: 'core', half_or_full: 'half' }], { is_arrival: true }),
  day(2, 'Bangkok', 'Bangkok', 'Templi e primo asse urbano.', [{ name: 'Templi', priority: 'core', half_or_full: 'full' }]),
  day(3, 'Bangkok', 'Bangkok', 'Quartieri locali.', [{ name: 'Local', priority: 'core', half_or_full: 'full' }]),
  day(4, 'Trasf Nord', 'North', 'Volo verso Chiang Mai.', [{ name: 'Chiang Mai', priority: 'core', half_or_full: 'full' }], { transfer: 'internal_flight' }),
  day(5, 'Chiang Mai', 'North', 'Città vecchia e templi.', [{ name: 'Old city', priority: 'core', half_or_full: 'full' }]),
  day(6, 'Nord nature', 'North', 'Doi / natura intorno.', [{ name: 'Doi / nature', priority: 'core', half_or_full: 'full' }]),
  day(7, 'Nord free', 'North', 'Mercati e ritmo libero.', [{ name: 'Mercati', priority: 'optional', half_or_full: 'full' }]),
  day(8, 'Hub Bangkok', 'Bangkok', 'Scalo verso il sud.', [{ name: 'Scalo', priority: 'core', half_or_full: 'half' }], { transfer: 'internal_flight' }),
  day(9, 'Trasf isole', 'Islands', 'Arrivo al sud.', [{ name: 'Sud', priority: 'core', half_or_full: 'full' }], { transfer: 'internal_flight' }),
  day(10, 'Isole', 'Islands', 'Prima spiaggia.', [{ name: 'Beach', priority: 'core', half_or_full: 'full' }]),
  day(11, 'Isole', 'Islands', 'Uscita in barca.', [{ name: 'Boat', priority: 'core', half_or_full: 'full' }]),
  day(12, 'Isole', 'Islands', 'Giorno libero.', [{ name: 'Free', priority: 'optional', half_or_full: 'full' }]),
  day(13, 'Seconda isola', 'Islands', 'Island hop in traghetto.', [{ name: 'Hop', priority: 'core', half_or_full: 'full' }], { transfer: 'ferry' }),
  day(14, 'Seconda isola', 'Islands', 'Spiaggia.', [{ name: 'Beach', priority: 'core', half_or_full: 'full' }]),
  day(15, 'Seconda isola', 'Islands', 'Libero.', [{ name: 'Free', priority: 'optional', half_or_full: 'full' }]),
  day(16, 'Buffer', 'Islands', 'Relax.', [{ name: 'Relax', priority: 'optional', half_or_full: 'full' }]),
  day(17, 'Buffer', 'Islands', 'Relax.', [{ name: 'Relax', priority: 'optional', half_or_full: 'full' }]),
  day(18, 'Rientro', 'Bangkok', 'Rientro in città.', [{ name: 'Citta', priority: 'core', half_or_full: 'half' }], { transfer: 'internal_flight' }),
  day(19, 'Bangkok', 'Bangkok', 'Cibo e quartieri.', [{ name: 'Food', priority: 'optional', half_or_full: 'full' }]),
  day(20, 'Buffer', 'Bangkok', 'Giorno libero prima del volo.', [{ name: 'Libero', priority: 'optional', half_or_full: 'full' }]),
  day(21, 'Partenza', 'Bangkok', 'Volo internazionale.', [{ name: 'Volo', priority: 'core', half_or_full: 'half' }], { is_departure: true }),
];

function thailandia(duration: 10 | 14 | 21, days: ItineraryDay[], extras: Pick<ItineraryTemplate, 'summary' | 'budget_orientative_eur' | 'hotels' | 'paid_activities' | 'logistics_notes' | 'style'>): ItineraryTemplate {
  return {
    template_id: `thailandia-${duration}d`,
    destination_slug: 'thailandia',
    destination_name: 'Thailandia',
    duration_days: duration,
    title: `Thailandia ${duration} giorni`,
    days,
    status: 'published',
    ...extras,
  };
}

export const THAILANDIA_TEMPLATES: ItineraryTemplate[] = [
  thailandia(10, TH10_DAYS, {
    style: 'relax',
    summary: 'Bangkok e isole. Ritmo alto in città, poi spiaggia. Un solo trasferimento interno.',
    budget_orientative_eur: {
      flights_hint: 650,
      hotel_hint: 400,
      activities_hint: 80,
      food_hint: 200,
      total_hint: 1330,
    },
    hotels: [
      { area_segment: 'Bangkok', name_or_zone: 'Riverside / Khao San area', notes: '2–3 notti. Ognuno prenota la propria camera.' },
      { area_segment: 'Islands', name_or_zone: 'Isola sud (Koh Samui / Koh Tao zona)', notes: 'Stesso hotel suggerito, camera individuale.' },
    ],
    paid_activities: [
      { title: 'Snorkel in barca', day_number: 6, slot: 'morning', hint: 'Stesso slot del template. Biglietto individuale.' },
    ],
    logistics_notes: 'Un volo interno andata e uno al rientro. Niente island-hop aggressivo in 10 giorni.',
  }),
  thailandia(14, TH14_DAYS, {
    style: 'relax',
    summary: 'Bangkok, day trip culturale, poi due aree isole con un traghetto. Buffer prima del volo.',
    budget_orientative_eur: {
      flights_hint: 750,
      hotel_hint: 550,
      activities_hint: 120,
      food_hint: 280,
      total_hint: 1700,
    },
    hotels: [
      { area_segment: 'Bangkok', name_or_zone: 'Centro / Riverside', notes: 'Arrivo e buffer rientro.' },
      { area_segment: 'Islands', name_or_zone: 'Isola A poi Isola B', notes: 'Due basi. Camera propria, stesso hotel di zona.' },
    ],
    paid_activities: [
      { title: 'Ayutthaya day trip', day_number: 4, slot: 'morning', hint: 'Opzionale. Stesso slot se il gruppo lo prende.' },
      { title: 'Boat / snorkel', day_number: 7, slot: 'morning', hint: 'Biglietto individuale.' },
    ],
    logistics_notes: 'Un volo interno + un ferry. Massimo due spostamenti lunghi.',
  }),
  thailandia(21, TH21_DAYS, {
    style: 'avventura',
    summary: 'Nord (Chiang Mai) e isole. Tre aree, più buffer. Pensato per chi ha i giorni.',
    budget_orientative_eur: {
      flights_hint: 850,
      hotel_hint: 800,
      activities_hint: 150,
      food_hint: 400,
      total_hint: 2200,
    },
    hotels: [
      { area_segment: 'Bangkok', name_or_zone: 'Hub urbano', notes: 'Arrivo, scalo e rientro.' },
      { area_segment: 'North', name_or_zone: 'Chiang Mai old city', notes: '3 notti circa.' },
      { area_segment: 'Islands', name_or_zone: 'Due isole sud', notes: 'Long stay + hop.' },
    ],
    paid_activities: [
      { title: 'Boat / snorkel', day_number: 11, slot: 'morning', hint: 'Slot isole. Ticket individuale.' },
    ],
    logistics_notes: 'Tre voli interni. Non comprimere il nord sotto i 3 giorni.',
  }),
];
