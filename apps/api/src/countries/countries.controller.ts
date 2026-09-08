import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import type { CountryResponseDto } from './dto/country-response.dto.js';
import { CountriesService } from './countries.service.js';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(): Promise<CountryResponseDto[]> {
    return this.countries.list();
  }
}
