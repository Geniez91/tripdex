import type { CityResponseDto } from '../dto/city-response.dto.js';
import type { CityRecord } from '../types/city-record.js';

export class CityMapper {
  static toResponse(city: CityRecord): CityResponseDto {
    return {
      id: city.id,
      countryId: city.countryId,
      name: city.name,
      slug: city.slug,
      latitude: city.latitude,
      longitude: city.longitude,
    };
  }
}
