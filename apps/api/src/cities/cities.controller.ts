import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import type { CityListQueryDto } from './dto/city-list-query.dto.js';
import type { CityResponseDto } from './dto/city-response.dto.js';
import { CitiesService } from './cities.service.js';

@Controller('cities')
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query() query: CityListQueryDto): Promise<CityResponseDto[]> {
    return this.cities.list(query.countryId, query.q);
  }
}
