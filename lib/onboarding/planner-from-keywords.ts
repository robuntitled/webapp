import { KEYWORD_BY_ID } from '@/lib/onboarding/keywords';
import { EMPTY_PLANNER_PROFILE, type PlannerProfile, type PlannerTravelStyle } from '@/types/planner';

const STYLE_FROM_KEYWORD: Record<string, PlannerTravelStyle> = {
  adventure: 'adventure',
  outdoor: 'adventure',
  backpacking: 'adventure',
  wellness_trip: 'relax',
  wellness: 'relax',
  slow_travel: 'relax',
  beach: 'relax',
  cultural_tour: 'culture',
  culture: 'culture',
  city_break: 'culture',
  food_trip: 'food',
  food_wine: 'food',
};

export function plannerFromKeywordIds(keywordIds: string[]): PlannerProfile {
  const styles = keywordIds
    .map((id) => STYLE_FROM_KEYWORD[id])
    .filter((s): s is PlannerTravelStyle => Boolean(s));

  const travelStyle: PlannerTravelStyle =
    styles.length === 0
      ? 'mix'
      : styles.every((s) => s === styles[0])
        ? styles[0]
        : 'mix';

  const interests = keywordIds
    .map((id) => KEYWORD_BY_ID.get(id)?.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, 12);

  return {
    ...EMPTY_PLANNER_PROFILE,
    travelStyle,
    interests,
  };
}
