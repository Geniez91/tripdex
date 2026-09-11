import type { CountryResponseDto } from '../../countries/dto/country-response.dto.js';

export interface UpdateResidenceDto {
  residenceCountryId: string | null;
}

export interface ResidenceResponseDto {
  residenceCountry: CountryResponseDto | null;
}
