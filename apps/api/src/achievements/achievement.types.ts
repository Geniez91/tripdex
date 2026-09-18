import type { TAchievementCategory } from './achievement-definitions.js';

export interface IAchievementFacts {
  tripCount: number;
  visitedCountryCount: number;
  exploredContinentCodes: ReadonlySet<string>;
  totalRevisits: number;
  maxTripsInSameCountry: number;
  totalTravelDays: number;
  communityVoteCount: number;
  communityWinCount: number;
}

export interface IAchievementProgress {
  code: string;
  name: string;
  description: string;
  category: TAchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
}

export interface ICommunityAchievementCounts {
  voteCount: number;
  winCount: number;
}

export interface ICommunityAchievementStats {
  eligibleUserCount: number;
  holderCounts: Record<string, number>;
}

export type TAchievementRarity =
  (typeof import('./achievement-community-stats.js').achievementRarities)[number];

export interface IAchievementCommunityStat {
  percentage: number;
  rarity: TAchievementRarity | null;
}
