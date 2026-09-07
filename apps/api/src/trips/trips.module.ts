import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import {
  CurrentUserModule,
  CurrentUserService,
} from '../current-user/current-user.module.js';
import { CreateTripPipe } from './create-trip.pipe.js';
import type { CreateTripInput } from './create-trip.pipe.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Post()
  async create(@Body(CreateTripPipe) input: CreateTripInput) {
    return this.trips.create(await this.currentUser.getUserId(), input);
  }
}

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

@Module({
  imports: [CurrentUserModule],
  controllers: [TripsController, VisitedCountriesController],
  providers: [TripsService],
})
export class TripsModule {}
