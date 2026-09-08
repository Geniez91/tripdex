import type { CountryResponseDto } from '../dto/country-response.dto.js';
import type { CountryRecord } from '../types/country-record.js';

export class CountryMapper {
  static toResponse(country: CountryRecord): CountryResponseDto {
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
