import { Controller, Get } from '@nestjs/common';
import { CurrentUserService } from '../current-user/current-user.service.js';
import { TripsService } from './trips.service.js';

@Controller('me')
export class VisitedCountriesController {
  constructor(
    private readonly trips: TripsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Get('visited-countries')
  async list() {
    return this.trips.visitedCountries(await this.currentUser.getUserId());
  }
}
