import type { TripdexApi } from "~/types/interfaces/api";
import type { TripDexProfile } from "~/types/auth";

export function getCurrentProfile(api: TripdexApi): Promise<TripDexProfile> {
  return api.get<TripDexProfile>("/me");
}
