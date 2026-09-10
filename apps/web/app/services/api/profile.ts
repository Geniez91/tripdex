import type { TripdexApi } from "~/types/interfaces/api";
import type { Country } from "~/types/tripdex";

export function getVisitedCountries(api: TripdexApi): Promise<Country[]> {
  return api.get<Country[]>("/me/visited-countries");
}
