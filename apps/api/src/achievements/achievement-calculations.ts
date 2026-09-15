import type { AchievementCategory, AchievementDefinition } from './achievement-definitions.js';

export interface AchievementFacts {
  tripCount: number;
  visitedCountryCount: number;
  exploredContinentCodes: ReadonlySet<string>;
  totalRevisits: number;
  maxTripsInSameCountry: number;
  totalTravelDays: number;
  communityVoteCount: number;
  communityWinCount: number;
}

export interface AchievementProgress {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
}

function currentValue(definition: AchievementDefinition, facts: AchievementFacts): number {
  switch (definition.metric) {
    case 'TRIP_COUNT': return facts.tripCount;
    case 'VISITED_COUNTRY_COUNT': return facts.visitedCountryCount;
    case 'EXPLORED_CONTINENT_COUNT': return facts.exploredContinentCodes.size;
    case 'TOTAL_REVISITS': return facts.totalRevisits;
    case 'MAX_TRIPS_IN_SAME_COUNTRY': return facts.maxTripsInSameCountry;
    case 'TOTAL_TRAVEL_DAYS': return facts.totalTravelDays;
    case 'COMMUNITY_VOTE_COUNT': return facts.communityVoteCount;
    case 'COMMUNITY_WIN_COUNT': return facts.communityWinCount;
    case 'CONTINENT_VISITED':
      return definition.continentCode && facts.exploredContinentCodes.has(definition.continentCode) ? 1 : 0;
  }
}

export function calculateAchievements(
  definitions: readonly AchievementDefinition[],
  facts: AchievementFacts,
): AchievementProgress[] {
  return definitions.map((definition) => {
    const current = currentValue(definition, facts);
    return {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      current,
      target: definition.target,
      unlocked: current >= definition.target,
    };
  });
}
