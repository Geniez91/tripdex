import type { TripdexApi } from "~/types/interfaces/api";
import type { Country } from "~/types/tripdex";
import type { ResidenceResponse } from "~/types/interfaces/community";

export function getVisitedCountries(api: TripdexApi): Promise<Country[]> {
  return api.get<Country[]>("/me/visited-countries");
}

export function getResidence(api: TripdexApi): Promise<ResidenceResponse> {
  return api.get<ResidenceResponse>("/me/residence");
}

export function updateResidence(
  api: TripdexApi,
  residenceCountryId: string | null,
): Promise<ResidenceResponse> {
  return api.put<ResidenceResponse>("/me/residence", {
    body: { residenceCountryId },
  });
}
