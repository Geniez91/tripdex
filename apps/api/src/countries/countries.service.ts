import { Inject, Injectable } from '@nestjs/common';
import type { CountryResponseDto } from './dto/country-response.dto.js';
import { CountryMapper } from './mappers/country.mapper.js';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from './types/country-repository.port.js';

@Injectable()
export class CountriesService {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  async list(): Promise<CountryResponseDto[]> {
    const countries = await this.countries.findAll();
    return countries.map((country) => CountryMapper.toResponse(country));
  }
}
