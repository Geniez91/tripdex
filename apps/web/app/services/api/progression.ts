import type { TripdexApi } from "~/types/interfaces/api";
import type { PersonalProgression } from "~/types/interfaces/progression";

export function getPersonalProgression(
  api: TripdexApi,
): Promise<PersonalProgression> {
  return api.get<PersonalProgression>("/me/progression");
}
