import type { CountryResponseDto } from '../../countries/dto/country-response.dto.js';

export type CommunityCountryDto = Pick<
  CountryResponseDto,
  'id' | 'iso2' | 'iso3' | 'name'
>;

export interface CommunityOriginDto {
  country: CommunityCountryDto;
  travelers: number;
}

export interface CommunityCountryStatisticsDto {
  country: CommunityCountryDto;
  travelers: number;
  travelersNow: number;
  trending: boolean;
  topOrigins: CommunityOriginDto[];
}

export interface CommunityStatisticsResponseDto {
  year: number;
  asOfDate: string;
  countries: CommunityCountryStatisticsDto[];
}
