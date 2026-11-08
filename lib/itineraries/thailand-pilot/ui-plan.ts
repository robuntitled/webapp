import {
  planThailandDeterministic,
  type ThailandPlanResult,
} from '@/lib/itineraries/thailand-pilot/plan';
import type { TripVibe } from '@/lib/itineraries/fit';

function asTripVibe(vibe: string | null | undefined): TripVibe | null {
  if (vibe === 'relax' || vibe === 'divertimento' || vibe === 'avventura') return vibe;
  return null;
}

/** Shared entry for Organizza UI + tests (no React). */
export function buildThailandPilotPlan(props: {
  destinationSlug: string;
  tripDays: number;
  vibe?: string | null;
  travelMonth?: number | null;
  arrivalIata?: string | null;
  departureIata?: string | null;
}): ThailandPlanResult {
  return planThailandDeterministic({
    destinationSlug: props.destinationSlug,
    tripDays: props.tripDays,
    vibe: asTripVibe(props.vibe),
    travelMonth: props.travelMonth,
    arrivalIata: props.arrivalIata,
    departureIata: props.departureIata,
  });
}
