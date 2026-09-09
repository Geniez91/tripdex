import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TripDexUser } from '../users/types/tripdex-user.js';
import type { CountryResponseDto } from './dto/trip-response.dto.js';
import { TripsService } from './trips.service.js';

@Controller('me')
@UseGuards(AuthGuard)
export class VisitedCountriesController {
  constructor(private readonly trips: TripsService) {}

  @Get('visited-countries')
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() user: TripDexUser): Promise<CountryResponseDto[]> {
    return this.trips.visitedCountries(user.id);
  }
}
