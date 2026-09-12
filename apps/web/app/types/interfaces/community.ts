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

export interface CommunityActivity {
  type: "TRIP_LOGGED";
  activityDate: string;
  user: { username: string; avatarUrl: string | null };
  trip: {
    id: string;
    title: string;
    countries: Pick<Country, "id" | "iso2" | "iso3" | "name">[];
    cities: { id: string; name: string }[];
    startDate: string;
    endDate: string | null;
    durationDays: number | null;
    rating: number | null;
    review: string | null;
    coverUrl: string | null;
  };
}

export interface CommunityActivityResponse {
  activities: CommunityActivity[];
  nextCursor: string | null;
}
