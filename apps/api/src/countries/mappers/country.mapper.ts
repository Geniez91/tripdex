import type { ICountryResponseDto } from '../dto/country-response.dto.js';
import type { ICountryRecord } from '../types/country-record.js';

export class CountryMapper {
  static toResponse(country: ICountryRecord): ICountryResponseDto {
    return {
      id: country.id,
      iso2: country.iso2,
      iso3: country.iso3,
      name: country.name,
      slug: country.slug,
      continentCode: country.continentCode,
    };
  }
}
