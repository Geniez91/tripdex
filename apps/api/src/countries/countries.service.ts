import { Inject, Injectable } from '@nestjs/common';
import type { ICountryResponseDto } from './dto/country-response.dto.js';
import { CountryMapper } from './mappers/country.mapper.js';
import {
  COUNTRY_REPOSITORY,
  type ICountryRepositoryPort,
} from './types/country-repository.port.js';

@Injectable()
export class CountriesService {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: ICountryRepositoryPort,
  ) {}

  async list(): Promise<ICountryResponseDto[]> {
    const countries = await this.countries.findAll();
    return countries.map((country) => CountryMapper.toResponse(country));
  }
}
