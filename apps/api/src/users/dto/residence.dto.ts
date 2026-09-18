import type { ICountryResponseDto } from '../../countries/dto/country-response.dto.js';

export interface IUpdateResidenceDto {
  residenceCountryId: string | null;
}

export interface IResidenceResponseDto {
  residenceCountry: ICountryResponseDto | null;
}
