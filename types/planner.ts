/** Profilo viaggiatore — raccolto prima del composer, riusato dall'LLM. */
export type PlannerTravelStyle = 'adventure' | 'relax' | 'culture' | 'food' | 'mix';
export type PlannerPace = 'slow' | 'balanced' | 'intense';
export type PlannerBudget = 'budget' | 'mid' | 'premium';
export type PlannerAccommodation = 'hostel' | 'hotel' | 'apartment' | 'any';
export type PlannerExperience = 'first_time' | 'been_before' | 'expert';
export type PlannerTravelDistance = 'near' | 'medium' | 'far';

export type PlannerProfile = {
  travelStyle: PlannerTravelStyle;
  pace: PlannerPace;
  budgetLevel: PlannerBudget;
  interests: string[];
  accommodationPref: PlannerAccommodation;
  experienceLevel: PlannerExperience;
  /** Preferenza distanza viaggio (intake rapido composer) */
  travelDistance?: PlannerTravelDistance;
  dietaryNotes?: string;
  mobilityNotes?: string;
  freeNotes?: string;
};

export const EMPTY_PLANNER_PROFILE: PlannerProfile = {
  travelStyle: 'mix',
  pace: 'balanced',
  budgetLevel: 'mid',
  interests: [],
  accommodationPref: 'any',
  experienceLevel: 'first_time',
};