import { Inject, Injectable } from '@nestjs/common';
import type { ICityResponseDto } from './dto/city-response.dto.js';
import { CityMapper } from './mappers/city.mapper.js';
import {
  CITY_REPOSITORY,
  type ICityRepositoryPort,
} from './types/city-repository.port.js';

@Injectable()
export class CitiesService {
  constructor(
    @Inject(CITY_REPOSITORY) private readonly cities: ICityRepositoryPort,
  ) {}

  async list(countryId?: string, query?: string): Promise<ICityResponseDto[]> {
    const normalizedQuery = query?.trim();
    const cities = await this.cities.findAll(countryId, normalizedQuery);
    return cities.map((city) => CityMapper.toResponse(city));
  }
}
