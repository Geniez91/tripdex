import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TripDexUser } from '../users/types/tripdex-user.js';
import { CreateTripPipe } from './create-trip.pipe.js';
import type { CreateTripDto } from './dto/create-trip.dto.js';
import type { TripResponseDto } from './dto/trip-response.dto.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
@UseGuards(AuthGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(CreateTripPipe) input: CreateTripDto,
    @CurrentUser() user: TripDexUser,
  ): Promise<TripResponseDto> {
    return this.trips.create(user.id, input);
  }
}
