export type AchievementCategory =
  | "JOURNAL"
  | "EXPLORATION"
  | "CONTINENTS"
  | "REVISITS"
  | "TRAVEL_TIME"
  | "COMMUNITY";

export type AchievementRarity =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "VERY_RARE"
  | "LEGENDARY";

export interface PersonalAchievement {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  unlocked: boolean;
  current: number;
  target: number;
  community: {
    percentage: number;
    rarity: AchievementRarity | null;
  };
}

export interface PersonalAchievementsResponse {
  achievements: PersonalAchievement[];
}
