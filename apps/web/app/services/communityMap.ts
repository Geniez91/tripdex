import type { CommunityCountryStatistics } from "~/types/interfaces/community";
import type {
  CommunityFlow,
  CommunityMapMode,
} from "~/types/interfaces/community-map";
import type { MapCountryAppearance } from "~/types/interfaces/map";

export function isCommunityYear(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 9998;
}

export function communityDescription(
  statistics: CommunityCountryStatistics,
  year: number,
): string {
  const parts = [
    `${statistics.travelers} ${statistics.travelers === 1 ? "voyageur" : "voyageurs"} en ${year}`,
  ];
  if (statistics.trending) parts.push("Tendance");
  if (statistics.travelersNow > 0)
    parts.push(`${statistics.travelersNow} en voyage actuellement`);
  return parts.join(" · ");
}

export function communityAppearances(
  countries: readonly CommunityCountryStatistics[],
  mode: CommunityMapMode,
  year: number,
): Record<string, MapCountryAppearance> {
  const maximum = Math.max(1, ...countries.map((item) => item.travelers));
  return Object.fromEntries(
    countries.map((item) => {
      const intensity =
        item.travelers > 0 ? 25 + 65 * Math.sqrt(item.travelers / maximum) : 0;
      const fill =
        mode === "trending"
          ? item.trending
            ? "rgb(var(--v-theme-sun))"
            : "rgb(var(--v-theme-map-land))"
          : mode === "flows"
            ? "rgb(var(--v-theme-map-land))"
            : `color-mix(in srgb, rgb(var(--v-theme-primary)) ${intensity}%, rgb(var(--v-theme-map-land)))`;
      return [
        item.country.iso3,
        { fill, description: communityDescription(item, year) },
      ];
    }),
  );
}

export function selectedFlows(
  country: CommunityCountryStatistics | null,
): CommunityFlow[] {
  return (
    country?.topOrigins.map((origin) => ({
      originIso3: origin.country.iso3,
      destinationIso3: country.country.iso3,
      travelers: origin.travelers,
    })) ?? []
  );
}
