import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import type { ICountryResponseDto } from './dto/country-response.dto.js';
import { CountriesService } from './countries.service.js';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(): Promise<ICountryResponseDto[]> {
    return this.countries.list();
  }
}
