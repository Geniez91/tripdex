import type { AchievementCategory } from '../achievement-definitions.js';
import type { AchievementRarity } from '../achievement-community-stats.js';

export interface AchievementCommunityResponseDto {
  percentage: number;
  rarity: AchievementRarity | null;
}

export interface AchievementResponseDto {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
  community: AchievementCommunityResponseDto;
}

export interface AchievementsResponseDto {
  achievements: AchievementResponseDto[];
}
