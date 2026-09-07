import { Controller, Get } from '@nestjs/common';
import { CountriesService } from './countries.service.js';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get()
  list() {
    return this.countries.list();
  }
}
