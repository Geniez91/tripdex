import type { TripdexApi } from "~/types/interfaces/api";
import type { PersonalAchievementsResponse } from "~/types/interfaces/achievements";

export function getPersonalAchievements(
  api: TripdexApi,
): Promise<PersonalAchievementsResponse> {
  return api.get<PersonalAchievementsResponse>("/me/achievements");
}
