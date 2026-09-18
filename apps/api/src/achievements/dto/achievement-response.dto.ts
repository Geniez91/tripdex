import type { TAchievementCategory } from '../achievement-definitions.js';
import type { TAchievementRarity } from '../achievement.types.js';

export interface IAchievementCommunityResponseDto {
  percentage: number;
  rarity: TAchievementRarity | null;
}

export interface IAchievementResponseDto {
  code: string;
  name: string;
  description: string;
  category: TAchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
  community: IAchievementCommunityResponseDto;
}

export interface IAchievementsResponseDto {
  achievements: IAchievementResponseDto[];
}
