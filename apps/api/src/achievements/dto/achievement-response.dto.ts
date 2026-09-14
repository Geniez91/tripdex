import type { AchievementCategory } from '../achievement-definitions.js';

export interface AchievementResponseDto {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
}

export interface AchievementsResponseDto {
  achievements: AchievementResponseDto[];
}
