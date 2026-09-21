import type { TCityIdsByCountryId } from "~/types/interfaces/trip-city-selection";

export function reconcileTripCitySelections(
  countryIds: string[],
  cityIdsByCountryId: TCityIdsByCountryId,
): TCityIdsByCountryId {
  return Object.fromEntries(
    Object.entries(cityIdsByCountryId).filter(([countryId]) =>
      countryIds.includes(countryId),
    ),
  );
}

export function flattenTripCitySelections(
  cityIdsByCountryId: TCityIdsByCountryId,
): string[] {
  return Object.values(cityIdsByCountryId).flat();
}
