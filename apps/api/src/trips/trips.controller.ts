import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUserService } from '../current-user/current-user.service.js';
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
