import type { CountryResponseDto } from '../../dto/trip-response.dto.js';

export interface ProgressionResponseDto {
  summary: {
    visitedCountries: number;
    totalCountries: number;
    worldCompletionPercentage: number;
    exploredContinents: number;
    revisitedCountries: number;
    totalRevisits: number;
    totalTravelDays: number;
  };
  continents: Array<{
    continentCode: string;
    visitedCountries: number;
    totalCountries: number;
    completionPercentage: number;
  }>;
  revisits: Array<{
    country: CountryResponseDto;
    tripCount: number;
  }>;
  timeline: {
    countries: Array<{ year: number; visitedCountries: number }>;
    travelDays: Array<{ year: number; travelDays: number }>;
    yearlyVisits: Array<{
      year: number;
      newCountries: number;
      revisits: number;
    }>;
  };
}
