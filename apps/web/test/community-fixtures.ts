import { readFileSync } from "node:fs";
import type { Country } from "../app/types/tripdex";
import type { CommunityStatistics } from "../app/types/interfaces/community";

export const communityCountries: Country[] = JSON.parse(
  readFileSync(
    new URL("../../api/src/prisma/data/countries.json", import.meta.url),
    "utf8",
  ),
).map((country: Country) => ({ ...country, id: `fixture-${country.iso2}` }));
export function communityFixture(year: number): CommunityStatistics {
  const country = (iso3: string): Country => {
    const result = communityCountries.find((item) => item.iso3 === iso3);
    if (!result) throw new Error(`Missing test country ${iso3}`);
    return result;
  };
  return {
    year,
    asOfDate: "2026-09-11",
    countries: communityCountries.map((item) => ({
      country: item,
      travelers:
        item.iso3 === "JPN"
          ? year === 2025
            ? 7
            : 14
          : item.iso3 === "FRA"
            ? 999
            : 0,
      travelersNow: item.iso3 === "JPN" ? 2 : 0,
      trending: item.iso3 === "JPN" && year !== 2025,
      topOrigins:
        item.iso3 === "JPN" && year !== 2025
          ? [
              { country: country("FRA"), travelers: 6 },
              { country: country("CAN"), travelers: 3 },
              { country: country("BEL"), travelers: 2 },
              { country: country("ESP"), travelers: 1 },
            ]
          : [],
    })),
  };
}
