import { Inject, Injectable } from '@nestjs/common';
import type { CityResponseDto } from './dto/city-response.dto.js';
import { CityMapper } from './mappers/city.mapper.js';
import {
  CITY_REPOSITORY,
  type CityRepositoryPort,
} from './types/city-repository.port.js';

@Injectable()
export class CitiesService {
  constructor(
    @Inject(CITY_REPOSITORY) private readonly cities: CityRepositoryPort,
  ) {}

  async list(countryId?: string, query?: string): Promise<CityResponseDto[]> {
    const normalizedQuery = query?.trim();
    const cities = await this.cities.findAll(countryId, normalizedQuery);
    return cities.map((city) => CityMapper.toResponse(city));
  }
}
