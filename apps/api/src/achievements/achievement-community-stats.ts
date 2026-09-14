import type { AchievementProgress } from './achievement-calculations.js';

export const achievementRarities = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'VERY_RARE',
  'LEGENDARY',
] as const;

export type AchievementRarity = (typeof achievementRarities)[number];

export interface AchievementCommunityStat {
  percentage: number;
  rarity: AchievementRarity | null;
}

export function achievementPercentage(holderCount: number, eligibleUserCount: number): number {
  if (eligibleUserCount === 0) return 0;
  return (holderCount / eligibleUserCount) * 100;
}

export function displayPercentage(percentage: number): number {
  return Math.round(percentage * 10) / 10;
}

export function achievementRarity(
  percentage: number,
  eligibleUserCount: number,
): AchievementRarity | null {
  if (eligibleUserCount === 0) return null;
  if (percentage >= 50) return 'COMMON';
  if (percentage >= 20) return 'UNCOMMON';
  if (percentage >= 5) return 'RARE';
  if (percentage >= 1) return 'VERY_RARE';
  return 'LEGENDARY';
}

export function communityStat(
  holderCount: number,
  eligibleUserCount: number,
): AchievementCommunityStat {
  const percentage = achievementPercentage(holderCount, eligibleUserCount);
  return {
    percentage: displayPercentage(percentage),
    rarity: achievementRarity(percentage, eligibleUserCount),
  };
}

export function withCommunityStats(
  achievements: AchievementProgress[],
  holderCounts: Readonly<Record<string, number>>,
  eligibleUserCount: number,
) {
  return achievements.map((achievement) => ({
    ...achievement,
    community: communityStat(holderCounts[achievement.code] ?? 0, eligibleUserCount),
  }));
}
