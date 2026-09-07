import { Controller, Get, Query } from '@nestjs/common';
import { CitiesService } from './cities.service.js';

@Controller('cities')
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get()
  list(@Query('countryId') countryId?: string, @Query('q') query?: string) {
    return this.cities.list(countryId, query);
  }
}
