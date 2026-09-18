import type { ICityResponseDto } from '../dto/city-response.dto.js';
import type { ICityRecord } from '../types/city-record.js';

export class CityMapper {
  static toResponse(city: ICityRecord): ICityResponseDto {
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
