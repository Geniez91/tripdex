import type { ICountryResponseDto } from '../../countries/dto/country-response.dto.js';

export type TCommunityCountryDto = Pick<
  ICountryResponseDto,
  'id' | 'iso2' | 'iso3' | 'name'
>;

export interface ICommunityOriginDto {
  country: TCommunityCountryDto;
  travelers: number;
}

export interface ICommunityCountryStatisticsDto {
  country: TCommunityCountryDto;
  travelers: number;
  travelersNow: number;
  trending: boolean;
  topOrigins: ICommunityOriginDto[];
}

export interface ICommunityStatisticsResponseDto {
  year: number;
  asOfDate: string;
  countries: ICommunityCountryStatisticsDto[];
}
