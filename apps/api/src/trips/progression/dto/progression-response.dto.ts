import type { ICountryResponseDto } from '../../dto/trip-response.dto.js';

export interface IProgressionSummaryDto {
  visitedCountries: number;
  totalCountries: number;
  worldCompletionPercentage: number;
  exploredContinents: number;
  revisitedCountries: number;
  totalRevisits: number;
  totalTravelDays: number;
}

export interface IProgressionContinentDto {
  continentCode: string;
  visitedCountries: number;
  totalCountries: number;
  completionPercentage: number;
}

export interface IProgressionRevisitDto {
  country: ICountryResponseDto;
  tripCount: number;
}

export interface IProgressionYearlyCountriesDto {
  year: number;
  visitedCountries: number;
}

export interface IProgressionYearlyTravelDaysDto {
  year: number;
  travelDays: number;
}

export interface IProgressionYearlyVisitsDto {
  year: number;
  newCountries: number;
  revisits: number;
}

export interface IProgressionTimelineDto {
  countries: IProgressionYearlyCountriesDto[];
  travelDays: IProgressionYearlyTravelDaysDto[];
  yearlyVisits: IProgressionYearlyVisitsDto[];
}

export interface IProgressionResponseDto {
  summary: IProgressionSummaryDto;
  continents: IProgressionContinentDto[];
  revisits: IProgressionRevisitDto[];
  timeline: IProgressionTimelineDto;
}
