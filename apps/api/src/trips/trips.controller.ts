import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUserService } from '../current-user/current-user.service.js';
import { CreateTripPipe } from './create-trip.pipe.js';
import type { CreateTripDto } from './dto/create-trip.dto.js';
import type { TripResponseDto } from './dto/trip-response.dto.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(CreateTripPipe) input: CreateTripDto,
  ): Promise<TripResponseDto> {
    return this.trips.create(await this.currentUser.getUserId(), input);
  }
}
