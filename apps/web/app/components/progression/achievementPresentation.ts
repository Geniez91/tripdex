import type {
  AchievementCategory,
  AchievementRarity,
  PersonalAchievement,
} from "~/types/interfaces/achievements";

export const achievementCategoryLabels: Record<AchievementCategory, string> = {
  JOURNAL: "Journal",
  EXPLORATION: "Exploration",
  CONTINENTS: "Continents",
  REVISITS: "Revisites",
  TRAVEL_TIME: "Temps de voyage",
  COMMUNITY: "Communauté",
};

export const achievementRarityLabels: Record<AchievementRarity, string> = {
  COMMON: "Commun",
  UNCOMMON: "Peu commun",
  RARE: "Rare",
  VERY_RARE: "Très rare",
  LEGENDARY: "Légendaire",
};

export interface AchievementTheme {
  accent: string;
  tint: string;
  ink: string;
}

export type AchievementEmblem =
  | { type: "mdi"; icon: string }
  | { type: "asset"; src: string; alt: string };

const travelThemes = {
  ocean: { accent: "#397F83", tint: "#BFE3E6", ink: "#205C68" },
  sun: { accent: "#C58A28", tint: "#F6D892", ink: "#8B5A10" },
  terracotta: { accent: "#C5813D", tint: "#EDC69D", ink: "#8C5122" },
  coral: { accent: "#C87868", tint: "#F2B7AC", ink: "#91483B" },
  violet: { accent: "#8B70A8", tint: "#D7C5E5", ink: "#604878" },
  forest: { accent: "#6E916B", tint: "#C3DDBD", ink: "#466C48" },
  glacier: { accent: "#6E99B2", tint: "#C7E2EE", ink: "#466D83" },
} satisfies Record<string, AchievementTheme>;

// Presentation only: colours identify travel memories; achievement progress and
// rarity remain entirely API-driven.
const achievementThemes: Record<string, AchievementTheme> = {
  PREMIER_VOYAGE: travelThemes.ocean,
  PREMIER_PAS: travelThemes.ocean,
  GLOBE_TROTTER: travelThemes.sun,
  GRAND_EXPLORATEUR: travelThemes.terracotta,
  PREMIERS_PAS_EUROPE: travelThemes.ocean,
  PREMIERS_PAS_AFRIQUE: travelThemes.terracotta,
  PREMIERS_PAS_ASIE: travelThemes.coral,
  PREMIERS_PAS_AMERIQUE_NORD: travelThemes.violet,
  PREMIERS_PAS_AMERIQUE_SUD: travelThemes.forest,
  PREMIERS_PAS_OCEANIE: travelThemes.glacier,
  PREMIERS_PAS_ANTARCTIQUE: travelThemes.glacier,
  NOUVEAU_CONTINENT: travelThemes.forest,
  TROIS_HORIZONS: travelThemes.violet,
  DEJA_VU: travelThemes.coral,
  CANT_STAY_AWAY: travelThemes.terracotta,
  TRENTE_JOURS_AILLEURS: travelThemes.sun,
  CENT_JOURS_SUR_LA_ROUTE: travelThemes.terracotta,
  LA_VOIX_DU_VOYAGEUR: travelThemes.ocean,
  PHOTOGRAPHE_TRIPDEX: travelThemes.coral,
};

const achievementIcons: Record<string, string> = {
  PREMIER_VOYAGE: "mdi-bag-suitcase-outline",
  PREMIER_PAS: "mdi-map-marker-outline",
  GLOBE_TROTTER: "mdi-earth",
  GRAND_EXPLORATEUR: "mdi-compass-outline",
  PREMIERS_PAS_EUROPE: "mdi-map-marker-radius-outline",
  PREMIERS_PAS_AFRIQUE: "mdi-map-marker-radius-outline",
  PREMIERS_PAS_ASIE: "mdi-map-marker-radius-outline",
  PREMIERS_PAS_AMERIQUE_NORD: "mdi-map-marker-radius-outline",
  PREMIERS_PAS_AMERIQUE_SUD: "mdi-map-marker-radius-outline",
  PREMIERS_PAS_OCEANIE: "mdi-map-marker-radius-outline",
  PREMIERS_PAS_ANTARCTIQUE: "mdi-map-marker-radius-outline",
  NOUVEAU_CONTINENT: "mdi-earth-plus",
  TROIS_HORIZONS: "mdi-compass-rose",
  DEJA_VU: "mdi-history",
  CANT_STAY_AWAY: "mdi-repeat",
  TRENTE_JOURS_AILLEURS: "mdi-calendar-month-outline",
  CENT_JOURS_SUR_LA_ROUTE: "mdi-calendar-range-outline",
  LA_VOIX_DU_VOYAGEUR: "mdi-account-voice",
  PHOTOGRAPHE_TRIPDEX: "mdi-camera-outline",
};

const progressUnits: Record<string, string> = {
  GLOBE_TROTTER: "pays",
  GRAND_EXPLORATEUR: "pays",
  NOUVEAU_CONTINENT: "continents",
  TROIS_HORIZONS: "continents",
  CANT_STAY_AWAY: "voyages",
  TRENTE_JOURS_AILLEURS: "jours",
  CENT_JOURS_SUR_LA_ROUTE: "jours",
};

const percentageFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function achievementIcon(achievement: PersonalAchievement): string {
  return achievementIcons[achievement.code] ?? "mdi-medal-outline";
}

// Kept as a dedicated presentation seam: a future SVG/Flat Icon can return an
// `asset` here without changing the gallery card markup or its layout.
export function achievementEmblem(achievement: PersonalAchievement): AchievementEmblem {
  return { type: "mdi", icon: achievementIcon(achievement) };
}

export function achievementTheme(achievement: PersonalAchievement): AchievementTheme {
  return achievementThemes[achievement.code] ?? travelThemes.ocean;
}

// The API catalogue order remains authoritative. This only brings collected
// memories to the front of their existing category for display.
export function sortAchievementsUnlockedFirst(
  achievements: readonly PersonalAchievement[],
): PersonalAchievement[] {
  return achievements
    .map((achievement, index) => ({ achievement, index }))
    .sort(
      (left, right) =>
        Number(right.achievement.unlocked) - Number(left.achievement.unlocked) ||
        left.index - right.index,
    )
    .map(({ achievement }) => achievement);
}

export function progressLabel(achievement: PersonalAchievement): string | null {
  if (achievement.unlocked || achievement.target <= 1) return null;
  const unit = progressUnits[achievement.code] ?? "étapes";
  return `${achievement.current} / ${achievement.target} ${unit}`;
}

export function visualProgress(achievement: PersonalAchievement): number {
  if (achievement.target <= 0) return 0;
  return Math.min(Math.max(achievement.current / achievement.target, 0), 1);
}

export function communityLabel(achievement: PersonalAchievement): string {
  if (achievement.community.percentage === 0)
    return "Aucun voyageur ne l'a encore débloqué";
  return `Obtenu par ${communityPercentage(achievement)} des voyageurs`;
}

export function communityPercentage(achievement: PersonalAchievement): string {
  return `${percentageFormatter.format(achievement.community.percentage)} %`;
}
