import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUserService } from '../current-user/current-user.service.js';
import type { CountryResponseDto } from './dto/trip-response.dto.js';
import { TripsService } from './trips.service.js';

@Controller('me')
export class VisitedCountriesController {
  constructor(
    private readonly trips: TripsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Get('visited-countries')
  @HttpCode(HttpStatus.OK)
  async list(): Promise<CountryResponseDto[]> {
    return this.trips.visitedCountries(await this.currentUser.getUserId());
  }
}
