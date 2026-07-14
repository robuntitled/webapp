import type { PlannerProfile } from '@/types/planner';
import {
  ACCOMMODATION_OPTIONS,
  BUDGET_OPTIONS,
  EXPERIENCE_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
} from '@/lib/composer/planner-options';

function labelFor<T extends { id: string; label: string }>(
  options: T[],
  id: string
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/** Blocco compatto per prompt LLM — riusa il profilo planner salvato su Supabase. */
export function buildPlannerPromptBlock(profile: PlannerProfile | undefined): string | null {
  if (!profile) return null;

  const interests =
    profile.interests.length > 0
      ? profile.interests
          .map((id) => {
            const opt = INTEREST_OPTIONS.find((o) => o.id === id);
            return opt ? `${opt.label}` : id;
          })
          .join(', ')
      : 'non specificati';

  const lines = [
    `stile=${labelFor(TRAVEL_STYLE_OPTIONS, profile.travelStyle)}`,
    `ritmo=${labelFor(PACE_OPTIONS, profile.pace)}`,
    `budget=${labelFor(BUDGET_OPTIONS, profile.budgetLevel)}`,
    `interessi=${interests}`,
    `alloggio=${labelFor(ACCOMMODATION_OPTIONS, profile.accommodationPref)}`,
    `esperienza_dest=${labelFor(EXPERIENCE_OPTIONS, profile.experienceLevel)}`,
    profile.dietaryNotes ? `dieta=${profile.dietaryNotes}` : null,
    profile.mobilityNotes ? `mobilita=${profile.mobilityNotes}` : null,
    profile.freeNotes ? `note=${profile.freeNotes}` : null,
  ].filter(Boolean);

  return lines.join(' | ');
}