import type { Country } from "~/types/tripdex";

export interface CommunityCountryStatistics {
  country: Pick<Country, "id" | "iso2" | "iso3" | "name">;
  travelers: number;
  travelersNow: number;
  trending: boolean;
  topOrigins: {
    country: Pick<Country, "id" | "iso2" | "iso3" | "name">;
    travelers: number;
  }[];
}

export interface CommunityStatistics {
  year: number;
  asOfDate: string;
  countries: CommunityCountryStatistics[];
}

export interface ResidenceResponse {
  residenceCountry: Country | null;
}
