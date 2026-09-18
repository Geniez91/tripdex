import type {
  ICityResponseDto,
  ICountryResponseDto,
  ITripResponseDto,
} from '../dto/trip-response.dto.js';
import type { ICityRecord, ICountryRecord } from '../types/trip-records.js';
import type { ITripResponseParts } from '../types/trip-response-parts.js';

export class TripMapper {
  static toCountryDto(country: ICountryRecord): ICountryResponseDto {
    return {
      id: country.id,
      iso2: country.iso2,
      iso3: country.iso3,
      name: country.name,
      slug: country.slug,
      continentCode: country.continentCode,
    };
  }

  static toCityDto(city: ICityRecord): ICityResponseDto {
    return {
      id: city.id,
      countryId: city.countryId,
      name: city.name,
      slug: city.slug,
      latitude: city.latitude,
      longitude: city.longitude,
    };
  }

  static toResponse(parts: ITripResponseParts): ITripResponseDto {
    const response: ITripResponseDto = {
      id: parts.trip.id,
      title: parts.trip.title,
      startDate: parts.trip.startDate,
      endDate: parts.trip.endDate,
      rating: parts.trip.rating,
      review: parts.trip.review,
      coverStoragePath: parts.trip.coverStoragePath,
      coverUrl: parts.coverUrl,
      visibility: parts.trip.visibility,
      countries: parts.countries.map((country) => this.toCountryDto(country)),
      isRevisit: parts.isRevisit,
      revisitedCountryIds: parts.revisitedCountryIds,
    };
    if (parts.cities) {
      response.cities = parts.cities.map((city) => this.toCityDto(city));
    }
    return response;
  }
}
